import { ApiActions } from "./api";
import { WorkflowActions } from "./workflow";

export interface RawAction<T> {
    id: string;
    actionType: string;
    description?: string
    actionData?: T;
}

export interface ActionData {
    [key: string]: any;
}

export interface CreatedAction<T> extends RawAction<T> {
    name: string;
    code: string;
}

export const Actions: {[key: string]: any} = {
    ...ApiActions,
    ...WorkflowActions
}

export type ActionType = keyof typeof Actions;