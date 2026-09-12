import { MockMermailMcpServer } from './mock/mermail-mcp-server.js';

export class MermailClient {
  constructor(config = {}) {
    this.config = config;
    this.mode = config.environment === 'live' ? 'live' : 'mock';
    this.mockServer = new MockMermailMcpServer();
  }

  async callTool(name, args = {}) {
    if (this.mode === 'mock') {
      return this.mockServer.callTool(name, args);
    }

    // Live Streamable HTTP MCP call
    const endpoint = this.config.mcpUrl || 'https://console.mermail.app/mcp';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Mermail MCP call failed [${response.status}]: ${errText}`);
    }

    const payload = await response.json();
    if (payload.error) {
      throw new Error(`Mermail MCP Error: ${payload.error.message || JSON.stringify(payload.error)}`);
    }

    return payload.result;
  }
}
