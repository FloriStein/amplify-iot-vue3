const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({ region: "eu-central-1" });
const bucketName = 's3sensordatabucket41ff7-dev';
const prefix = 'iot-data/fass1/';

exports.handler = async (event) => {
    console.log("📥 Event erhalten:", JSON.stringify(event));

    try {
        let allObjects = [];
        let continuationToken = undefined;

        // 🔁 Alle Objekte iterativ laden (pagination)
        do {
            const response = await client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: 50,
                ContinuationToken: continuationToken
            }));

            const objects = response.Contents || [];
            allObjects = allObjects.concat(objects);
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);

        if (allObjects.length === 0) {
            console.log("⚠️ Keine Objekte gefunden.");
            return respond(200, { data: [] });
        }

        // 🔢 Nach UNIX-Timestamp im Dateinamen sortieren
        const sortedObjects = allObjects.sort((a, b) => {
            const tA = Number(a.Key.replace(prefix, '').split('.')[0]);
            const tB = Number(b.Key.replace(prefix, '').split('.')[0]);
            return tB - tA;
        });

        const latestObjects = sortedObjects.slice(0, 20);

        // ⬇️ Dateien parallel lesen und parsen
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
