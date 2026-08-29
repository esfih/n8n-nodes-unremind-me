import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class UnRemindMeApi implements ICredentialType {
  name = 'unRemindMeApi';
  displayName = 'UnRemind.me API';
  // Two lint rules contradict here and only one can be satisfied:
  //   cred-class-field-documentation-url-miscased  wants camelCase (a slug
  //     that n8n resolves against ITS OWN docs — right for a built-in node)
  //   cred-class-field-documentation-url-not-http-url  wants a real URL
  // A community node's docs are not on n8n's site, so the URL is correct and
  // the slug rule is the one that does not apply. Suppressed deliberately.
  //
  // Do NOT run --fix on this line: it rewrote the VALUE
  // 'https://unremind.me/mcp/' into 'httpsUnremindMeMcp', silently turning a
  // working link into a dead string. Autofixers can corrupt data, not just
  // formatting.
  // eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
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
