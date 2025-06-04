import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data";

const sqs = new SQSClient({});
const iot = new IoTDataPlaneClient({
    region: "eu-central-1",
    endpoint: "https://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com", // Ersetze mit deinem IoT Endpoint
});

const SQS_QUEUE_URL = "https://sqs.eu-central-1.amazonaws.com/717279707507/esp32-command-queue"; // Ersetze mit deiner Queue

export const handler = async (event) => {
    console.log("MQTT Event erhalten:", JSON.stringify(event, null, 2));

    try {
        // Nachricht aus der SQS lesen
        const receiveParams = {
            QueueUrl: SQS_QUEUE_URL,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 0,
        };

        const sqsResponse = await sqs.send(new ReceiveMessageCommand(receiveParams));

        if (!sqsResponse.Messages || sqsResponse.Messages.length === 0) {
            console.log("Keine Nachrichten in der Warteschlange.");
            return { status: "no_message" };
        }

        const message = sqsResponse.Messages[0];
        const messageBody = message.Body;

        console.log("Nachricht aus SQS:", messageBody);

        // Nachricht an MQTT-Topic senden
        const publishParams = {
            topic: "esp/sqsrespond",
            payload: Buffer.from(messageBody),
            qos: 0,
        };

        await iot.send(new PublishCommand(publishParams));

        console.log("Nachricht an MQTT Topic 'esp/sqsrespond' gesendet.");

        // Nachricht aus SQS löschen
        await sqs.send(new DeleteMessageCommand({
            QueueUrl: SQS_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
        }));

        console.log("Nachricht aus SQS gelöscht.");

        return { status: "message_sent" };

    } catch (error) {
        console.error("Fehler:", error);
        return { status: "error", error: error.message };
    }
};
