// @ts-nocheck

import { buildExecutable } from "../../src";
import pipelineData from "./api_call.json";
import pipelineMetadata from "./api_call_metadata.json";

test("builds API action", () => {
  const res = buildExecutable(
    JSON.stringify(pipelineData),
    JSON.stringify(pipelineMetadata)
  );
  console.log(res);
  //   TODO- add actual tests here
});
