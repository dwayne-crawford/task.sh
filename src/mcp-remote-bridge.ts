// Set the current working directory to the project root
// This is crucial for global installations to find node_modules and other relative paths
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assuming the script is in dist/ and node_modules is in the parent directory
process.chdir(path.join(__dirname, '..'));

console.error("MCP Bridge: Script started. CWD: " + process.cwd());

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Your remote server details
const REMOTE_SERVER = 'https://task-sh.onrender.com';
const API_KEY = process.env.API_KEY; // Read from environment variable

// Ensure API_KEY is provided
if (!API_KEY) {
  console.error('Error: API_KEY environment variable is not set.');
  console.error('Please set the API_KEY in your mcp.json or as an environment variable.');
  process.exit(1);
}

// Create MCP server instance that bridges to remote HTTP server
const server = new Server(
  {
    name: 'tasksh-remote-bridge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to make HTTP requests to remote server
async function makeRequest(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${REMOTE_SERVER}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  console.error(`[MCP Bridge] Making ${method} request to: ${url}`);
  console.error(`[MCP Bridge] Request options:`, options);

  try {
    const response = await fetch(url, options);
    console.error(`[MCP Bridge] Response status for ${url}: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MCP Bridge] Response error text for ${url}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[MCP Bridge] Error during fetch to ${url}:`, error);
    throw error; // Re-throw to be caught by the tool handler
  }
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_all_tasks',
        description: 'Get all tasks from remote server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_incomplete_tasks',
        description: 'Get incomplete tasks from remote server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_completed_tasks',
        description: 'Get completed tasks from remote server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_projects',
        description: 'Get project summary from remote server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_tasks',
        description: 'Search tasks on remote server',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'export_tasks',
        description: 'Export tasks from remote server',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['all', 'complete', 'incomplete'],
              description: 'Filter by task status',
            },
            format: {
              type: 'string',
              enum: ['json', 'markdown', 'csv'],
              description: 'Export format',
            },
          },
          required: ['status', 'format'],
        },
      },
    ],
  };
});

// Handle tool calls by forwarding to remote HTTP server
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let data;
    
    switch (name) {
      case 'get_all_tasks':
        data = await makeRequest('/context/tasks/all');
        break;
        
      case 'get_incomplete_tasks':
        data = await makeRequest('/context/tasks/incomplete');
        break;
        
      case 'get_completed_tasks':
        data = await makeRequest('/context/tasks/complete');
        break;
        
      case 'get_projects':
        data = await makeRequest('/context/projects');
        break;
        
      case 'search_tasks':
        if (!args || !args.query) {
          throw new Error('Search query is required');
        }
        data = await makeRequest(`/context/tasks/search?query=${encodeURIComponent(args.query as string)}`);
        break;
        
      case 'export_tasks':
        if (!args || !args.status || !args.format) {
          throw new Error('Status and format are required for export');
        }
        data = await makeRequest('/tools/export/status', 'POST', {
          status: args.status,
          format: args.format,
        });
        break;
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error('Error calling remote server:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  console.error('MCP Bridge: Starting main function...');
  const transport = new StdioServerTransport();
  console.error('MCP Bridge: Transport created.');
  await server.connect(transport);
  console.error('MCP Bridge: Server connected to transport. Bridge running.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start MCP bridge:', error);
    process.exit(1);
  });
}

export { server };