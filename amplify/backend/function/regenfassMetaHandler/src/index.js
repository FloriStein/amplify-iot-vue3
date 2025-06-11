const mysql = require('mysql2/promise');
const {
    SecretsManagerClient,
    GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'eu-central-1' });
const DB_SECRET_NAME = process.env.DB_SECRET_NAME;
const debug = process.env.DEBUG === 'true';

let pool;

// 🔐 Secret abrufen
async function getDbCredentials(secretName) {
    log('🔑 Lese DB-Credentials von Secrets Manager:', secretName);
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsClient.send(command);
    const parsed = JSON.parse(response.SecretString);
    log('✅ Secrets geladen:', parsed);
    return parsed;
}

// Pool erstellen oder zwischenspeichern
async function getPool() {
    if (pool) return pool;

    const creds = await getDbCredentials(DB_SECRET_NAME);

    log('🔗 Erstelle MySQL-Pool mit host:', creds.host || "metadatabase.cdags0e2a8yc.eu-central-1.rds.amazonaws.com");

    pool = mysql.createPool({
        host: "metadatabase.cdags0e2a8yc.eu-central-1.rds.amazonaws.com",
        user: creds.username,
        password: creds.password,
        database: "rainbarrel",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    return pool;
}

// Debug-Logging
function log(...args) {
    if (debug) console.log(...args);
}

// Lambda-Handler
exports.handler = async (event) => {
    log('📥 Eingehende Anfrage:', {
        method: event.httpMethod,
        path: event.path,
        params: event.pathParameters,
        body: event.body
    });

    const claims = event.requestContext?.authorizer?.claims || {};
    const groups = claims['cognito:groups'] || [];
    const isAdmin = Array.isArray(groups)
        ? groups.includes('Admin')
        : groups === 'Admin';

    if (!isAdmin) {
        log('⛔ Zugriff verweigert: Kein Admin');
        return respond(403, { error: 'Nur Admins erlaubt' });
    }

    const { httpMethod, pathParameters, body } = event;
    const fassId = pathParameters?.fassId;

    try {
        const pool = await getPool();
        const connection = await pool.getConnection();

        log('Verbunden mit der Datenbank');

        if (method === 'GET') {
            const { resource, loadDropdowns } = event.queryStringParameters || {};

            // Wenn Dropdown-Daten geladen werden sollen
            if (loadDropdowns === 'true') {
                // Hole alle Vessels
                const [vessels] = await conn.execute('SELECT id, name FROM Vessel ORDER BY name');
                // Alle Measuring stations
                const [stations] = await conn.execute('SELECT id, name FROM Measuring_station ORDER BY name');
                // Alle Sensors
                const [sensors] = await conn.execute('SELECT id, name FROM Sensor ORDER BY name');

                return respond(200, {
                    vessels,
                    stations,
                    sensors
                });
            }

            // Alte Logik für resource-basierte Daten
            const table = TABLES[resource];
            if (!table) return respond(400, { error: "Ungültige resource" });

            const filters = event.queryStringParameters || {};
            delete filters.resource;
            delete filters.loadDropdowns;

            const whereClause = Object.keys(filters).map(key => `${key} = ?`).join(' AND ');
            const values = Object.values(filters);

            const [rows] = await conn.execute(
                `SELECT * FROM ${table} ${whereClause ? 'WHERE ' + whereClause : ''}`,
                values
            );
            return respond(200, { data: rows });
        }


        if (httpMethod === 'POST' && body) {
            const data = JSON.parse(body);
            log('📤 POST Body:', data);

            if (!data.fass_id) {
                log('⚠️ Kein fass_id im POST-Body');
                return respond(400, { error: 'fass_id fehlt im POST-Body' });
            }

            const columns = Object.keys(data).map((col) => `\`${col}\``).join(', ');
            const values = Object.values(data);
            const placeholders = values.map(() => '?').join(', ');
            const query = `INSERT INTO regenfass_meta (${columns}) VALUES (${placeholders})`;

            log('🔧 INSERT Query:', query, values);

            await connection.query(query, values);
            connection.release();
            log('✅ Eintrag hinzugefügt');
            return respond(201, { message: 'Eintrag hinzugefügt' });
        }

        if (httpMethod === 'PUT' && fassId && body) {
            const data = JSON.parse(body);
            log('🛠️ PUT für fassId:', fassId, 'mit Daten:', data);

            const updates = Object.keys(data).map((key) => `\`${key}\` = ?`).join(', ');
            const values = Object.values(data);
            values.push(fassId); // WHERE Bedingung
            const query = `UPDATE regenfass_meta SET ${updates} WHERE fass_id = ?`;

            log('🔧 UPDATE Query:', query, values);

            const [result] = await connection.query(query, values);
            connection.release();
            log('✅ Update-Ergebnis:', result);
            return respond(200, { message: 'Eintrag aktualisiert', affectedRows: result.affectedRows });
        }

        if (httpMethod === 'DELETE' && fassId) {
            const query = 'DELETE FROM regenfass_meta WHERE fass_id = ?';
            log('🗑️ DELETE Query:', query, [fassId]);
            const [result] = await connection.query(query, [fassId]);
            connection.release();
            log('✅ Eintrag gelöscht:', result);
            return respond(200, { message: 'Eintrag gelöscht', affectedRows: result.affectedRows });
        }

        connection.release();
        log('⚠️ Ungültige Methode:', httpMethod);
        return respond(405, { error: 'Ungültige Methode oder Route' });

    } catch (err) {
        console.error('❌ Fehler:', err);
        return respond(500, { error: 'Interner Serverfehler', details: err.message });
    }
};

// Antwort-Helfer
function respond(code, body) {
    log('↩️ Antwort:', code, body);
    return {
        statusCode: code,
        body: JSON.stringify(body),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS'
        },
    };
}
