import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as connect from "aws-cdk-lib/aws-connect";
import * as fs from "fs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ConnectVanityServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * CloudFormation parameter to pass the existing
     * Amazon Connect Instance ARN.
     *
     * Connect instances must be created manually,
     * so we keep this stack reusable by injecting the ARN.
     */
    const connectInstanceArn = new cdk.CfnParameter(
      this,
      "ConnectInstanceArn",
      {
        type: "String",
        description: "Amazon Connect Instance ARN",
      },
    );

    /**
     * DynamoDB table to store:
     * - callerNumber (PK)
     * - createdAt (SK)
     * - vanityNumbers (stored as JSON string)
     *
     * PAY_PER_REQUEST simplifies capacity management.
     * RemovalPolicy.DESTROY is used for demo purposes.
     */
    const table = new dynamodb.Table(this, "VanityTable", {
      partitionKey: {
        name: "callerNumber",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "createdAt",
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For assignment only
    });

    /**
     * Lambda function invoked by Amazon Connect.
     * Responsible for:
     * - Extracting caller number
     * - Generating vanity numbers
     * - Persisting data to DynamoDB
     * - Returning top 3 results to Connect
     */
    const vanityLambda = new lambda.Function(this, "VanityLambda", {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    /**
     * Grant read/write permissions to the vanity generator Lambda.
     */
    table.grantReadWriteData(vanityLambda);

    /**
     * Explicit permission allowing Amazon Connect
     * to invoke the vanity Lambda synchronously.
     */
    vanityLambda.addPermission("AllowConnectInvoke", {
      principal: new iam.ServicePrincipal("connect.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });

    /**
     * Load contact flow definition from JSON file.
     * The Lambda ARN is dynamically injected at deploy time.
     */
    let contactFlowContent = fs.readFileSync(
      "contact-flow/cf-vanity-number-service.json",
      "utf8",
    );

    /**
     * Load contact flow definition from JSON file.
     * The Lambda ARN is dynamically injected at deploy time.
     */
    if (!contactFlowContent.includes("LAMBDA_ARN_PLACEHOLDER")) {
      throw new Error("Lambda ARN placeholder not found in contact flow JSON");
    }

    contactFlowContent = contactFlowContent.replace(
      "LAMBDA_ARN_PLACEHOLDER",
      vanityLambda.functionArn,
    );

    /**
     * Create Amazon Connect Contact Flow
     * associated with the provided Connect instance.
     */
    new connect.CfnContactFlow(this, "VanityContactFlow", {
      instanceArn: connectInstanceArn.valueAsString,
      name: "cf-vanity-number-service",
      type: "CONTACT_FLOW",
      content: contactFlowContent,
    });

    /**
     * CloudFormation outputs for visibility after deployment.
     */
    new cdk.CfnOutput(this, "LambdaArn", {
      value: vanityLambda.functionArn,
    });

    new cdk.CfnOutput(this, "DynamoTableName", {
      value: table.tableName,
    });

    /**
     * Lambda function exposed via API Gateway.
     * Returns the latest 5 callers from DynamoDB.
     */
    const getLastFiveLambda = new lambda.Function(this, "GetLastFiveLambda", {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda-get-last-five"),
      timeout: cdk.Duration.seconds(10),

      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    /**
     * Grant read-only access for API Lambda.
     */
    table.grantReadData(getLastFiveLambda);

    /**
     * REST API exposing:
     * GET /callers
     *
     * CORS is enabled for demo purposes to allow local web app access.
     */
    const api = new apigateway.RestApi(this, "VanityApi", {
      restApiName: "Vanity Service API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET"],
      },
    });

    const callers = api.root.addResource("callers");
    callers.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getLastFiveLambda),
    );
    /**
     * Output API base URL for frontend configuration.
     */
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });
  }
}
