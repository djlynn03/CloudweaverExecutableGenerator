import { PipelineTrigger } from "../pipeline";

export interface GitHubWebhookTrigger extends PipelineTrigger {
  type: "github_webhook";
  events: Array<
    | "push"
    | "pull_request"
    | "pull_request_review"
    | "issues"
    | "issue_comment"
    | "workflow_run"
  >;
  branches?: string[];
  repository?: string;
}

export interface JiraWebhookTrigger extends PipelineTrigger {
  type: "jira_webhook";
  events: Array<
    | "issue_created"
    | "issue_updated"
    | "issue_deleted"
    | "comment_created"
    | "status_updated"
  >;
  projectKeys?: string[];
  issueTypes?: string[];
}

export interface ApprovalResponseTrigger extends PipelineTrigger {
  type: "approval_response";
  approvalActionId: string;
}

export interface SlackInteractionTrigger extends PipelineTrigger {
  type: "slack_interaction";
  actions: string[];
  channels?: string[];
}

export interface EmailTrigger extends PipelineTrigger {
  type: "email";
  fromAddresses?: string[];
  subject?: string;
  hasAttachments?: boolean;
} 