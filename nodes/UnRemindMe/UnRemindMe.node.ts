import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

// The node speaks JSON-RPC to the existing MCP server rather than to a
// separate REST API. That is deliberate: the MCP endpoint already carries the
// auth, the validation, the plan quota and the approval gate, so a REST
// projection would be a second codepath to keep in step for no gain. n8n does
// not care what shape the HTTP body is.
const ENDPOINT = 'https://unremind.me/mcp?src=n8n';

export class UnRemindMe implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'UnRemind.me',
    name: 'unRemindMe',
    icon: { light: 'file:unremind.svg', dark: 'file:unremind.dark.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    // Lets an AI Agent node call these operations directly as tools, which is
    // the whole point of a reminders integration: the agent decides when a
    // reminder is worth creating.
    usableAsTool: true,
    description: 'Context-aware reminders that surface when your situation matches, not at a fixed time',
    defaults: { name: 'UnRemind.me' },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'unRemindMeApi', required: true }],
    requestDefaults: { baseURL: 'https://unremind.me' },
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        default: 'createUnreminder',
        options: [
          {
            name: 'Complete Unreminder',
            value: 'completeUnreminder',
            description: 'Mark an Unreminder as completed',
            action: 'Complete an unreminder',
          },
          {
            name: 'Create Unreminder',
            value: 'createUnreminder',
            description: 'Submit a new Unreminder for the account owner to approve',
            action: 'Create an unreminder',
          },
          {
            name: 'List Context Tags',
            value: 'listContextTags',
            description: 'List every valid context tag, grouped',
            action: 'List context tags',
          },
          {
            name: 'List Unreminders',
            value: 'listUnreminders',
            description: "List the account owner's Unreminders, soonest due first",
            action: 'List unreminders',
          },
          {
            name: 'Suggest Next Task',
            value: 'suggestNextTask',
            description: 'Given the time available, rank what is worth doing now',
            action: 'Suggest the next task',
          },
        ],
      },

      // ── Create ──────────────────────────────────────────────────────────
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['createUnreminder'] } },
        description: "Short and action-oriented, e.g. 'Email the contractor about the quote'",
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: { show: { operation: ['createUnreminder'] } },
        options: [
          {
            displayName: 'Notes',
            name: 'notes',
            type: 'string',
            typeOptions: { rows: 3 },
            default: '',
            description: "Detail needed to act on it: context, links, what 'done' looks like",
          },
          {
            displayName: 'Due At',
            name: 'due_at',
            type: 'dateTime',
            default: '',
            description: 'Only set this if there is a real deadline — an invented one is worse than none',
          },
          {
            displayName: 'Context Tags',
            name: 'tags',
            type: 'string',
            default: '',
            placeholder: 'Computer,<1H',
            description:
              'Comma-separated. Tags describe what the task REQUIRES to be doable (a device, connectivity, time), never what you currently have. Use List Context Tags for valid values.',
          },
        ],
      },

      // ── Complete ────────────────────────────────────────────────────────
      {
        displayName: 'Unreminder ID',
        name: 'unreminderId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { operation: ['completeUnreminder'] } },
        description: 'From List Unreminders',
      },

      // ── Suggest ─────────────────────────────────────────────────────────
      {
        displayName: 'Available Minutes',
        name: 'availableMinutes',
        type: 'number',
        default: 30,
        displayOptions: { show: { operation: ['suggestNextTask'] } },
        description: 'How much time there is right now',
      },

      // ── List ────────────────────────────────────────────────────────────
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1 },
        default: 50,
        displayOptions: { show: { operation: ['listUnreminders'] } },
        description: 'Max number of results to return',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        let toolName = '';
        let toolArgs: Record<string, unknown> = {};

        if (operation === 'createUnreminder') {
          const extra = this.getNodeParameter('additionalFields', i, {}) as Record<string, unknown>;
          const tags = typeof extra.tags === 'string' && extra.tags.trim()
            ? extra.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : undefined;
          toolName = 'create_unreminder';
          toolArgs = {
            title: this.getNodeParameter('title', i) as string,
            ...(extra.notes ? { notes: extra.notes } : {}),
            ...(extra.due_at ? { due_at: extra.due_at } : {}),
            ...(tags ? { tags } : {}),
            // Same input twice must not create two Unreminders. n8n retries
            // and re-runs are routine, so the key is derived from the item.
            idempotency_key: `n8n-${this.getExecutionId()}-${i}`,
          };
        } else if (operation === 'listUnreminders') {
          toolName = 'list_unreminders';
          toolArgs = { limit: this.getNodeParameter('limit', i, 20) as number };
        } else if (operation === 'completeUnreminder') {
          toolName = 'complete_unreminder';
          toolArgs = { id: this.getNodeParameter('unreminderId', i) as string };
        } else if (operation === 'suggestNextTask') {
          toolName = 'suggest_next_task';
          toolArgs = { available_minutes: this.getNodeParameter('availableMinutes', i, 30) as number };
        } else if (operation === 'listContextTags') {
          toolName = 'list_context_tags';
        } else {
          throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex: i });
        }

        const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'unRemindMeApi', {
          method: 'POST',
          url: ENDPOINT,
          body: { jsonrpc: '2.0', id: i + 1, method: 'tools/call', params: { name: toolName, arguments: toolArgs } },
          json: true,
        })) as { result?: { content?: Array<{ text?: string }>; isError?: boolean }; error?: { message?: string } };

        if (response.error) {
          throw new NodeOperationError(this.getNode(), response.error.message ?? 'UnRemind.me returned an error', { itemIndex: i });
        }

        const text = response.result?.content?.[0]?.text ?? '{}';
        let payload: IDataObject;
        try { payload = JSON.parse(text) as IDataObject; } catch { payload = { text }; }

        // A plan-quota refusal arrives as an actionable envelope, not an
        // error. Surfaced verbatim so the workflow author sees what to do
        // rather than a bare failure.
        if (payload.status === 'authorization_required') {
          throw new NodeOperationError(
            this.getNode(),
            (payload.humanScript as string) ?? 'This action needs a plan upgrade',
            { itemIndex: i, description: 'UnRemind.me plan limit reached' },
          );
        }

        out.push({ json: payload, pairedItem: { item: i } });
      } catch (error) {
        // Normalise first, then decide what to do with it. Errors raised
        // deliberately above already carry a useful message and itemIndex;
        // anything else is a raw transport or HTTP failure, which n8n can only
        // render usefully once wrapped. Doing this before the continueOnFail
        // branch means the item that gets written out carries the same
        // readable message the thrown error would have.
        const nodeError =
          error instanceof NodeOperationError || error instanceof NodeApiError
            ? error
            : new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });

        if (this.continueOnFail()) {
          out.push({ json: { error: nodeError.message }, pairedItem: { item: i } });
          continue;
        }

        throw nodeError;
      }
    }

    return [out];
  }
}
