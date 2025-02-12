import { Pipeline, PipelineTrigger } from "../pipeline";
import { EmailTrigger } from "../triggers/workflow";

interface AWSResource {
  Type: string;
  Properties: Record<string, any>;
}

interface CloudFormationTemplate {
  Resources: Record<string, AWSResource>;
}

export function buildAWSResources(pipeline: Pipeline): CloudFormationTemplate {
  const resources: Record<string, AWSResource> = {
    PipelineFunction: buildLambdaResource(pipeline),
    ...buildTriggerResources(pipeline.triggers),
  };

  return {
    Resources: resources,
  };
}

function buildLambdaResource(pipeline: Pipeline): AWSResource {
  return {
    Type: "AWS::Lambda::Function",
    Properties: {
      Handler: "index.handler",
      Role: { "Fn::GetAtt": ["PipelineLambdaRole", "Arn"] },
      Code: {
        ZipFile: buildLambdaCode(pipeline),
      },
      Runtime: "nodejs18.x",
      Timeout: 300,
      MemorySize: 128,
    },
  };
}

function buildTriggerResources(triggers: PipelineTrigger[]): Record<string, AWSResource> {
  const resources: Record<string, AWSResource> = {
    PipelineLambdaRole: buildLambdaRole(),
  };

  triggers.forEach((trigger, index) => {
    switch (trigger.type) {
      case "schedule":
        resources[`ScheduleRule${index}`] = buildEventBridgeRule(trigger);
        resources[`SchedulePermission${index}`] = buildLambdaPermission(`ScheduleRule${index}`);
        break;
      case "s3":
        resources[`S3Bucket${index}`] = buildS3Bucket(trigger);
        resources[`S3Permission${index}`] = buildLambdaPermission(`S3Bucket${index}`);
        break;
      case "github_webhook":
        resources[`ApiGateway${index}`] = buildApiGateway(trigger);
        resources[`ApiGatewayPermission${index}`] = buildLambdaPermission(`ApiGateway${index}`);
        break;
      case "jira_webhook":
        resources[`ApiGateway${index}`] = buildApiGateway(trigger);
        resources[`ApiGatewayPermission${index}`] = buildLambdaPermission(`ApiGateway${index}`);
        break;
      case "approval_response":
        resources[`ApprovalTable${index}`] = buildDynamoDBTable(trigger);
        resources[`ApprovalApi${index}`] = buildApiGateway(trigger);
        resources[`ApprovalApiPermission${index}`] = buildLambdaPermission(`ApprovalApi${index}`);
        break;
      case "slack_interaction":
        resources[`SlackApi${index}`] = buildApiGateway(trigger);
        resources[`SlackApiPermission${index}`] = buildLambdaPermission(`SlackApi${index}`);
        break;
      case "email":
        resources[`SESRule${index}`] = buildSESRule(trigger);
        resources[`SESPermission${index}`] = buildLambdaPermission(`SESRule${index}`);
        break;
    }
  });

  return resources;
}

function buildLambdaRole(): AWSResource {
  return {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      },
      ManagedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      ],
      Policies: [
        {
          PolicyName: "PipelineFunctionPolicy",
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: [
                  "dynamodb:GetItem",
                  "dynamodb:PutItem",
                  "dynamodb:UpdateItem",
                  "dynamodb:DeleteItem",
                  "dynamodb:Query",
                  "ses:SendEmail",
                  "ses:SendRawEmail",
                  "s3:GetObject",
                  "s3:PutObject"
                ],
                Resource: "*"
              }
            ]
          }
        }
      ]
    }
  };
}

function buildEventBridgeRule(trigger: PipelineTrigger): AWSResource {
  return {
    Type: "AWS::Events::Rule",
    Properties: {
      ScheduleExpression: trigger.schedule,
      State: "ENABLED",
      Targets: [
        {
          Arn: { "Fn::GetAtt": ["PipelineFunction", "Arn"] },
          Id: "PipelineFunctionTarget",
          Input: JSON.stringify({ startAction: trigger.startAction }),
        },
      ],
    },
  };
}

function buildS3Bucket(trigger: PipelineTrigger): AWSResource {
  return {
    Type: "AWS::S3::Bucket",
    Properties: {
      NotificationConfiguration: {
        LambdaConfigurations: [
          {
            Event: "s3:ObjectCreated:*",
            Function: { "Fn::GetAtt": ["PipelineFunction", "Arn"] },
          },
        ],
      },
    },
  };
}

function buildLambdaPermission(sourceArn: string): AWSResource {
  return {
    Type: "AWS::Lambda::Permission",
    Properties: {
      Action: "lambda:InvokeFunction",
      FunctionName: { "Fn::GetAtt": ["PipelineFunction", "Arn"] },
      Principal: "events.amazonaws.com",
      SourceArn: { "Fn::GetAtt": [sourceArn, "Arn"] },
    },
  };
}

function buildLambdaCode(pipeline: Pipeline): string {
  // TODO - This will be replaced with the actual Lambda code from buildLambda
  return "exports.handler = async (event) => { /* Lambda code will be inserted here */ }";
}

function buildApiGateway(trigger: PipelineTrigger): AWSResource {
  return {
    Type: "AWS::ApiGateway::RestApi",
    Properties: {
      Name: `Pipeline-${trigger.type}-${Date.now()}`,
      EndpointConfiguration: {
        Types: ["REGIONAL"]
      },
      Body: {
        swagger: "2.0",
        info: {
          title: `Pipeline ${trigger.type} API`
        },
        paths: {
          "/webhook": {
            post: {
              "x-amazon-apigateway-integration": {
                uri: { "Fn::GetAtt": ["PipelineFunction", "Arn"] },
                passthroughBehavior: "WHEN_NO_MATCH",
                httpMethod: "POST",
                type: "aws_proxy"
              }
            }
          }
        }
      }
    }
  };
}

function buildDynamoDBTable(trigger: PipelineTrigger): AWSResource {
  return {
    Type: "AWS::DynamoDB::Table",
    Properties: {
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S"
        }
      ],
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH"
        }
      ],
      BillingMode: "PAY_PER_REQUEST",
      StreamSpecification: {
        StreamViewType: "NEW_AND_OLD_IMAGES"
      }
    }
  };
}

function buildSESRule(trigger: PipelineTrigger): AWSResource {
  const emailTrigger = trigger as EmailTrigger;
  return {
    Type: "AWS::SES::ReceiptRule",
    Properties: {
      Rule: {
        Actions: [
          {
            LambdaAction: {
              FunctionArn: { "Fn::GetAtt": ["PipelineFunction", "Arn"] }
            }
          }
        ],
        Enabled: true,
        ScanEnabled: true,
        Recipients: emailTrigger.fromAddresses,
        TlsPolicy: "Require"
      }
    }
  };
}