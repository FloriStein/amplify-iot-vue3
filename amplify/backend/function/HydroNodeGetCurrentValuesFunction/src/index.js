const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    QueryCommand
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const DYNAMO_TABLE = process.env.DYNAMO_TABLE;

exports.handler = async (event) => {
    console.log("📥 Eingehendes Event:", JSON.stringify(event, null, 2));

    const nodeId = event.queryStringParameters?.['node-id'];
    const metricType = event.queryStringParameters?.['type'];
    const timeframe = event.queryStringParameters?.timeframe || 'NOW';

    if (!nodeId) {
        return respond(400, { error: "'node-id' fehlt in den Query-Parametern" });
    }

    if (!metricType) {
        return respond(400, { error: "'type' (Sensor-Metrik) fehlt in den Query-Parametern" });
    }

    if (timeframe !== 'NOW') {
        return respond(400, { error: `Timeframe '${timeframe}' wird aktuell nicht unterstützt.` });
    }

    try {
        let allItems = [];
        let ExclusiveStartKey;

        do {
            const command = new QueryCommand({
                TableName: DYNAMO_TABLE,
                KeyConditionExpression: '#nodeId = :nodeId',
                ExpressionAttributeNames: {
                    '#nodeId': 'node-id'
                },
                ExpressionAttributeValues: {
                    ':nodeId': nodeId
                },
                ExclusiveStartKey,
                ScanIndexForward: true
            });

            const result = await ddb.send(command);
            allItems = allItems.concat(result.Items || []);
            ExclusiveStartKey = result.LastEvaluatedKey;

        } while (ExclusiveStartKey);

        if (allItems.length === 0) {
            return respond(404, { error: `Keine Daten für node-id '${nodeId}' gefunden.` });
        }

        const filtered = allItems
            .filter(item => item.readings && metricType in item.readings)
            .map(item => ({
                timestamp: item.timestamp || item.ts || null,
                nodeId: item['node-id'],
                type: metricType,
                value: item.readings[metricType]
            }));

        if (filtered.length === 0) {
            return respond(404, { error: `Keine Daten für type '${metricType}' bei node-id '${nodeId}' gefunden.` });
        }

        return respond(200, { data: filtered });

    } catch (error) {
        console.error('❌ Fehler bei DynamoDB-Abfrage:', error);
        return respond(500, { error: 'Interner Serverfehler' });
    }
};

function respond(statusCode, body) {
    const response = {
        statusCode,
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };
    console.log("📤 Antwort:", JSON.stringify(response, null, 2));
    return response;
}
