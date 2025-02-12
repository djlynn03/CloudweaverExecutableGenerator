import { Pipeline } from "../pipeline";

export function buildLambda(pipeline: Pipeline): string {
  // create handler function
  // call triggerHandler with the startAction from the event
  // TODO - add access control

  return `
    exports.handler = async (event) => {
        await triggerHandler(event.startAction);
    }
    `;
}
