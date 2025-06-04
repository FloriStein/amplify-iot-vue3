const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { IoTDataPlaneClient, PublishCommand } = require("@aws-sdk/client-iot-data-plane");


const REGION = process.env.AWS_REGION;
const QUEUE_URL = process.env.QUEUE_URL;
const IOT_ENDPOINT = process.env.IOT_ENDPOINT;

const MQTT_TOPIC = "commandToEsp";


const sqsClient = new SQSClient({ region: REGION });
const iotClient = new IoTDataPlaneClient({ region: REGION, endpoint: IOT_ENDPOINT });

exports.handler = async (event) => {
    try {
        const { Messages } = await sqsClient.send(new ReceiveMessageCommand({
            QueueUrl: QUEUE_URL,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 0,
            VisibilityTimeout: 30
        }));

        if (!Messages || Messages.length === 0) {
            return {
                statusCode: 204,
                body: JSON.stringify({ message: "Keine Nachrichten in der Queue" }),
            };
        }

        const message = Messages[0];
        const messageBody = message.Body;

        // ✅ Nachricht strukturieren (inkl. Metadaten für ESP & Frontend)
        const commandObj = JSON.parse(messageBody);

        const mqttPayload = JSON.stringify({
            type: "command",
            source: "lambda",
            target: "esp32",
            command: commandObj.command
        });

        // ✅ Nur EIN MQTT-Topic verwenden
        await iotClient.send(new PublishCommand({
            topic: MQTT_TOPIC,
            payload: Buffer.from(mqttPayload),
            qos: 0
        }));
        console.log(`📡 Nachricht an ${MQTT_TOPIC} gesendet`);

        // Nachricht aus der Queue löschen
        await sqsClient.send(new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: messageBody,
                sentTo: MQTT_TOPIC
            }),
        };

    } catch (error) {
        console.error("❌ Fehler in Lambda2:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
