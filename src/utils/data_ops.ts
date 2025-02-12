import { PipelineData, PipelineMetadata, Pipeline } from "../pipeline";

export const buildPipelineFromJSON = (
  pipelineDataJson: string,
  pipelineMetadataJson: string
): Pipeline => {
  let data: PipelineData = JSON.parse(pipelineDataJson);
  let metadata: PipelineMetadata = JSON.parse(pipelineMetadataJson);

  let pipeline: Pipeline = { ...data, ...metadata };
  return pipeline
};
