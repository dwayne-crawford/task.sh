import http from 'http';
import { AuthService } from './dist/auth.js';

const PORT = 1337;
const HOST = '127.0.0.1';

console.log('🔗 Todo CLI - Authentication Handler');
console.log('====================================');
console.log('Starting local server to handle magic links and email verification...');
console.log(`✅ Server running at: http://localhost:${PORT}`);
console.log('📧 Click the magic link or verification link in your email now.');
console.log('⏹️  Press Ctrl+C to stop when done.');

const server = http.createServer(async (req, res) => {
  console.log(`📥 Incoming request: ${req.method} ${req.url}`);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  console.log(`🔍 Parsed URL - pathname: ${url.pathname}`);
  console.log(`🔍 Search params:`, Array.from(url.searchParams.entries()));
  
  if (url.pathname === '/auth/callback') {
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');
    
    if (accessToken) {
      console.log('✅ Email verification successful!');
      
      // Initialize auth service and check session
      const authService = AuthService.getInstance();
      await authService.initialize();
      
      if (authService.isAuthenticated()) {
        console.log('👤 Signed in as:', authService.getUserEmail());
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>Email Verified</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: green;">✅ Email Verified Successfully!</h1>
              <p>Your Todo CLI account has been verified.</p>
              <p><strong>You can now close this window and return to your terminal.</strong></p>
              <script>setTimeout(() => window.close(), 3000);</script>
            </body>
          </html>
        `);
        
        console.log('🚀 Your Todo CLI is now ready for cloud sync!');
        console.log('💡 You can stop this server (Ctrl+C) and use: node dist/cli.js');
        
      } else {
        console.log('❌ Authentication failed after email verification.');
      }
    } else {
      console.log('❌ No access token found in callback.');
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Verification Failed</h1><p>No access token found.</p>');
    }
  } else if (url.pathname === '/') {
    // Root path - handle magic link callback (tokens are in URL fragments, not query params)
    // We need to serve a page that can process the URL fragment with JavaScript
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Todo CLI Authentication</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1>🔗 Todo CLI - Processing Authentication...</h1>
          <div id="status">
            <p>⏳ Processing magic link...</p>
          </div>
          
          <script>
            async function processAuth() {
              const statusDiv = document.getElementById('status');
              
              // Extract tokens from URL fragment
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash);
              
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              const type = params.get('type');
              
              console.log('URL Fragment:', hash);
              console.log('Access Token:', accessToken);
              console.log('Type:', type);
              
              if (accessToken) {
                statusDiv.innerHTML = \`
                  <h2 style="color: green;">✅ Authentication Successful!</h2>
                  <p>Access token received and processed.</p>
                  <p><strong>You can now close this window and return to your terminal.</strong></p>
                  <p>Your Todo CLI is ready for cloud sync!</p>
                \`;
                
                // Send success message to server for logging
                try {
                  await fetch('/auth/success', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      success: true, 
                      accessToken: accessToken.substring(0, 20) + '...',
                      type: type || 'magic_link'
                    })
                  });
                } catch (e) {
                  console.log('Could not notify server:', e);
                }
                
                // Auto-close after 5 seconds
                setTimeout(() => {
                  window.close();
                }, 5000);
                
              } else {
                // Show debug information
                statusDiv.innerHTML = \`
                  <h2 style="color: orange;">⚠️ No Authentication Token Found</h2>
                  <p><strong>Debug Info:</strong></p>
                  <p>Full URL: \${window.location.href}</p>
                  <p>Hash: \${window.location.hash}</p>
                  <p>Hash length: \${window.location.hash.length}</p>
                  <p>Parsed params: \${hash}</p>
                  <hr>
                  <p><strong>Status:</strong> Ready for magic link</p>
                  <p><strong>Callback URL:</strong> http://localhost:${PORT}</p>
                  <p>Check your email and click the magic link!</p>
                \`;
              }
            }
            
            // Process authentication when page loads
            processAuth();
          </script>
        </body>
      </html>
    `);
  } else if (url.pathname === '/auth/success' && req.method === 'POST') {
    // Handle success notification from frontend
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('🎉 Magic Link Authentication Successful!');
        console.log('📧 Email authenticated via magic link');
        console.log('🔑 Token received:', data.accessToken);
        console.log('📋 Type:', data.type);
        
        // Check authentication status
        const authService = AuthService.getInstance();
        await authService.initialize();
        
        if (authService.isAuthenticated()) {
          console.log('👤 Signed in as:', authService.getUserEmail());
          console.log('🚀 Your Todo CLI is now ready for cloud sync!');
          console.log('💡 You can stop this server (Ctrl+C) and use: node dist/cli.js');
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ Error processing success notification:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    console.log(`❌ 404 - Unknown path: ${url.pathname}`);
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>404 - Not Found</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1>404 - Not Found</h1>
          <p>Path: ${url.pathname}</p>
          <p>Expected: /auth/callback or /</p>
          <p><a href="/">← Back to main page</a></p>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('🔄 Waiting for email verification...');
  console.log(`🌐 Server accessible at: http://${HOST}:${PORT}`);
  console.log(`🔗 Callback URL: http://${HOST}:${PORT}/auth/callback`);
});

// Add error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Try killing any existing processes on port 3000:');
    console.log('   lsof -ti:3000 | xargs kill -9');
  } else {
    console.error('❌ Server error:', err);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down verification server...');
  server.close();
  process.exit(0);
});