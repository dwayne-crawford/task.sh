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

async function magicLinkAuth() {
  console.log('🔗 Todo CLI - Magic Link Authentication');
  console.log('======================================');
  
  const authService = AuthService.getInstance();
  await authService.initialize();
  
  if (authService.isAuthenticated()) {
    console.log('✅ Already signed in as:', authService.getUserEmail());
    console.log('🚀 You can now use: node dist/cli.js');
    rl.close();
    return;
  }
  
  console.log('Magic links are secure, passwordless authentication links sent to your email.');
  console.log('');
  
  const action = await askQuestion('Choose: (1) Sign in with magic link, (2) Traditional sign up, (3) Traditional sign in, (4) Quit: ');
  
  if (action === '4') {
    console.log('👋 Goodbye!');
    rl.close();
    return;
  }
  
  const email = await askQuestion('Enter your email: ');
  
  if (action === '1') {
    // Magic Link Sign In
    console.log('\n🔗 Sending magic link...');
    const result = await authService.signInWithMagicLink(email);
    
    if (result.success) {
      console.log('✅ Magic link sent successfully!');
      console.log('📧 Check your email for the magic link.');
      console.log('🔗 Click the link to complete authentication.');
      console.log('');
      console.log('💡 Make sure your verification server is running:');
      console.log('   node verify-email.js');
      console.log('');
      console.log('⏳ The magic link will redirect to your local server for completion.');
    } else {
      console.log('❌ Failed to send magic link:', result.error);
    }
    
  } else if (action === '2') {
    // Traditional Sign Up
    const password = await askQuestion('Enter your password (min 6 chars): ');
    
    console.log('\n🔄 Creating account...');
    const signupResult = await authService.signUp(email, password);
    
    if (signupResult.success) {
      console.log('✅ Account created!');
      
      // Try to sign in immediately
      console.log('🔄 Attempting to sign in...');
      const signinResult = await authService.signIn(email, password);
      
      if (signinResult.success) {
        console.log('✅ Successfully signed in!');
        console.log('👤 User:', authService.getUserEmail());
        console.log('🚀 Your Todo CLI is ready! Try: node dist/cli.js add "My first task"');
      } else {
        console.log('⚠️ Account created but sign-in failed:', signinResult.error);
        console.log('💡 Try using option 1 (magic link) instead.');
      }
    } else {
      console.log('❌ Account creation failed:', signupResult.error);
    }
    
  } else if (action === '3') {
    // Traditional Sign In
    const password = await askQuestion('Enter your password: ');
    
    console.log('\n🔄 Signing in...');
    const signinResult = await authService.signIn(email, password);
    
    if (signinResult.success) {
      console.log('✅ Successfully signed in!');
      console.log('👤 User:', authService.getUserEmail());
      console.log('🚀 Your Todo CLI is ready! Try: node dist/cli.js add "My first task"');
    } else {
      console.log('❌ Sign in failed:', signinResult.error);
      console.log('💡 Try using option 1 (magic link) for passwordless authentication.');
    }
  }
  
  rl.close();
}

magicLinkAuth().catch(console.error);