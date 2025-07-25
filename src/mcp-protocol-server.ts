#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { supabase } from './supabase.js';
import { CloudTaskList } from './cloud-task-list.js';
import { ApiKeyManager } from './api-key-manager.js';
import { convertExportData } from './api/utils/formatters.js';

// Create MCP server instance
const server = new Server(
  {
    name: 'tasksh-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to authenticate user via API key
async function authenticateUser(apiKey: string): Promise<string | null> {
  if (!apiKey || !apiKey.startsWith('sk_user_')) {
    return null;
  }

  const validation = await ApiKeyManager.validateApiKey(apiKey);
  return validation.valid ? (validation.userId || null) : null;
}

// Helper function to get task list for user
function getTaskListForUser(userId: string): CloudTaskList {
  return new CloudTaskList();
}

// Helper to convert internal task to MCP-compatible format
const toMCPTask = (task: any) => ({
  id: task.id,
  description: task.description,
  completed: task.completed,
  date: task.date,
  project: task.project || null,
  created_at: task.created_at || new Date().toISOString(),
  updated_at: task.updated_at || new Date().toISOString(),
  subtasks: task.subtasks || [],
  is_expanded: task.isExpanded || false,
  due_date: task.date,
  tags: task.project ? [task.project] : []
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_all_tasks',
        description: 'Get all tasks for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
              description: 'API key starting with sk_user_',
            },
          },
          required: ['api_key'],
        },
      },
      {
        name: 'get_incomplete_tasks',
        description: 'Get all incomplete/pending tasks',
        inputSchema: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
              description: 'API key starting with sk_user_',
            },
          },
          required: ['api_key'],
        },
      },
      {
        name: 'get_completed_tasks',
        description: 'Get all completed tasks',
        inputSchema: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
              description: 'API key starting with sk_user_',
            },
          },
          required: ['api_key'],
        },
      },
      {
        name: 'get_projects',
        description: 'Get project summary with completion statistics',
        inputSchema: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
              description: 'API key starting with sk_user_',
            },
          },
          required: ['api_key'],
        },
      },
      {
        name: 'search_tasks',
        description: 'Search tasks by query string',
        inputSchema: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
              description: 'API key starting with sk_user_',
            },
            query: {
              type: 'string',
              description: 'Search query string',
            },
          },
          required: ['api_key', 'query'],
        },
      },
      {
        name: 'export_tasks',
        description: 'Export tasks in various formats',
        inputSchema: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
              description: 'API key starting with sk_user_',
            },
            status: {
              type: 'string',
              enum: ['all', 'complete', 'incomplete'],
              description: 'Filter by task status',
            },
            format: {
              type: 'string',
              enum: ['json', 'csv', 'markdown', 'excel'],
              description: 'Export format',
            },
            project: {
              type: 'string',
              description: 'Filter by project name (optional)',
            },
          },
          required: ['api_key', 'status', 'format'],
        },
      },
      {
        name: 'get_productivity_stats',
        description: 'Get productivity statistics and insights',
        inputSchema: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
              description: 'API key starting with sk_user_',
            },
          },
          required: ['api_key'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Authenticate user
    if (!args || typeof args !== 'object') {
      return {
        content: [
          {
            type: 'text',
            text: 'Invalid arguments provided.',
          },
        ],
      };
    }

    const userId = await authenticateUser(args.api_key as string);
    if (!userId) {
      return {
        content: [
          {
            type: 'text',
            text: 'Authentication failed. Please provide a valid API key.',
          },
        ],
      };
    }

    const taskList = getTaskListForUser(userId);
    const allTasks = taskList.tasks.map(toMCPTask);

    switch (name) {
      case 'get_all_tasks': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                context_type: 'all_tasks',
                user_id: userId,
                timestamp: new Date().toISOString(),
                data: allTasks,
                summary: {
                  total_tasks: allTasks.length,
                  completed_tasks: allTasks.filter(t => t.completed).length,
                  pending_tasks: allTasks.filter(t => !t.completed).length,
                  projects: [...new Set(allTasks.map(t => t.project).filter(Boolean))]
                }
              }, null, 2),
            },
          ],
        };
      }

      case 'get_incomplete_tasks': {
        const incompleteTasks = allTasks.filter(task => !task.completed);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                context_type: 'incomplete_tasks',
                user_id: userId,
                timestamp: new Date().toISOString(),
                data: incompleteTasks,
                summary: {
                  total_incomplete: incompleteTasks.length,
                  projects: [...new Set(incompleteTasks.map(t => t.project).filter(Boolean))],
                }
              }, null, 2),
            },
          ],
        };
      }

      case 'get_completed_tasks': {
        const completedTasks = allTasks.filter(task => task.completed);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                context_type: 'completed_tasks',
                user_id: userId,
                timestamp: new Date().toISOString(),
                data: completedTasks,
                summary: {
                  total_completed: completedTasks.length,
                  projects: [...new Set(completedTasks.map(t => t.project).filter(Boolean))],
                }
              }, null, 2),
            },
          ],
        };
      }

      case 'get_projects': {
        // Group tasks by project
        const projectMap = new Map<string, { tasks: any[], completed: number }>();
        
        for (const task of allTasks) {
          const projectName = task.project || 'No Project';
          
          if (!projectMap.has(projectName)) {
            projectMap.set(projectName, { tasks: [], completed: 0 });
          }
          
          const project = projectMap.get(projectName)!;
          project.tasks.push(task);
          if (task.completed) {
            project.completed++;
          }
        }
        
        // Convert to projects summary
        const projects = Array.from(projectMap.entries()).map(([name, data]) => ({
          name: name === 'No Project' ? null : name,
          task_count: data.tasks.length,
          completed_count: data.completed,
          pending_count: data.tasks.length - data.completed,
          completion_rate: data.tasks.length > 0 ? data.completed / data.tasks.length : 0,
        })).filter(p => p.name !== null);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                context_type: 'projects_summary',
                user_id: userId,
                timestamp: new Date().toISOString(),
                data: projects,
                summary: {
                  total_projects: projects.length,
                  total_tasks: allTasks.length,
                }
              }, null, 2),
            },
          ],
        };
      }

      case 'search_tasks': {
        const query = args.query as string;
        const searchTerm = query.toLowerCase().trim();
        const matchingTasks = allTasks.filter(task => 
          task.description.toLowerCase().includes(searchTerm) ||
          (task.project && task.project.toLowerCase().includes(searchTerm))
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                context_type: 'search_results',
                user_id: userId,
                search_query: query,
                timestamp: new Date().toISOString(),
                data: matchingTasks,
                summary: {
                  total_matches: matchingTasks.length,
                  completed_matches: matchingTasks.filter(t => t.completed).length,
                  pending_matches: matchingTasks.filter(t => !t.completed).length,
                  projects_matched: [...new Set(matchingTasks.map(t => t.project).filter(Boolean))]
                }
              }, null, 2),
            },
          ],
        };
      }

      case 'export_tasks': {
        const { status, format, project } = args;
        let filteredTasks = [...allTasks];
        
        // Filter by status
        if (status === 'complete') {
          filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (status === 'incomplete') {
          filteredTasks = filteredTasks.filter(task => !task.completed);
        }
        
        // Filter by project if specified
        if (project) {
          filteredTasks = filteredTasks.filter(task => 
            task.project && task.project.toLowerCase() === (project as string).toLowerCase()
          );
        }
        
        const exportData = convertExportData(filteredTasks, format as string);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof exportData === 'string' ? exportData : JSON.stringify(exportData, null, 2),
            },
          ],
        };
      }

      case 'get_productivity_stats': {
        const completedTasks = allTasks.filter(t => t.completed);
        const incompleteTasks = allTasks.filter(t => !t.completed);
        
        // Calculate completion rate
        const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length * 100).toFixed(1) : '0';
        
        // Get recent activity (tasks from last 7 days)
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentTasks = allTasks.filter(task => new Date(task.date) >= sevenDaysAgo);
        
        // Project stats
        const projects = [...new Set(allTasks.map(t => t.project).filter(Boolean))];
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                context_type: 'user_statistics',
                user_id: userId,
                timestamp: new Date().toISOString(),
                data: {
                  overall: {
                    total_tasks: allTasks.length,
                    completed_tasks: completedTasks.length,
                    incomplete_tasks: incompleteTasks.length,
                    completion_rate: parseFloat(completionRate) / 100
                  },
                  recent_activity: {
                    last_7_days: recentTasks.length,
                    recent_completed: recentTasks.filter(t => t.completed).length,
                  },
                  projects: {
                    total_projects: projects.length,
                    project_names: projects,
                  },
                  productivity: {
                    tasks_with_subtasks: allTasks.filter(t => t.subtasks && t.subtasks.length > 0).length,
                    oldest_incomplete_task: incompleteTasks.length > 0 ? 
                      incompleteTasks.reduce((oldest, task) => 
                        new Date(task.date) < new Date(oldest.date) ? task : oldest
                      ) : null
                  }
                }
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    console.error('Error handling tool call:', error);
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
  console.error('Task.sh MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

export { server };