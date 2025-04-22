const { TimestreamQueryClient, QueryCommand } = require("@aws-sdk/client-timestream-query");

exports.handler = async (event) => {
    const client = new TimestreamQueryClient({ region: "eu-central-1" });

    const query = `
        SELECT time, measure_name, measure_value::bigint
        FROM "distanceTimestreamDB"."distanceTimestreamDBTable"
        WHERE measure_name IN ('distance', 'connected')
        ORDER BY time DESC
            LIMIT 200
    `;

    try {
        const command = new QueryCommand({ QueryString: query });
        const data = await client.send(command);

        const distanceData = [];
        let latestConnected = null;

        for (const row of data.Rows) {
            const time = row.Data[0]?.ScalarValue;
            const measure = row.Data[1]?.ScalarValue;
            const value = row.Data[2]?.ScalarValue;

            if (measure === 'distance') {
                distanceData.push({
                    time,
                    value: value !== null ? parseInt(value) : null
                });
            } else if (measure === 'connected' && latestConnected === null) {
                latestConnected = value === "1"; // nur der neueste Wert wird genommen
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                connected: latestConnected,
                distanceHistory: distanceData.reverse() // wieder chronologisch sortieren
            }),
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            }
        };
    } catch (err) {
        console.error("Timestream query error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Query failed' }),
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            }
        };
    }
};
