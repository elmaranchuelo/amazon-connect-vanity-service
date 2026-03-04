const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async () => {
  try {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME
      })
    );

    const sorted = (result.Items || [])
      .sort((a, b) => Number(b.createdAt.N) - Number(a.createdAt.N))
      .slice(0, 5);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify(sorted)
    };

  } catch (error) {
    console.error("Error fetching callers:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};