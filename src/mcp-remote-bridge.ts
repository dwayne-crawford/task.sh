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
      {
        name: 'create_task',
        description: 'Create a new task',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Task description',
            },
            date: {
              type: 'string',
              description: 'Task date in YYYY-MM-DD format (optional, defaults to today)',
            },
            project: {
              type: 'string',
              description: 'Project name (optional, use #project format)',
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'ID of the task to update',
            },
            description: {
              type: 'string',
              description: 'New task description (optional)',
            },
            completed: {
              type: 'boolean',
              description: 'Task completion status (optional)',
            },
            date: {
              type: 'string',
              description: 'Task date in YYYY-MM-DD format (optional)',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'ID of the task to delete',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'toggle_task',
        description: 'Toggle task completion status',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'ID of the task to toggle',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'get_task',
        description: 'Get details of a specific task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'ID of the task to retrieve',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'list_tasks_filtered',
        description: 'List tasks with advanced filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            limit: {
              type: 'number',
              description: 'Number of tasks per page (default: 50, max: 100)',
            },
            completed: {
              type: 'boolean',
              description: 'Filter by completion status',
            },
            date: {
              type: 'string',
              description: 'Filter by specific date (YYYY-MM-DD)',
            },
            date_from: {
              type: 'string',
              description: 'Filter tasks from this date (YYYY-MM-DD)',
            },
            date_to: {
              type: 'string',
              description: 'Filter tasks to this date (YYYY-MM-DD)',
            },
            project: {
              type: 'string',
              description: 'Filter by project name',
            },
            search: {
              type: 'string',
              description: 'Search in task descriptions',
            },
            sort: {
              type: 'string',
              enum: ['date', 'created_at', 'updated_at', 'description'],
              description: 'Field to sort by (default: date)',
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order (default: desc)',
            },
          },
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
        
      case 'create_task':
        if (!args || !args.description) {
          throw new Error('Task description is required');
        }
        
        // Build task description with project tag if provided
        let taskDescription = args.description as string;
        if (args.project && !taskDescription.includes('#')) {
          const project = (args.project as string).startsWith('#') 
            ? args.project as string 
            : `#${args.project}`;
          taskDescription = `${taskDescription} ${project}`;
        }
        
        data = await makeRequest('/api/tasks', 'POST', {
          description: taskDescription,
          date: args.date || new Date().toISOString().split('T')[0], // Default to today
        });
        break;

      case 'update_task':
        if (!args || !args.task_id) {
          throw new Error('Task ID is required');
        }
        
        const updateData: any = {};
        if (args.description) updateData.description = args.description;
        if (args.completed !== undefined) updateData.completed = args.completed;
        if (args.date) updateData.date = args.date;
        
        data = await makeRequest(`/api/tasks/${args.task_id}`, 'PUT', updateData);
        break;

      case 'delete_task':
        if (!args || !args.task_id) {
          throw new Error('Task ID is required');
        }
        
        data = await makeRequest(`/api/tasks/${args.task_id}`, 'DELETE');
        break;

      case 'toggle_task':
        if (!args || !args.task_id) {
          throw new Error('Task ID is required');
        }
        
        data = await makeRequest(`/api/tasks/${args.task_id}/toggle`, 'PUT');
        break;

      case 'get_task':
        if (!args || !args.task_id) {
          throw new Error('Task ID is required');
        }
        
        data = await makeRequest(`/api/tasks/${args.task_id}`);
        break;

      case 'list_tasks_filtered':
        // Build query string for filtering
        const queryParams = new URLSearchParams();
        if (args?.page) queryParams.append('page', args.page.toString());
        if (args?.limit) queryParams.append('limit', args.limit.toString());
        if (args?.completed !== undefined && args.completed !== null) queryParams.append('completed', args.completed.toString());
        if (args?.date) queryParams.append('date', args.date.toString());
        if (args?.date_from) queryParams.append('date_from', args.date_from.toString());
        if (args?.date_to) queryParams.append('date_to', args.date_to.toString());
        if (args?.project) queryParams.append('project', args.project.toString());
        if (args?.search) queryParams.append('search', args.search.toString());
        if (args?.sort) queryParams.append('sort', args.sort.toString());
        if (args?.order) queryParams.append('order', args.order.toString());
        
        const queryString = queryParams.toString();
        const endpoint = queryString ? `/api/tasks?${queryString}` : '/api/tasks';
        data = await makeRequest(endpoint);
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