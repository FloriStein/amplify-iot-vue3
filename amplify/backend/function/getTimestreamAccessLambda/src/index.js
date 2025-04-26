const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: "eu-central-1" });

const bucketName = 's3sensordatabucket41ff7-dev';
const prefix = 'iot-data/';

exports.handler = async (event) => {
    try {
        const listParams = {
            Bucket: bucketName,
            Prefix: prefix,
            MaxKeys: 10,
        };

        const listedObjects = await s3.send(new ListObjectsV2Command(listParams));
        const sortedObjects = listedObjects.Contents.sort((a, b) => b.LastModified - a.LastModified);

        const results = [];

        for (const obj of sortedObjects) {
            const getParams = {
                Bucket: bucketName,
                Key: obj.Key,
            };
            const fileData = await s3.send(new GetObjectCommand(getParams));
            const streamToString = (stream) =>
                new Promise((resolve, reject) => {
                    const chunks = [];
                    stream.on("data", (chunk) => chunks.push(chunk));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
                });
            const bodyString = await streamToString(fileData.Body);
            const json = JSON.parse(bodyString);

            results.push({
                timestamp: json.timestamp ?? obj.LastModified, // falls kein timestamp im Objekt
                distance: json.distance ?? null,
                connected: json.connected ?? false,
                lastSeen: json.lastSeen ?? obj.LastModified
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                data: results
            }),
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            }
        };
    } catch (error) {
        console.error('❌ Fehler beim Abrufen aus S3:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Fehler beim Lesen aus S3' }),
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            }
        };
    }
};
