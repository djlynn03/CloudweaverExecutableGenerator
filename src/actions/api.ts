import { ActionData, CreatedAction, RawAction } from "./actions";

export const ApiActions: {
  [key: string]: (action: any) => CreatedAction<any>;
} = {
  ApiCall: makeApiCallAction,
  WebSocket: makeWebSocketAction,
  SSE: makeSSEAction,
};

export type ApiActionType = keyof typeof ApiActions;

export interface ApiCallAction extends ActionData {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: { [key: string]: string };
  body?: any;
  responseType?: "json" | "text" | "blob";
  queryParams?: { [key: string]: string };
  timeout?: number;
}

export function makeApiCallAction(
  action: RawAction<ApiCallAction>
): CreatedAction<ApiCallAction> {
  // return code for api call
  const { url, method, headers, body, responseType, queryParams, timeout } =
    action.actionData!;
  const functionName = action.id;
  const code = `
        async function action_${functionName}(){
            return response = fetch('${url}', {
                method: '${method}',
                ${headers ? `headers: ${JSON.stringify(headers)},` : ""}
                ${body ? `body: ${JSON.stringify(body)},` : ""}
                ${responseType ? `responseType: '${responseType}',` : ""}
                ${
                  queryParams
                    ? `queryParams: ${JSON.stringify(queryParams)},`
                    : ""
                }
                timeout: ${timeout || 5000},
            }).then(response => {
                return response;
            }).catch(error => {
                console.error(error);
                throw error;
            });
        }
    `;
  return { name: functionName, code: code, ...action };
}

// ... existing imports and ApiActions object ...

// Add these new interfaces
export interface WebSocketAction extends ActionData {
  url: string;
  protocols?: string[];
  onMessage?: string;
  onClose?: string;
  onError?: string;
}

export interface SSEAction extends ActionData {
  url: string;
  eventTypes: string[];
  onMessage?: string;
  onError?: string;
}

export function makeWebSocketAction(
  action: RawAction<WebSocketAction>
): CreatedAction<WebSocketAction> {
  const { url, protocols, onMessage, onClose, onError } = action.actionData!;
  const functionName = action.id;
  const code = `
    async function action_${functionName}() {
      const ws = new WebSocket('${url}'${
    protocols ? `, ${JSON.stringify(protocols)}` : ""
  });

      ws.onmessage = (event) => {
        ${
          onMessage || 'console.log("WebSocket message received:", event.data)'
        };
      };

      ws.onclose = () => {
        ${onClose || 'console.log("WebSocket connection closed")'};
      };

      ws.onerror = (error) => {
        ${onError || 'console.error("WebSocket error:", error)'};
      };

      return ws;
    }
  `;
  return { name: functionName, code: code, ...action };
}

export function makeSSEAction(
  action: RawAction<SSEAction>
): CreatedAction<SSEAction> {
  const { url, eventTypes, onMessage, onError } = action.actionData!;
  const functionName = action.id;
  const code = `
    async function action_${functionName}() {
      const eventSource = new EventSource('${url}');

      ${eventTypes
        .map(
          (eventType) => `
        eventSource.addEventListener('${eventType}', (event) => {
          ${
            onMessage ||
            `console.log("${eventType} event received:", event.data)`
          };
        });
      `
        )
        .join("\n")}

      eventSource.onerror = (error) => {
        ${onError || 'console.error("EventSource error:", error)'};
      };

      return eventSource;
    }
  `;
  return { name: functionName, code: code, ...action };
}
