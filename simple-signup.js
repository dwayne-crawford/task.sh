import { AuthService } from './dist/auth.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function simpleSignup() {
  console.log('🔐 Todo CLI - Simple Authentication');
  console.log('===================================');
  
  const authService = AuthService.getInstance();
  await authService.initialize();
  
  if (authService.isAuthenticated()) {
    console.log('✅ Already signed in as:', authService.getUserEmail());
    console.log('🚀 You can now use: node dist/cli.js');
    rl.close();
    return;
  }
  
  console.log('Note: If email confirmation is enabled, you may need to verify your email first.');
  console.log('');
  
  const action = await askQuestion('Choose: (1) Sign up new account, (2) Sign in existing, (3) Quit: ');
  
  if (action === '3') {
    console.log('👋 Goodbye!');
    rl.close();
    return;
  }
  
  const email = await askQuestion('Enter your email: ');
  const password = await askQuestion('Enter your password (min 6 chars): ');
  
  if (action === '1') {
    // Sign up
    console.log('\n🔄 Creating account...');
    const signupResult = await authService.signUp(email, password);
    
    if (signupResult.success) {
      console.log('✅ Account created!');
      
      // Try to sign in immediately (works if email confirmation is disabled)
      console.log('🔄 Attempting to sign in...');
      const signinResult = await authService.signIn(email, password);
      
      if (signinResult.success) {
        console.log('✅ Successfully signed in!');
        console.log('👤 User:', authService.getUserEmail());
        console.log('🚀 Your Todo CLI is ready! Try: node dist/cli.js add "My first task"');
      } else {
        console.log('⚠️ Account created but sign-in failed:', signinResult.error);
        console.log('💡 This usually means email confirmation is required.');
        console.log('📧 Check your email and manually verify, then run this script again with option 2.');
      }
    } else {
      console.log('❌ Account creation failed:', signupResult.error);
      
      if (signupResult.error?.includes('already registered')) {
        console.log('💡 Account already exists. Try signing in instead.');
      }
    }
    
  } else if (action === '2') {
    // Sign in
    console.log('\n🔄 Signing in...');
    const signinResult = await authService.signIn(email, password);
    
    if (signinResult.success) {
      console.log('✅ Successfully signed in!');
      console.log('👤 User:', authService.getUserEmail());
      console.log('🚀 Your Todo CLI is ready! Try: node dist/cli.js add "My first task"');
    } else {
      console.log('❌ Sign in failed:', signinResult.error);
      
      if (signinResult.error?.includes('Email not confirmed')) {
        console.log('📧 Please check your email and verify your account first.');
        console.log('🔗 Or disable email confirmation in Supabase settings.');
      }
    }
  }
  
  rl.close();
}

simpleSignup().catch(console.error);