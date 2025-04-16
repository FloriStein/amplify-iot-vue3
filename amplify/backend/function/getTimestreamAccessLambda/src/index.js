const { TimestreamQueryClient, QueryCommand } = require("@aws-sdk/client-timestream-query");

exports.handler = async (event) => {
    const client = new TimestreamQueryClient({ region: "eu-central-1" });

    const query = `
        SELECT time, distance
        FROM "distanceTimestreamDB"."distanceTimestreamDBTable"
        ORDER BY time DESC
            LIMIT 100
    `;

    try {
        const command = new QueryCommand({ QueryString: query });
        const data = await client.send(command);

        const results = data.Rows.map(row => ({
            time: row.Data[0].ScalarValue,
            value: parseInt(row.Data[1].ScalarValue)
        }));
        return {
            statusCode: 200,
            body: JSON.stringify(results),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            }
        };
    } catch (err) {
        console.error("Timestream query error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Query failed" }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            }
        };
    }
};
