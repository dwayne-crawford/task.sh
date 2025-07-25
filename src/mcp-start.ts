#!/usr/bin/env node

import { app, PORT } from './mcp-server.js';

// Start the MCP server
app.listen(PORT, () => {
  console.log(`🤖 Task.sh MCP Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 Server info: http://localhost:${PORT}/`);
  console.log(`🔧 Context endpoints: http://localhost:${PORT}/context/*`);
  console.log(`⚡ Export tools: http://localhost:${PORT}/tools/*`);
  console.log('');
  console.log('🚀 MCP Server ready for LLM integration!');
  console.log('');
  console.log('Available capabilities:');
  console.log('  📊 Context Queries: Task lists, projects, stats');
  console.log('  📤 Export Tools: Multi-format exports');
  console.log('  🔐 Authentication: API key based');
  console.log('  🎯 LLM Ready: OpenAPI spec available');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 MCP Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 MCP Server shutting down gracefully...');
  process.exit(0);
});