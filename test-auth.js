import { AuthService } from './dist/auth.js';

async function testAuth() {
  console.log('Testing Supabase authentication...');
  
  const authService = AuthService.getInstance();
  await authService.initialize();
  
  console.log('Is authenticated:', authService.isAuthenticated());
  console.log('User email:', authService.getUserEmail());
  
  // Test connection by trying to sign up (will fail if user exists, but shows connection works)
  const result = await authService.signUp('test@example.com', 'testpassword123');
  console.log('Sign up test result:', result);
}

testAuth().catch(console.error);