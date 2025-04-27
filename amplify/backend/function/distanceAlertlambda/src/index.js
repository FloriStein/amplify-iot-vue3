const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const s3 = new S3Client({ region: "eu-central-1" });
const sns = new SNSClient({ region: "eu-central-1" });

const snsTopicArn = "arn:aws:sns:eu-central-1:717279707507:distance-alert-topic";

exports.handler = async (event) => {
    console.log('📦 Neues Event:', JSON.stringify(event));

    const record = event.Records?.[0];
    if (!record) {
        console.error('❌ Keine Records gefunden');
        return;
    }

    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    try {
        const getObjectParams = {
            Bucket: bucket,
            Key: key
        };
        const data = await s3.send(new GetObjectCommand(getObjectParams));
        const body = await streamToString(data.Body);

        const sensorData = JSON.parse(body);

        const distance = sensorData.distance;
        console.log(`📏 Gemessene Distanz: ${distance} mm`);

        if (distance > 1000) {
            console.log('🚨 Abstand > 1m! Sende Alarm...');

            // Einfach eine Nachricht ans Topic senden!
            await sns.send(new PublishCommand({
                TopicArn: snsTopicArn,
                Message: `Alarm: Abstand größer als 1 Meter! Gemessen: ${(distance / 10).toFixed(1)} cm.`,
                Subject: '⚠️ Abstands-Alarm',
            }));

            console.log('✅ Alarm versendet.');
        } else {
            console.log('✅ Abstand unkritisch.');
        }
    } catch (error) {
        console.error('❌ Fehler beim Verarbeiten:', error);
    }
};

// Hilfsfunktion: S3 Body in String umwandeln
const streamToString = (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
};
