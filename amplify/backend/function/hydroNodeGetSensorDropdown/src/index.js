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

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight OK' })
        };
    }

    try {
        if (!pool) {
            const client = new SecretsManagerClient({ region: "eu-central-1" });
            const secretData = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ARN }));
            const creds = JSON.parse(secretData.SecretString);

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

        const queryParams = event.queryStringParameters || {};
        let query = '';
        let values = [];

        if (queryParams.vessel_id) {
            // 📌 Alle Stationen zu einem Vessel
            query = `
                SELECT * FROM Measuring_station
                WHERE Vessel_ID = ?
            `;
            values = [queryParams.vessel_id];

        } else if (queryParams.station_id) {
            // 📌 Alle Sensoren zu einer Station
            query = `
                SELECT * FROM Sensor
                WHERE Measuring_station_ID = ?
            `;
            values = [queryParams.station_id];

        } else {
            // 📌 Alle Vessels
            query = `
                SELECT * FROM Vessel
            `;
        }

        const [rows] = await pool.query(query, values);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ data: rows })
        };

    } catch (error) {
        console.error("❌ Fehler:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Interner Fehler beim Datenbankzugriff" })
        };
    }
};
