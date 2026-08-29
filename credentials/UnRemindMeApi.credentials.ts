import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  Icon,
  INodeProperties,
} from 'n8n-workflow';

export class UnRemindMeApi implements ICredentialType {
  name = 'unRemindMeApi';
  displayName = 'UnRemind.me API';

  // The credential carries its own copy of the icon: n8n resolves a `file:`
  // reference relative to the declaring file, so credentials/ cannot point at
  // the one in nodes/. Both themed variants are required.
  icon: Icon = { light: 'file:unremind.svg', dark: 'file:unremind.dark.svg' };

  // Do NOT run eslint --fix over this line. A rule that wanted a camelCase
  // docs SLUG (correct for a built-in node, whose docs live on n8n's own
  // site) once autofixed the VALUE 'https://unremind.me/mcp/' into
  // 'httpsUnremindMeMcp', silently turning a working link into a dead string.
  // Autofixers can corrupt data, not just formatting. The scan gate now
  // disables that rule for community credentials, so no suppression is needed
  // here — but the URL is still the thing to protect.
  documentationUrl = 'https://unremind.me/mcp/';

  properties: INodeProperties[] = [
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'Generate one in the UnRemind.me app under Settings → AI agents → MCP access. Each token is a separate agent with its own access rights and audit log, and can be revoked without affecting the others.',
    },
  ];

  // The server accepts the raw token under X-API-Key as well as
  // "Authorization: Bearer". X-API-Key is used here because it carries the
  // token verbatim, with no scheme prefix for n8n to get wrong.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: { headers: { 'X-API-Key': '={{$credentials.accessToken}}' } },
  };

  // Validates the credential the moment it is saved, so a bad token surfaces
  // in the credential dialog rather than as a confusing failure mid-workflow.
  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://unremind.me',
      url: '/mcp?src=n8n',
      method: 'POST',
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    },
  };
}
