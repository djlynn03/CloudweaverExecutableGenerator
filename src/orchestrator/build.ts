/*
Create the step-by-step structure of the pipeline based on the pipeline JSON
and the metadata JSON. This will be used to generate the executable code.

Use onSuccess and onFailure to create the structure.
Each action function (e.g. function step_001) will return {result: any, error: any}
*/

import {
  Pipeline,
  PipelineData,
  PipelineMetadata,
  PipelineStep,
  PipelineTrigger,
} from "../pipeline";

function generateActionCall(step: PipelineStep): string {
  const { id, actionType, actionData, onSuccess, onFailure } = step;
  const actionDataStr = JSON.stringify(actionData, null, 2); // Pretty print JSON
  const successCalls = onSuccess
    .map((nextId) => `await ${nextId}();`)
    .join("\n");
  const failureCalls = onFailure
    .map((nextId) => `await ${nextId}();`)
    .join("\n");

  return `
  async function ${id}() {
    try {
      const { result, error } = await action_${id}(${actionDataStr});
      console.log("Executing ${actionType}", ${actionDataStr});
      ${successCalls || "// No success steps"}
    } catch (error) {
      console.error("Error in ${id}:", error);
      ${failureCalls || "// No failure steps"}
    }
  }`;
}

function generateTriggerHandler(triggers: PipelineTrigger[]): string {
  // create function string that will call the action startAction based on a parameter
  let code = "async function triggerHandler(startAction) {";
  triggers.forEach((trigger) => {
    code += `if (startAction === "${trigger.startAction}") { await ${trigger.startAction}(); }`;
  });
  code += "}";
  return code;
}

// returns a string containing function calls for actions in the desired structure
export function buildOrchestrator(pipeline: Pipeline): string {
  const { steps, triggers } = pipeline;

  const stepsMap = new Map(steps.map((step) => [step.id, step]));

  const visited = new Set<string>();
  let code = "";

  const generateCodeForStep = (stepId: string) => {
    if (visited.has(stepId)) {
      return;
    }
    visited.add(stepId);

    const step = stepsMap.get(stepId);
    if (step) {
      code += generateActionCall(step) + "\n\n";

      [...step.onSuccess, ...step.onFailure].forEach(generateCodeForStep);
    }
  };

  const independentSteps = steps.filter(
    (step) =>
      !steps.some(
        (other) =>
          other.onSuccess.includes(step.id) || other.onFailure.includes(step.id)
      )
  );

  independentSteps.forEach((step) => generateCodeForStep(step.id));

  code += generateTriggerHandler(triggers);

  return code;
}
