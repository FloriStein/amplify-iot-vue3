const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({ region: "eu-central-1" });
const bucketName = 's3sensordatabucket41ff7-dev';
const prefix = 'iot-data/';

exports.handler = async (event) => {
    console.log("📥 Event erhalten:", JSON.stringify(event));

    try {
        let collected = [];
        let continuationToken = undefined;
        const maxToCollect = 20;

        // Paginierte Abfrage bis 20 Dateien eingesammelt sind
        while (collected.length < maxToCollect) {
            const response = await client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: 100,
                ContinuationToken: continuationToken
            }));

            const objects = response.Contents || [];
            collected = collected.concat(objects);

            if (!response.IsTruncated) break; // keine weiteren Seiten
            continuationToken = response.NextContinuationToken;
        }

        if (collected.length === 0) {
            console.log("⚠️ Keine Objekte unter dem angegebenen Prefix gefunden.");
            return respond(200, { data: [] });
        }

        // Nach Dateinamen (Unix-Zeitstempel) sortieren – absteigend
        const sortedObjects = collected.sort((a, b) => {
            const timeA = Number(a.Key.replace(prefix, '').split('.')[0]);
            const timeB = Number(b.Key.replace(prefix, '').split('.')[0]);
            return timeB - timeA;
        });

        const latestObjects = sortedObjects.slice(0, maxToCollect);

        // Inhalte parallel abrufen
        const results = await Promise.all(
            latestObjects.map(async (obj) => {
                const fileData = await client.send(new GetObjectCommand({
                    Bucket: bucketName,
                    Key: obj.Key
                }));

                const streamToString = (stream) =>
                    new Promise((resolve, reject) => {
                        const chunks = [];
                        stream.on("data", (chunk) => chunks.push(chunk));
                        stream.on("error", reject);
                        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
                    });

                const jsonString = await streamToString(fileData.Body);
                return JSON.parse(jsonString);
            })
        );

        return respond(200, { data: results });

    } catch (error) {
        console.error('❌ Fehler beim Abrufen aus S3:', error);
        return respond(500, { error: 'Fehler beim Lesen aus S3' });
    }
};

function respond(statusCode, body) {
    return {
        statusCode,
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Credentials": "true"
        }
    };
}
