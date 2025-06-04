const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const s3 = new S3Client();
const ddbClient = new DynamoDBClient();
const ddb = DynamoDBDocumentClient.from(ddbClient);

const BUCKET_NAME = process.env.BUCKET_NAME;
const DYNAMO_TABLE = process.env.DYNAMO_TABLE;

exports.handler = async (event) => {
    console.info("📥 Event erhalten:", JSON.stringify(event, null, 2));

    const thingName = event.thingName;
    const reported = event.reported;
    const timestamp = event.ts;

    if (!thingName || !reported || !Array.isArray(reported.readings)) {
        console.error("❌ Ungültiger Payload: fehlende thingName, readings oder timestamp.");
        return;
    }

    // 1. S3: Einzelne Dateien je Sensorwert speichern
    for (const reading of reported.readings) {
        const type = reading.type;
        const value = reading.value;

        if (!type || value === undefined) {
            console.warn("Unbekanntes Format im reading:", reading);
            continue;
        }

        const fileName = `${thingName}_${type}_${timestamp}.json`;
        const s3Item = {
            "node-id": thingName,
            "sensor-id": type,
            timestamp,
            value,
        };

        try {
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `iot-data/${fileName}`,
                Body: JSON.stringify(s3Item),
                ContentType: "application/json",
            }));
            console.info(`📤 S3-Datei gespeichert: ${fileName}`);
        } catch (err) {
            console.error(`❌ Fehler beim Schreiben in S3 (${fileName}):`, err);
        }
    }

    // 2. DynamoDB: Alle Sensorwerte in einem Item speichern (Map readings)
    const readingsMap = {};
    for (const reading of reported.readings) {
        if (reading.type && reading.value !== undefined) {
            readingsMap[reading.type] = reading.value;
        }
    }

    const ddbItem = {
        "node-id": thingName,
        timestamp,
        readings: readingsMap,
    };

    try {
        await ddb.send(new PutCommand({
            TableName: DYNAMO_TABLE,
            Item: ddbItem,
        }));
        console.info(`📥 DynamoDB-Eintrag gespeichert für ${thingName} @ ${timestamp}`);

        // 3. Bereinigen: max 22 Einträge pro node-id behalten (Beispiel)
        const maxEntries = 22;

        const result = await ddb.send(new QueryCommand({
            TableName: DYNAMO_TABLE,
            KeyConditionExpression: '#nid = :nid',
            ExpressionAttributeNames: {
                '#nid': 'node-id',
                '#ts': 'timestamp',
            },
            ExpressionAttributeValues: {
                ':nid': thingName,
            },
            ProjectionExpression: '#ts',
            ScanIndexForward: false,  // Neueste zuerst
        }));

        const items = result.Items || [];

// Wenn mehr als maxEntries existieren, lösche den ältesten Eintrag
        if (items.length > maxEntries) {
            // Der älteste Eintrag ist das letzte Element (da absteigend sortiert)
            const oldestItem = items[items.length - 1];

            await ddb.send(new DeleteCommand({
                TableName: DYNAMO_TABLE,
                Key: {
                    'node-id': thingName,
                    'timestamp': oldestItem.timestamp,
                },
            }));

            console.info(`🗑️ Alter Eintrag gelöscht: ${thingName} @ ${oldestItem.timestamp}`);
        }


    } catch (err) {
        console.error("❌ Fehler beim Schreiben oder Bereinigen in DynamoDB:", err);
    }

    console.info("✅ Verarbeitung abgeschlossen.");
};
