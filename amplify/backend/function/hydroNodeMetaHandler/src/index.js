const mysql = require('mysql2/promise');
const {
    SecretsManagerClient,
    GetSecretValueCommand,
} = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'eu-central-1' });
const DB_SECRET_NAME = process.env.DB_SECRET_NAME;

const RESOURCE_META = {
    vessel: {
        table: 'Vessel',
        primaryKey: 'Vessel_ID',
    },
    station: {
        table: 'Measuring_station',
        primaryKey: 'Measuring_station_ID',
    },
    sensor: {
        table: 'Sensor',
        primaryKey: 'Sensor_ID',
    }
};

let pool;
async function getPool() {
    if (pool) return pool;

    console.log('🔐 Lade Datenbank-Zugangsdaten...');
    const cmd = new GetSecretValueCommand({ SecretId: DB_SECRET_NAME });
    const res = await secretsClient.send(cmd);
    const creds = JSON.parse(res.SecretString);

    pool = mysql.createPool({
        host: "metadatabase.cdags0e2a8yc.eu-central-1.rds.amazonaws.com",
        user: creds.username,
        password: creds.password,
        database: "rainbarrel",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    console.log('✅ Verbindungspool zur Datenbank erstellt.');
    return pool;
}

exports.handler = async (event) => {
    const { httpMethod, path, body, queryStringParameters } = event;
    const pathParts = path.split('/').filter(Boolean);

    const isDropdownRequest = pathParts.length === 2 &&
        pathParts[0] === 'admin' && pathParts[1] === 'meta' &&
        queryStringParameters?.loadDropdowns === 'true';

    const pool = await getPool();

    console.log(`📥 ${httpMethod} ${path}`);
    console.log('➡️ Query:', queryStringParameters || {});

    try {
        // ✳️ Neue Spalte hinzufügen: POST /admin/meta/:resource/:id/add-field
        if (httpMethod === 'POST' && pathParts[4] === 'add-field') {
            const resource = pathParts[2];
            const meta = RESOURCE_META[resource];
            if (!meta) return respond(400, { error: 'Ungültige Ressource' });

            const { fieldName, defaultValue } = JSON.parse(body);

            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
                return respond(400, { error: 'Ungültiger Feldname' });
            }

            // Datentyp schätzen
            let sqlType = 'TEXT';
            if (typeof defaultValue === 'boolean') sqlType = 'BOOLEAN';
            else if (!isNaN(defaultValue)) sqlType = 'FLOAT';

            const addSQL = `ALTER TABLE ${meta.table} ADD COLUMN ${fieldName} ${sqlType}`;
            const updateSQL = `UPDATE ${meta.table} SET ${fieldName} = ?`;

            await pool.execute(addSQL);
            await pool.execute(updateSQL, [defaultValue]);

            return respond(200, { message: `Spalte '${fieldName}' hinzugefügt.` });
        }


        // 📋 Dropdowns laden
        if (isDropdownRequest) {
            const [vessels] = await pool.execute('SELECT Vessel_ID, Vessel_location FROM Vessel ORDER BY Vessel_location');
            const [stations] = await pool.execute('SELECT Measuring_station_ID FROM Measuring_station ORDER BY Measuring_station_ID');
            const [sensors] = await pool.execute('SELECT Sensor_ID, Sensor_model FROM Sensor ORDER BY Sensor_model');
            return respond(200, { vessels, stations, sensors });
        }

        const resource = pathParts[2];
        const id = pathParts[3] || null;
        const meta = RESOURCE_META[resource];
        const table = meta?.table;
        const primaryKey = meta?.primaryKey;

        if (!table) return respond(400, { error: 'Ungültige Ressource' });

        if (httpMethod === 'GET') {
            const filters = { ...(queryStringParameters || {}) };
            if (id && primaryKey) filters[primaryKey] = id;

            const whereClause = Object.keys(filters).map(k => `${k} = ?`).join(' AND ');
            const values = Object.values(filters);
            const [rows] = await pool.execute(
                `SELECT * FROM ${table} ${whereClause ? 'WHERE ' + whereClause : ''}`,
                values
            );
            return respond(200, { data: rows });
        }

        if (httpMethod === 'POST' && body) {
            const data = JSON.parse(body);
            const cols = Object.keys(data);
            const vals = Object.values(data);
            const placeholders = cols.map(() => '?').join(',');

            const [result] = await pool.execute(
                `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`,
                vals
            );
            return respond(201, { message: 'Eintrag erstellt', id: result.insertId });
        }

        if (httpMethod === 'PUT' && id && body) {
            const data = JSON.parse(body);

            // Vorher: Tabelle analysieren, existierende Spalten holen
            const [columnsRes] = await pool.execute(`SHOW COLUMNS FROM ${table}`);
            const existingColumns = columnsRes.map(col => col.Field);

            // Neue Felder erkennen
            const newFields = Object.keys(data).filter(k => !existingColumns.includes(k));

            // Neue Felder als Spalten anlegen
            for (const field of newFields) {
                console.log(`➕ Füge neue Spalte '${field}' zur Tabelle '${table}' hinzu...`);
                // Default: VARCHAR(255) – je nach Bedarf kann man hier Typisierung verbessern
                await pool.execute(`ALTER TABLE ${table} ADD COLUMN \`${field}\` VARCHAR(255)`);
                console.log(`✅ Spalte '${field}' hinzugefügt.`);
            }

            // Jetzt reguläres Update durchführen
            const updates = Object.keys(data).map(k => `${k} = ?`).join(', ');
            const values = [...Object.values(data), id];

            console.log(`🛠️ Aktualisiere ${table} mit ${primaryKey} = ${id}:`, data);
            const [result] = await pool.execute(
                `UPDATE ${table} SET ${updates} WHERE ${primaryKey} = ?`,
                values
            );
            console.log('✅ Aktualisiert, betroffene Zeilen:', result.affectedRows);
            return respond(200, { message: 'Eintrag aktualisiert', affectedRows: result.affectedRows });
        }


        if (httpMethod === 'DELETE') {
            const fieldToDelete = queryStringParameters?.field;

            if (!table || !primaryKey) {
                return respond(400, { error: 'Ungültige Ressource' });
            }

            // 🔸 Spalte löschen
            if (fieldToDelete) {
                if (fieldToDelete === primaryKey) {
                    return respond(400, { error: 'Primärschlüssel kann nicht gelöscht werden' });
                }

                try {
                    console.log(`🧹 Lösche Spalte '${fieldToDelete}' aus Tabelle '${table}'...`);
                    await pool.execute(`ALTER TABLE \`${table}\` DROP COLUMN \`${fieldToDelete}\``);
                    console.log(`✅ Spalte '${fieldToDelete}' gelöscht.`);
                    return respond(200, { message: `Spalte '${fieldToDelete}' gelöscht.` });
                } catch (err) {
                    console.error(`❌ Fehler beim Löschen der Spalte '${fieldToDelete}':`, err);
                    return respond(500, {
                        error: 'Fehler beim Löschen der Spalte',
                        details: err.message
                    });
                }
            }

            // 🔸 Datensatz löschen
            if (id) {
                try {
                    console.log(`🗑️ Lösche Eintrag in ${table} mit ${primaryKey} = ${id}`);
                    const [result] = await pool.execute(
                        `DELETE FROM \`${table}\` WHERE \`${primaryKey}\` = ?`,
                        [id]
                    );
                    console.log('✅ Eintrag gelöscht. Betroffene Zeilen:', result.affectedRows);
                    return respond(200, { message: 'Eintrag gelöscht', affectedRows: result.affectedRows });
                } catch (err) {
                    console.error(`❌ Fehler beim Löschen des Eintrags:`, err);
                    return respond(500, {
                        error: 'Fehler beim Löschen des Eintrags',
                        details: err.message
                    });
                }
            }

            // 🔸 Weder Spalte noch Datensatz angegeben
            return respond(400, { error: 'Fehlende ID oder Feld zum Löschen' });
        }


        return respond(405, { error: 'Methode nicht erlaubt oder Pfad ungültig' });

    } catch (err) {
        console.error('❌ Fehler:', err);
        return respond(500, { error: 'Interner Serverfehler', details: err.message });
    }
};

function respond(code, body) {
    return {
        statusCode: code,
        body: JSON.stringify(body),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        }
    };
}
