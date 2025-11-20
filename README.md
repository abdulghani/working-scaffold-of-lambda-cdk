## Hello-world Lambda with CDK (Node.js 22)

This project defines a simple hello-world AWS Lambda function using **Node.js 22** and AWS CDK (TypeScript).

The `cdk.json` file tells the CDK Toolkit how to execute your app.

### Prerequisites

- Node.js 22.x
- AWS CDK CLI (`npm install -g aws-cdk`)
- (Optional, for local testing) AWS SAM CLI and Docker

### Useful commands

- `npm run build`: compile TypeScript to JS  
- `npm run watch`: watch for changes and compile  
- `npm run test`: perform the jest unit tests  
- `npx cdk synth`: emit the synthesized CloudFormation template  
- `npx cdk deploy`: deploy this stack to your default AWS account/region  
- `npx cdk diff`: compare deployed stack with current state  

### Deploying the hello-world Lambda

1. Install dependencies:
   - `npm install`
2. (First time per account/region) bootstrap CDK:
   - `npx cdk bootstrap`
3. Build and synthesize:
   - `npm run build`
   - `npx cdk synth`
4. Deploy:
   - `npx cdk deploy`

After deploy, the output will include `HelloFunctionUrl`. Open that URL in a browser or call it with `curl` to see the JSON hello-world response.

### Testing locally with SAM

1. Synthesize a CloudFormation template:
   - `npm run build`
   - `npx cdk synth > template.yaml`
2. Create a simple `event.json` (for example in the project root):
   - `{ "hello": "world" }`
3. Find the logical ID of the Lambda function in `template.yaml` (look for a resource of type `AWS::Lambda::Function` created from `HelloFunction`).
4. Invoke the function locally with SAM:
   - `sam local invoke <LogicalIdFromTemplate> -t template.yaml -e event.json`

SAM will start a local Docker container using Node.js 22 and execute the hello-world Lambda with the provided event.

