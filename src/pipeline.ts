// join type for data and metadata
export type Pipeline = PipelineData & PipelineMetadata;

export type PipelineData = {
    "id": string,
    "name": string,
    "triggers": PipelineTrigger[],
    "steps": PipelineStep[]
}

export type PipelineMetadata = {
    "id": string,
    "name": string,
    "description": string,
    "createdAt": string,
    "updatedAt": string,
    "status": string,
}

export type PipelineTrigger = {
    "type": string,
    "schedule": string,
    "startAction": string, // string of id
}

export type PipelineStep = {
    "id": string,
    "actionType": string,
    "actionData": any,
    "onSuccess": string[], // string of ids
    "onFailure": string[], // string of ids
    "description": string,
}