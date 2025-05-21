const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({ region: "eu-central-1" });
const bucketName = 's3sensordatabucket41ff7-dev';

exports.handler = async (event) => {
    console.log("📥 Event erhalten:", JSON.stringify(event));

    const thingName = event.pathParameters?.thing;
    console.log("🔍 Extrahierter thingName:", thingName);

    if (!thingName) {
        console.error("❌ 'thing' Pfadparameter fehlt.");
        return respond(400, { error: "'thing' Pfadparameter fehlt." });
    }

    const prefix = `iot-data/${thingName}/`;
    console.log("📁 S3 Prefix:", prefix);

    try {
        let allObjects = [];
        let continuationToken = undefined;
        let iteration = 0;

        // 🔁 Alle Objekte iterativ laden (pagination)
        do {
            console.log(`📄 Lade S3-Objekte... Iteration: ${++iteration}, ContinuationToken: ${continuationToken}`);
            const response = await client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                MaxKeys: 1000,
                ContinuationToken: continuationToken
            }));

            const objects = response.Contents || [];
            console.log(`📦 Gefundene Objekte in dieser Iteration: ${objects.length}`);
            allObjects = allObjects.concat(objects);
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);

        console.log(`📊 Insgesamt gefundene Objekte: ${allObjects.length}`);

        if (allObjects.length === 0) {
            console.log("⚠️ Keine Objekte unter diesem Prefix gefunden.");
            return respond(200, { data: [] });
        }

        // 🔢 Sortieren nach Timestamp im Dateinamen
        const sortedObjects = allObjects.sort((a, b) => {
            const tA = Number(a.Key.replace(prefix, '').split('.')[0]);
            const tB = Number(b.Key.replace(prefix, '').split('.')[0]);
            return tB - tA;
        });

        const latestObjects = sortedObjects.slice(0, 20);
        console.log("🧩 Anzahl der zu ladenden neuesten Objekte:", latestObjects.length);

        // ⬇️ Dateien parallel lesen und parsen
        const results = await Promise.all(
            latestObjects.map(async (obj, index) => {
                console.log(`📥 [${index + 1}/${latestObjects.length}] Lade Datei: ${obj.Key}`);
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
                console.log(`✅ [${index + 1}] Datei gelesen, Größe: ${jsonString.length} Zeichen`);
                return JSON.parse(jsonString);
            })
        );

        console.log("✅ Alle Dateien erfolgreich gelesen und geparst.");
        return respond(200, { data: results });

    } catch (error) {
        console.error('❌ Fehler beim Abrufen aus S3:', error);
        return respond(500, { error: 'Fehler beim Lesen aus S3' });
    }
};

function respond(statusCode, body) {
    console.log(`📤 Antwort mit Status ${statusCode}:`, body);
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
