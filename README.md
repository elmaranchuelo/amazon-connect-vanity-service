# Amazon Connect Vanity Number Service

## Overview

This project implements a small-scale production-style solution using:

- Amazon Connect (Inbound Call Handling)
- AWS Lambda (Vanity Number Generator)
- Amazon DynamoDB (Data Storage)
- API Gateway (REST endpoint for web app)
- Static Web Application (Bonus Feature)
- AWS CDK (Infrastructure as Code – TypeScript)

The system:

1. Accepts inbound phone calls via Amazon Connect.
2. Generates the best 5 vanity numbers from the caller’s phone number.
3. Stores the caller and vanity numbers in DynamoDB.
4. Speaks the top 3 vanity numbers back to the caller.
5. Exposes a REST endpoint to retrieve the last 5 callers.
6. Displays them in a simple web interface.

---

## Prerequisites

1. Amazon Connect instance (created manually)
2. Claimed phone number
3. AWS CLI configured
4. Node.js 20+

    ⚠ **IMPORTANT:**  
    Deploy this stack in the **same region** as your Amazon Connect instance.

---

## Deployment / Installation

Clone the repository

``` 
git clone <repository-url>
```
Navigate to the project directory

```
cd connect-vanity-iac
```

Install dependencies:

```
npm install
```
Bootstrap (first time only):

```
cdk bootstrap
```
Deploy:

```
cdk deploy ConnectVanityServiceStack \
  --parameters ConnectInstanceArn=<your-connect-instance-arn>
```

## Post-Deployment Setup (Amazon Connect)

1. Open Amazon Connect.

2. Go to Account Overview → Lambda functions.

3. Add the deployed Vanity Lambda.

4. Open Contact Flows.

5. Confirm cf-vanity-number-service exists.

6. Attach the contact flow to your claimed phone number.


---

## Testing

1. Test Lambda Directly (Optional)

    ```
    {
    "callerNumber": "+639171234567"
    }
    ```

    Expected result:

    - Returns 3 vanity numbers

    - Inserts record into DynamoDB

2. Test via Phone Call

    1. Call the claimed phone number.

    2. The system should:

    - Generate vanity numbers

    - Store them in DynamoDB

    - Speak the top 3 vanity numbers

    3. Verify record appears in DynamoDB table.

3. Test API Endpoint

    Open in browser:

    ```
    <Your ApiUrl>/callers
    ```
    Use the ApiUrl output from CDK (remove trailing slash).

4. Bonus Web Application

    Web App Setup
    ```
    npm install -g serve
    ```
    Configure backend API URL on web/config.js
    ```
    window.APP_CONFIG = {
        API_BASE_URL: "<backend API URL>"
    };
    ```
     run locally
     ```
     cd web
     serve
     ```
     Open
     ```
      http://localhost:3000
     ```

---

# Architecture Overview

## High-Level Flow

Inbound Call
   →
Amazon Connect
   →
Contact Flow
   →
Lambda (Vanity Generator)
   →
DynamoDB (Store Caller + Vanity Numbers)
   →
Return 3 Vanity Numbers
   →
Text-to-Speech Response

---

## Bonus Web Application Flow

Browser
   →
API Gateway
   →
Lambda (Get Last 5)
   →
DynamoDB
   →
JSON Response

---

## Components

### Amazon Connect
Handles inbound call routing and invokes Lambda synchronously.

### Lambda – Vanity Generator
- Extracts caller phone number
- Generates top 5 vanity numbers
- Stores record in DynamoDB
- Returns top 3 vanity numbers to Connect

### DynamoDB
Stores:
- callerNumber (PK)
- createdAt (SK)

### API Gateway
Provides REST endpoint:
GET /callers

### Lambda – Get Last Five
- Scans DynamoDB
- Sorts by timestamp
- Returns latest 5 records

### Web Application
- Static HTML
- Configurable API URL
- Fetches and displays last 5 callers

---

## Deployment Model

Infrastructure is provisioned using AWS CDK.

Manual prerequisite:
- Create Amazon Connect instance
- Claim phone number

All other resources are deployed via:

cdk deploy --parameters ConnectInstanceArn=<ARN>

---

## Security Model

- Lambda IAM role limited to DynamoDB access.
- API Gateway CORS enabled for demo.
- No secrets stored in code.
- Environment variables used for configuration.

---

## Production Considerations

- Use GSI instead of Scan.
- Enable structured logging.
- Add authentication and throttling.
- Implement CI/CD.
- Add CloudWatch alarms.


# Q & A / DESIGN DECISIONS

## Design Decisions

### Why CDK?

I used AWS CDK because I prefer defining infrastructure in TypeScript instead of large YAML files. It keeps everything in one codebase and makes it easier to manage changes across environments.

### Why DynamoDB On-Demand?

Since this is a small system with unpredictable traffic (phone calls), on-demand billing removes the need to think about capacity. It scales automatically and keeps the setup simple.

### Why Parameterized Connect ARN?

Amazon Connect instances must be created manually and differ per AWS account. Passing the instance ARN as a parameter keeps the stack reusable and avoids hardcoding account-specific values.

---

## Shortcuts Taken

To keep the project focused and small:

- Used DynamoDB `Scan` to fetch the last 5 callers (fine for demo scale).
- Used `RemovalPolicy.DESTROY` for easier cleanup.
- Built a very simple static UI.
- Did not add authentication to the API.
- Did not implement structured logging.
- No CI/CD pipeline.

These would all be addressed in a real production environment.

---

## What I Would Improve With More Time

### Backend

- Redesign the DynamoDB schema or add a GSI to avoid using `Scan`.
- Add structured logging.
- Add retry handling and possibly a dead-letter queue.
- Add API authentication and request validation.
- Add monitoring and alarms.

### Security

- Restrict CORS to known domains.
- Apply stricter IAM permissions.
- Add throttling to API Gateway.
- Consider WAF for public endpoints.

### Frontend

- Rebuild the UI using a modern stack (e.g., React).
- Improve styling and usability.
- Add loading indicators and better formatting.
- Deploy via S3 + CloudFront.

---

## High-Volume Considerations

If this system needed to handle large traffic volumes:

- Redesign the DynamoDB access pattern for time-based queries.
- Avoid full table scans.
- Monitor Lambda concurrency and add limits if needed.
- Add alerting for errors and performance issues.
- Introduce caching where appropriate.

## Architecture Diagram (Text Representation)

Inbound Call
   →
Amazon Connect
   →
Contact Flow
   →
Lambda (Vanity Generator)
   →
DynamoDB (Store Caller + Vanity Numbers)
   →
Return 3 Vanity Numbers
   →
Text-to-Speech Response