import { ActionData, CreatedAction, RawAction } from "./actions";

export const WorkflowActions: {
  [key: string]: (action: any) => CreatedAction<any>;
} = {
  Approval: makeApprovalAction,
  SlackNotification: makeSlackNotificationAction,
  GitHubPR: makeGitHubPRAction,
  JiraUpdate: makeJiraUpdateAction,
};

export interface ApprovalAction extends ActionData {
  approvers: string[];
  timeoutHours?: number;
  description?: string;
  requiredApprovals?: number;
}

export interface SlackNotificationAction extends ActionData {
  channel: string;
  message: string;
  webhookUrl: string;
  mentions?: string[];
  color?: string;
}

export interface GitHubPRAction extends ActionData {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  baseBranch?: string;
  headBranch: string;
  reviewers?: string[];
  labels?: string[];
  token: string;
}

export interface JiraUpdateAction extends ActionData {
  issueKey: string;
  status?: string;
  comment?: string;
  assignee?: string;
  fields?: Record<string, any>;
  token: string;
  baseUrl: string;
}

export function makeApprovalAction(
  action: RawAction<ApprovalAction>
): CreatedAction<ApprovalAction> {
  const {
    approvers,
    timeoutHours = 24,
    description,
    requiredApprovals = 1,
  } = action.actionData!;
  const functionName = action.id;
  const code = `
    async function action_${functionName}() {
      const approvalState = {
        pending: true,
        approvers: ${JSON.stringify(approvers)},
        approvals: [],
        deadline: new Date(Date.now() + ${timeoutHours} * 3600000).toISOString(),
        description: ${JSON.stringify(description || "Approval required")},
        requiredApprovals: ${requiredApprovals}
      };

      // Store approval state in database/storage
      await storeApprovalState(approvalState);

      // Wait for approvals or timeout
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
          const currentState = await getApprovalState();
          
          if (currentState.approvals.length >= ${requiredApprovals}) {
            clearInterval(checkInterval);
            resolve({ approved: true, approvers: currentState.approvals });
          }
          
          if (new Date() > new Date(currentState.deadline)) {
            clearInterval(checkInterval);
            reject(new Error("Approval timeout reached"));
          }
        }, 60000);
      });
    }
  `;
  return { name: functionName, code, ...action };
}

export function makeSlackNotificationAction(
  action: RawAction<SlackNotificationAction>
): CreatedAction<SlackNotificationAction> {
  const {
    channel,
    message,
    webhookUrl,
    mentions = [],
    color = "#36a64f",
  } = action.actionData!;
  const functionName = action.id;
  const code = `
    async function action_${functionName}() {
      const mentionText = ${JSON.stringify(mentions)}
        .map(user => \`@\${user}\`)
        .join(" ");
      
      const payload = {
        channel: "${channel}",
        attachments: [{
          color: "${color}",
          text: \`\${mentionText ? mentionText + " " : ""}\${${JSON.stringify(
            message
          )}}\`
        }]
      };

      return fetch("${webhookUrl}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
  `;
  return { name: functionName, code, ...action };
}

export function makeGitHubPRAction(
  action: RawAction<GitHubPRAction>
): CreatedAction<GitHubPRAction> {
  const {
    owner,
    repo,
    title,
    body = "",
    baseBranch = "main",
    headBranch,
    reviewers = [],
    labels = [],
    token,
  } = action.actionData!;
  const functionName = action.id;
  const code = `
    async function action_${functionName}() {
      const response = await fetch(\`https://api.github.com/repos/${owner}/${repo}/pulls\`, {
        method: "POST",
        headers: {
          "Authorization": "Bearer ${token}",
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: ${JSON.stringify(title)},
          body: ${JSON.stringify(body)},
          head: "${headBranch}",
          base: "${baseBranch}"
        })
      });

      const pr = await response.json();

      if (${reviewers.length} > 0) {
        await fetch(\`https://api.github.com/repos/${owner}/${repo}/pulls/\${pr.number}/requested_reviewers\`, {
          method: "POST",
          headers: {
            "Authorization": "Bearer ${token}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reviewers: ${JSON.stringify(reviewers)}
          })
        });
      }

      if (${labels.length} > 0) {
        await fetch(\`https://api.github.com/repos/${owner}/${repo}/issues/\${pr.number}/labels\`, {
          method: "POST",
          headers: {
            "Authorization": "Bearer ${token}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            labels: ${JSON.stringify(labels)}
          })
        });
      }

      return pr;
    }
  `;
  return { name: functionName, code, ...action };
}

export function makeJiraUpdateAction(
  action: RawAction<JiraUpdateAction>
): CreatedAction<JiraUpdateAction> {
  const {
    issueKey,
    status,
    comment,
    assignee,
    fields = {},
    token,
    baseUrl,
  } = action.actionData!;
  const functionName = action.id;
  const code = `
    async function action_${functionName}() {
      const auth = Buffer.from("${token}").toString("base64");
      
      const updates = [];
      
      ${
        status
          ? `
      updates.push(
        fetch(\`${baseUrl}/rest/api/3/issue/${issueKey}/transitions\`, {
          method: "POST",
          headers: {
            "Authorization": \`Basic \${auth}\`,
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transition: { name: "${status}" }
          })
        })
      );
      `
          : ""
      }

      ${
        comment
          ? `
      updates.push(
        fetch(\`${baseUrl}/rest/api/3/issue/${issueKey}/comment\`, {
          method: "POST",
          headers: {
            "Authorization": \`Basic \${auth}\`,
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            body: ${JSON.stringify(comment)}
          })
        })
      );
      `
          : ""
      }

      ${
        Object.keys(fields).length > 0
          ? `
      updates.push(
        fetch(\`${baseUrl}/rest/api/3/issue/${issueKey}\`, {
          method: "PUT",
          headers: {
            "Authorization": \`Basic \${auth}\`,
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fields: ${JSON.stringify(fields)}
          })
        })
      );
      `
          : ""
      }

      return Promise.all(updates);
    }
  `;
  return { name: functionName, code, ...action };
}
