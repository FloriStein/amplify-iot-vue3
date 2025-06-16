const mysql = require('mysql2/promise');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

let pool;
const SECRET_ARN = process.env.SECRET_ARN;

exports.handler = async (event) => {
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };

    console.log("📩 Eingehendes Event:", JSON.stringify(event));

    if (event.httpMethod === 'OPTIONS') {
        console.log("🔧 CORS Preflight erkannt");
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight OK' })
        };
    }

    try {
        if (!pool) {
            console.log("🔑 Secrets werden geladen...");
            const client = new SecretsManagerClient({ region: "eu-central-1" });
            const secretData = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ARN }));
            const creds = JSON.parse(secretData.SecretString);
            console.log("🔐 Secrets erfolgreich geladen");

            pool = mysql.createPool({
                host: "metadatabase.cdags0e2a8yc.eu-central-1.rds.amazonaws.com",
                user: creds.username,
                password: creds.password,
                database: "rainbarrel",
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log("📡 Datenbankpool erstellt");
        }

        const queryParams = event.queryStringParameters || {};
        console.log("🔎 Query Parameter empfangen:", JSON.stringify(queryParams));

        let query = '';
        let values = [];

        if (queryParams.vessel_id) {
            console.log("🚢 Vessel ID erkannt:", queryParams.vessel_id);
            query = `
                SELECT * FROM Measuring_station
                WHERE Vessel_ID = ?
            `;
            values = [queryParams.vessel_id];

        } else if (queryParams.station_id) {
            console.log("📟 Station ID erkannt:", queryParams.station_id);
            query = `
                SELECT * FROM Sensor
                WHERE Measuring_station_ID = ?
            `;
            values = [queryParams.station_id];

        } else {
            console.log("📥 Keine Parameter -> lade alle Vessels (Dropdown)");
            query = `
                SELECT * FROM Vessel
            `;
        }

        console.log("📄 SQL Query wird ausgeführt:", query, "mit Werten:", values);
        const [rows] = await pool.query(query, values);
        console.log(`✅ Query erfolgreich, Anzahl Datensätze: ${rows.length}`);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ data: rows })
        };

    } catch (error) {
        console.error("❌ Fehler beim Verarbeiten der Anfrage:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Interner Fehler beim Datenbankzugriff" })
        };
    }
};
