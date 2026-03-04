const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const dynamoDbClient = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

const PHONE_KEYPAD_MAP = {
  "2": ["A","B","C"],
  "3": ["D","E","F"],
  "4": ["G","H","I"],
  "5": ["J","K","L"],
  "6": ["M","N","O"],
  "7": ["P","Q","R","S"],
  "8": ["T","U","V"],
  "9": ["W","X","Y","Z"]
};

function extractCallerNumber(event) {
  return (
    event?.Details?.ContactData?.CustomerEndpoint?.Address ||
    event?.callerNumber ||
    "UNKNOWN"
  );
}

function generateVanityNumbers(phoneNumber, limit = 5) {
  const normalized = phoneNumber.replace(/\D/g,"").slice(-7);
  const results = [];

  function backtrack(index, current) {
    if(results.length >= limit) return;

    if(index === normalized.length) {
      results.push(current);
      return;
    }

    const digit = normalized[index];

    if(!PHONE_KEYPAD_MAP[digit]) {
      backtrack(index+1,current+digit);
      return;
    }

    for(const letter of PHONE_KEYPAD_MAP[digit]) {
      backtrack(index+1,current+letter);
    }
  }

  backtrack(0,"");
  return results;
}

exports.handler = async (event) => {
  console.log("EVENT:", JSON.stringify(event));

  const callerNumber = extractCallerNumber(event);
  const vanityNumbers = generateVanityNumbers(callerNumber,5);

  try {
    await dynamoDbClient.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        callerNumber: { S: callerNumber },
        createdAt: { N: Date.now().toString() },
        vanityNumbers: { S: JSON.stringify(vanityNumbers) }
      }
    }));
  } catch (error) {
    console.error("DynamoDB Error:", error);
    throw error;
  }

  return {
    vanityNumber1: vanityNumbers[0] || "",
    vanityNumber2: vanityNumbers[1] || "",
    vanityNumber3: vanityNumbers[2] || ""
  };
};