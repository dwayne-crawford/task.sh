import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { supabase } from './supabase.js';
import { CloudTaskList } from './cloud-task-list.js';
import { convertExportData } from './api/utils/formatters.js';
import { ApiKeyManager } from './api-key-manager.js';

// MCP Server for Task.sh - Provides context and export tools for LLMs
const app: Express = express();
const PORT = process.env.MCP_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced authentication middleware for API keys
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    api_key: string;
  };
}

const apiKeyAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'API key required',
        code: 'MCP_UNAUTHORIZED',
        message: 'Please provide a valid API key in the Authorization header'
      });
      return;
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate API key using ApiKeyManager
    const validation = await ApiKeyManager.validateApiKey(apiKey);

    if (!validation.valid || !validation.userId) {
      res.status(401).json({
        error: 'Invalid API key',
        code: 'MCP_INVALID_KEY',
        message: validation.error || 'The provided API key is invalid or expired'
      });
      return;
    }

    // For API key auth, we don't need to fetch user email since we have the user ID
    // The API key system handles the user validation
    req.user = {
      id: validation.userId,
      email: 'api-user', // API key users don't need email for MCP context
      api_key: apiKey
    };

    next();
  } catch (error) {
    console.error('MCP Auth error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'MCP_AUTH_ERROR',
      message: 'An error occurred during authentication'
    });
  }
};

// Helper to get task list for authenticated user
const getTaskListForUser = (userId: string): CloudTaskList => {
  // Initialize with user-specific context
  return new CloudTaskList();
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'Task.sh MCP Server',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// MCP Server Info endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Task.sh MCP Server',
    description: 'Model Context Protocol server for Task.sh - Provides task context and export tools for LLMs',
    version: '1.0.0',
    capabilities: {
      context_queries: [
        'GET /context/tasks/all',
        'GET /context/tasks/incomplete',
        'GET /context/tasks/complete',
        'GET /context/tasks/due-today',
        'GET /context/tasks/search',
        'GET /context/tasks/:id',
        'GET /context/projects',
        'GET /context/stats'
      ],
      export_tools: [
        'POST /tools/export/project',
        'POST /tools/export/status',
        'POST /tools/export/date-range',
        'POST /tools/export/bulk'
      ],
      formats: ['json', 'csv', 'markdown', 'excel'],
      authentication: 'API Key (Bearer token)'
    },
    endpoints: {
      health: '/health',
      openapi: '/openapi.json',
      context: '/context/*',
      tools: '/tools/*'
    }
  });
});

// Import routes and OpenAPI spec
import { contextRoutes } from './mcp/context-routes.js';
import { toolsRoutes } from './mcp/tools-routes.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// OpenAPI specification endpoint
app.get('/openapi.json', (req: Request, res: Response) => {
  try {
    const openApiSpec = JSON.parse(readFileSync(join(__dirname, 'mcp', 'openapi.json'), 'utf8'));
    res.json(openApiSpec);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load OpenAPI specification',
      code: 'MCP_OPENAPI_ERROR',
      message: 'Unable to retrieve API documentation'
    });
  }
});

// Apply authentication middleware to protected routes
app.use('/context', apiKeyAuth, contextRoutes);
app.use('/tools', apiKeyAuth, toolsRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('MCP Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'MCP_INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'MCP_NOT_FOUND',
    message: `The endpoint ${req.method} ${req.originalUrl} was not found`,
    available_endpoints: {
      info: 'GET /',
      health: 'GET /health',
      openapi: 'GET /openapi.json',
      context: 'GET /context/*',
      tools: 'POST /tools/*'
    }
  });
});

export { app, PORT, apiKeyAuth, getTaskListForUser, AuthenticatedRequest };