#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Your remote server details
const REMOTE_SERVER = 'https://task-sh.onrender.com';
const API_KEY = 'sk_user_jANxpVlKmtHJR2uFb8Ssth7ztEH0aFLcYZu2zeKbXlo';

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

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Task.sh Remote MCP Bridge running');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start MCP bridge:', error);
    process.exit(1);
  });
}

export { server };