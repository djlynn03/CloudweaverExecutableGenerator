import * as fs from "fs";

import { Actions } from "./actions/actions";
import { buildOrchestrator } from "./orchestrator/build";
import { Pipeline, PipelineData, PipelineMetadata } from "./pipeline";
import { buildPipelineFromJSON } from "./utils/data_ops";
import { minifyJS } from "./utils/minify";
import { buildLambda } from "./lambda/build";
import { buildAWSResources } from "./aws/resources";

export const buildExecutable = (
  pipelineDataJson: string,
  pipelineMetadataJson: string
): string => {
  let pipeline: Pipeline = buildPipelineFromJSON(
    pipelineDataJson,
    pipelineMetadataJson
  );

  var functions = ``;

  pipeline.steps.forEach((step) => {
    if (step.actionType in Actions) {
      let action = Actions[step.actionType as keyof typeof Actions](step);
      console.log(action);
      functions += action.code;
    }
  });
  var executable = "";

  let orchestrator = buildOrchestrator(pipeline);
  console.log(orchestrator);

  executable += orchestrator;
  executable += functions;
  executable += buildLambda(pipeline);

  return minifyJS(executable);
};

// test stuff

// const data: PipelineData = {
//   id: "pipeline_001",
//   name: "Simple Data Processing Pipeline",
//   triggers: [
//     {
//       type: "schedule",
//       schedule: "cron(0 12 * * ? *)",
//       startAction: "step_001",
//     },
//   ],
//   steps: [
//     {
//       id: "step_001",
//       actionType: "ApiCall",
//       actionData: {
//         url: "https://ifconfig.me",
//         method: "GET",
//         cache: true,
//         timeout: 5000,
//       },
//       onSuccess: ["step_002"],
//       onFailure: [],
//       description: "Fetch data from the API",
//     },
//     {
//       id: "step_002",
//       actionType: "processData",
//       actionData: {
//         processingSteps: [
//           {
//             operation: "filter",
//             criteria: { status: "active" },
//           },
//           {
//             operation: "map",
//             transform: { name: "title", value: "description" },
//           },
//         ],
//       },
//       onSuccess: ["step_003"],
//       onFailure: [],
//       description: "Process the fetched data",
//     },
//     {
//       id: "step_003",
//       actionType: "apiPost",
//       actionData: {
//         endpoint: "https://api.example.com/notify",
//         method: "POST",
//         body: {
//           message: "Data processing completed successfully!",
//           timestamp: "${timestamp}",
//         },
//       },
//       onSuccess: [],
//       onFailure: [],
//       description: "Notify the user about the completed processing",
//     },
//   ],
// };

// const metadata: PipelineMetadata = {
//   id: "test",
//   name: "test",
//   description: "test",
//   createdAt: "test",
//   updatedAt: "test",
//   status: "test",
// };
// fs.writeFileSync(
//   "./out/example.js",
//   buildExecutable(JSON.stringify(data), JSON.stringify(metadata))
// );
// fs.writeFileSync(
//   "./out/example.json",
//   JSON.stringify(buildAWSResources({...data, ...metadata}))
// );
