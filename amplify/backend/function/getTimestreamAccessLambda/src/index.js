const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({ region: "eu-central-1" });
const bucketName = 's3sensordatabucket41ff7-dev';
const prefix = 'iot-data/';

exports.handler = async (event) => {
    try {
        // Holt ALLE Objekte (nicht limitiert auf 20!)
        const listParams = {
            Bucket: bucketName,
            Prefix: prefix,
        };

        const listedObjects = await client.send(new ListObjectsV2Command(listParams));

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ data: [] }),
                headers: corsHeaders()
            };
        }

        // 1. Nach LastModified absteigend sortieren (neueste oben)
        const sortedObjects = listedObjects.Contents.sort((a, b) => b.LastModified - a.LastModified);

        // 2. Nur die 20 neuesten Dateien auswählen
        const latestObjects = sortedObjects.slice(0, 20);

        const results = [];

        // 3. Diese 20 Dateien auslesen
        for (const obj of latestObjects) {
            const getParams = {
                Bucket: bucketName,
                Key: obj.Key
            };
            const fileData = await client.send(new GetObjectCommand(getParams));
            const streamToString = (stream) =>
                new Promise((resolve, reject) => {
                    const chunks = [];
                    stream.on("data", (chunk) => chunks.push(chunk));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
                });
            const jsonString = await streamToString(fileData.Body);
            const json = JSON.parse(jsonString);
            results.push(json);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ data: results }),
            headers: corsHeaders()
        };
    } catch (error) {
        console.error('❌ Fehler beim Abrufen aus S3:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Fehler beim Lesen aus S3' }),
            headers: corsHeaders()
        };
    }
};

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "http://localhost:5173",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",

    };
}
