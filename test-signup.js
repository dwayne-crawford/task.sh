import { AuthService } from './dist/auth.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function testSignup() {
  console.log('🔐 Todo CLI - Cloud Sync Setup');
  console.log('================================');
  
  const authService = AuthService.getInstance();
  await authService.initialize();
  
  if (authService.isAuthenticated()) {
    console.log('✅ Already signed in as:', authService.getUserEmail());
    rl.close();
    return;
  }
  
  const email = await askQuestion('Enter your email: ');
  const password = await askQuestion('Enter your password (minimum 6 characters): ');
  
  console.log('\n🔄 Creating account...');
  
  const result = await authService.signUp(email, password);
  
  if (result.success) {
    console.log('✅ Account created successfully!');
    console.log('📧 Please check your email to verify your account.');
    console.log('🔄 Attempting to sign in...');
    
    const signInResult = await authService.signIn(email, password);
    if (signInResult.success) {
      console.log('✅ Signed in successfully!');
      console.log('👤 User:', authService.getUserEmail());
      console.log('\n🚀 You can now use the todo CLI with cloud sync!');
      console.log('Try: node dist/cli.js add "My first cloud task"');
    } else {
      console.log('❌ Sign in failed:', signInResult.error);
      console.log('💡 You may need to verify your email first.');
    }
  } else {
    console.log('❌ Account creation failed:', result.error);
    
    if (result.error?.includes('already registered')) {
      console.log('\n🔄 Trying to sign in instead...');
      const signInResult = await authService.signIn(email, password);
      if (signInResult.success) {
        console.log('✅ Signed in successfully!');
        console.log('👤 User:', authService.getUserEmail());
      } else {
        console.log('❌ Sign in failed:', signInResult.error);
      }
    }
  }
  
  rl.close();
}

testSignup().catch(console.error);