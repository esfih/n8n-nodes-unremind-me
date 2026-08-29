import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class UnRemindMeApi implements ICredentialType {
  name = 'unRemindMeApi';
  displayName = 'UnRemind.me API';
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
