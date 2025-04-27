const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: "eu-central-1" });

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const bucketName = 's3sensordatabucket41ff7-dev';
    const key = `iot-data/${Date.now()}.json`;

    // Ursprüngliche Sensordaten aus dem Event extrahieren
    let sensorData;
    try {
        if (event.body) {
            sensorData = JSON.parse(event.body);
        } else {
            sensorData = event; // fallback
        }
    } catch (parseError) {
        console.error('❌ Fehler beim Parsen der Event-Daten:', parseError);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Ungültiges JSON im Event.' })
        };
    }

    // Aktuellen Zeitstempel hinzufügen
    const now = new Date().toISOString();
    const enrichedData = {
        ...sensorData,
        timestamp: now
    };

    const body = JSON.stringify(enrichedData);

    try {
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: 'application/json'
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Upload erfolgreich!' })
        };
    } catch (error) {
        console.error('❌ Fehler beim S3 Upload:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Fehler beim Speichern in S3' })
        };
    }
};
