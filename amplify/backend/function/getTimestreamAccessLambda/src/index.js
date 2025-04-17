/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */
const { TimestreamQueryClient, QueryCommand } = require("@aws-sdk/client-timestream-query");

exports.handler = async (event) => {
    const client = new TimestreamQueryClient({ region: "eu-central-1" });
    const query = `SELECT time, measure_value::bigint as distance
        FROM "distanceTimestreamDB"."distanceTimestreamDBTable"
    WHERE measure_name = 'distance'
    ORDER BY time DESC
    LIMIT 100`;
    try {
        const command = new QueryCommand({ QueryString: query });
        const data = await client.send(command);

        const results = data.Rows.map(row => {
            const time = row.Data[0]?.ScalarValue;
            const raw = row.Data[1]?.ScalarValue;
            const value = raw !== null ? parseInt(raw) : null;
            return { time, value };
        });
        console.log("✅ Ergebnis:", results.slice(0, 5)); // nur die ersten 5 für Übersicht
        console.log("📦 columnInfo:", JSON.stringify(data.ColumnInfo, null, 2));
        console.log("📦 erste Zeile:", JSON.stringify(data.Rows[0], null, 2));

        return {
            statusCode: 200,
            body: JSON.stringify(results),
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            }
        }

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
        }
    }
};



//  Uncomment below to enable CORS requests
//  headers: {
//      "Access-Control-Allow-Origin": "*",
//      "Access-Control-Allow-Headers": "*"
//  },