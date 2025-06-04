const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: process.env.REGION });
const QUEUE_URL = process.env.QUEUE_URL;

exports.handler = async (event) => {
    console.log("Event erhalten:", JSON.stringify(event, null, 2));

    const defaultHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    };

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: defaultHeaders,
                body: JSON.stringify({ error: "Request body fehlt" }),
            };
        }

        let bodyParsed;
        try {
            bodyParsed = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: defaultHeaders,
                body: JSON.stringify({ error: "Ungültiges JSON im Request Body" }),
            };
        }

        const { command } = bodyParsed;
        if (!command) {
            return {
                statusCode: 400,
                headers: defaultHeaders,
                body: JSON.stringify({ error: "Kein 'command' im Request Body" }),
            };
        }

        const message = JSON.stringify({ command });
        const sendResult = await sqsClient.send(
            new SendMessageCommand({
                QueueUrl: QUEUE_URL,
                MessageBody: message,
            })
        );

        return {
            statusCode: 200,
            headers: defaultHeaders,
            body: JSON.stringify({
                message: "Command wurde in SQS geschrieben",
                messageId: sendResult.MessageId
            }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: defaultHeaders,
            body: JSON.stringify({
                error: "Interner Fehler",
                message: err.message,
                stack: err.stack,
            }),
        };
    }
};
