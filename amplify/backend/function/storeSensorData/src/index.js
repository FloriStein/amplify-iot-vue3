const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const mysql = require("mysql2/promise");
const dns = require("dns").promises;
const https = require("https");

const REGION = process.env.REGION || "eu-central-1";
const s3 = new S3Client({ region: REGION });
const secretsManager = new SecretsManagerClient({ region: REGION });

const { BUCKET_NAME, DB_SECRET_NAME, DEBUG } = process.env;
const debug = DEBUG === "true";

function logIfDebug(...args) {
    if (debug) console.log(...args);
}

let pool;

// Test Secrets Manager Konnektivität
async function testSecretsManagerConnectivity() {
    logIfDebug("🌐 Starte Netzwerkverbindungstest zu Secrets Manager...");

    try {
        const resolved = await dns.lookup("secretsmanager.eu-central-1.amazonaws.com");
        logIfDebug("🌐 DNS-Auflösung erfolgreich:", resolved);
    } catch (dnsErr) {
        console.error("❌ DNS-Auflösung fehlgeschlagen:", dnsErr);
    }

    return new Promise((resolve) => {
        const req = https.get("https://secretsmanager.eu-central-1.amazonaws.com", (res) => {
            logIfDebug("🔌 HTTP-Antwortstatus von Secrets Manager:", res.statusCode);
            resolve();
        });

        req.on("error", (err) => {
            console.error("❌ Netzwerkfehler beim Test-Request:", err);
            resolve();
        });

        req.setTimeout(3000, () => {
            console.error("⏱️ Timeout beim Netzwerkverbindungstest");
            req.abort();
            resolve();
        });
    });
}

async function getDbCredentials(secretName) {
    if (debug) console.time("🔐 SecretsManager Abrufdauer");
    logIfDebug(`🔐 Versuche Secret abzurufen: ${secretName}`);

    const command = new GetSecretValueCommand({ SecretId: secretName });

    try {
        const response = await secretsManager.send(command);
        if (debug) console.timeEnd("🔐 SecretsManager Abrufdauer");
        logIfDebug("✅ Secret erfolgreich abgerufen");

        const parsed = JSON.parse(response.SecretString);
        logIfDebug("🔍 Inhalt des Secrets:", parsed);

        return parsed;
    } catch (error) {
        if (debug) console.timeEnd("🔐 SecretsManager Abrufdauer");
        console.error("❌ Fehler beim Abrufen oder Parsen des Secrets:");
        console.error("Fehlertyp:", error.name);
        console.error("Fehlermeldung:", error.message);
        console.error("Stacktrace:", error.stack);
        console.error("AWS SDK Metadata:", error.$metadata || "Keine Metadaten");
        throw error;
    }
}

exports.handler = async (event, context) => {
    logIfDebug("📥 Eingehendes Event:", JSON.stringify(event, null, 2));
    logIfDebug("🧭 Lambda-Region:", REGION);
    logIfDebug("📄 Request-ID:", context.awsRequestId);

    await testSecretsManagerConnectivity();

    let sensorData;
    try {
        sensorData = event.body ? JSON.parse(event.body) : event;
        logIfDebug("✅ Sensordaten geparst:", sensorData);
    } catch (err) {
        console.error("❌ Fehler beim Parsen der JSON-Daten:", err);
        return { statusCode: 400, body: "Ungültige JSON-Daten" };
    }

    const distance_mm = parseFloat(sensorData.distance);
    const fass_id = "fass1";

    if (isNaN(distance_mm)) {
        console.error("❌ distance_mm ist ungültig oder fehlt");
        return { statusCode: 400, body: "Ungültige oder fehlende distance_mm" };
    }

    let creds;
    try {
        logIfDebug("🔐 Lese DB-Zugangsdaten von Secrets Manager...");
        creds = await getDbCredentials(DB_SECRET_NAME);
        logIfDebug("✅ DB-Zugangsdaten geladen.");
    } catch (err) {
        console.error("❌ Fehler beim Laden des Secrets:", err);
        return { statusCode: 500, body: "Fehler beim SecretManager" };
    }

    if (!pool) {
        logIfDebug("🛠️ Erstelle neuen MySQL Connection Pool...");
        pool = mysql.createPool({
            host: "metadatabase.cdags0e2a8yc.eu-central-1.rds.amazonaws.com",
            user: creds.username,
            password: creds.password,
            database: "rainbarrel",
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    let connection;
    let max_hoehe_mm;
    try {
        logIfDebug("🛠️ Hole Verbindung aus dem Pool...");
        connection = await pool.getConnection();
        logIfDebug("🧪 Test: Nach getConnection()");
        logIfDebug("✅ Verbindung erhalten, hole max_hoehe_mm...");

        const [rows] = await connection.execute(
            "SELECT max_hoehe_mm FROM regenfass_meta WHERE fass_id = ?",
            [fass_id]
        );

        if (!rows.length || !rows[0].max_hoehe_mm) {
            console.warn(`⚠️ Kein Eintrag für Fass-ID "${fass_id}" gefunden`);
            return { statusCode: 404, body: "Fass-ID nicht gefunden" };
        }

        max_hoehe_mm = parseFloat(rows[0].max_hoehe_mm);
        if (isNaN(max_hoehe_mm) || max_hoehe_mm <= 0) {
            console.error("❌ Ungültige maximale Höhe in der Datenbank:", rows[0]);
            throw new Error("Ungültige max_hoehe_mm");
        }

        logIfDebug(`📏 max_hoehe_mm = ${max_hoehe_mm}`);
    } catch (err) {
        console.error("❌ Fehler beim Datenbankzugriff:", err);
        return { statusCode: 500, body: "Fehler beim Datenbankzugriff" };
    } finally {
        if (connection) {
            connection.release();
            logIfDebug("🔌 Verbindung zum Pool zurückgegeben.");
        }
    }

    const fill_percent = Math.round((distance_mm / max_hoehe_mm) * 100);
    const timestamp = new Date().toISOString();
    const result = {
        fass_id,
        distance_mm,
        max_hoehe_mm,
        fill_percent,
        timestamp
    };

    logIfDebug("📦 Zu speichernde Daten:", result);

    const key = `iot-data/${fass_id}/${Date.now()}.json`;

    try {
        logIfDebug("📤 Starte Upload in S3...");
        logIfDebug(`🪣 Bucket: ${BUCKET_NAME}`);
        logIfDebug(`🧾 Key: ${key}`);

        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(result),
            ContentType: "application/json"
        });

        const s3Response = await s3.send(putCommand);
        logIfDebug("✅ Erfolgreich in S3 gespeichert:", s3Response);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Upload erfolgreich!", result })
        };
    } catch (err) {
        console.error("❌ Fehler beim S3-Upload:");
        console.error("Fehlermeldung:", err.message);
        console.error("Stacktrace:", err.stack);
        return { statusCode: 500, body: "S3 Upload fehlgeschlagen" };
    }
};
