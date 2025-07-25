import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { taskRoutes } from './routes/tasks.js';
import { authRoutes } from './routes/auth.js';
import { exportRoutes } from './routes/export.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint for documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'TASK.SH API',
    version: '1.0.0',
    description: 'RESTful API for TASK.SH todo management',
    endpoints: {
      auth: {
        base: '/api/auth',
        endpoints: [
          'POST /api/auth/signup - Register new user',
          'POST /api/auth/login - Login with email/password',
          'POST /api/auth/magic-link - Send magic link',
          'POST /api/auth/refresh - Refresh access token',
          'GET /api/auth/me - Get current user (requires auth)',
          'POST /api/auth/logout - Logout (requires auth)'
        ]
      },
      tasks: {
        base: '/api/tasks',
        note: 'All endpoints require Bearer token authentication',
        endpoints: [
          'GET /api/tasks - List tasks with filtering/pagination',
          'GET /api/tasks/projects - List all projects',
          'GET /api/tasks/:id - Get specific task',
          'POST /api/tasks - Create new task',
          'PUT /api/tasks/:id - Update task',
          'DELETE /api/tasks/:id - Delete task',
          'PUT /api/tasks/:id/toggle - Toggle task completion'
        ]
      },
      export: {
        base: '/api/export',
        note: 'All endpoints require Bearer token authentication',
        endpoints: [
          'POST /api/export - Initiate export job',
          'GET /api/export/:id - Check export status',
          'GET /api/export/:id/download - Download export file'
        ]
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      howToGetToken: [
        '1. POST /api/auth/signup or /api/auth/login',
        '2. Extract access_token from response.data.session',
        '3. Use as: Authorization: Bearer <access_token>'
      ]
    },
    docs: 'Coming soon with Fumadocs'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/export', authMiddleware, exportRoutes);

// API documentation redirect
// app.get('/docs', (req, res) => {
//   res.redirect('/api-docs');
// });

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 TASK.SH API Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

export default app;