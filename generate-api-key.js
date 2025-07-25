
import { ApiKeyManager } from './dist/api-key-manager.js';
import { supabase } from './dist/supabase.js';

async function generate() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Error: Please provide a User ID as an argument.');
    console.log('Usage: node generate-api-key.js <your-user-id>');
    process.exit(1);
  }

  console.log(`Generating API key for user: ${userId}...`);

  try {
    const { apiKey, error } = await ApiKeyManager.generateApiKey(userId);

    if (error) {
      throw new Error(error);
    }

    if (apiKey) {
      console.log('\n✅ API Key generated successfully!\n');
      console.log('Your API Key:');
      console.log(apiKey);
      console.log('\nAdd this to your mcp.json headers:');
      console.log(`"Authorization": "Bearer ${apiKey}"`);
    } else {
        throw new Error('API Key could not be generated.');
    }
  } catch (err) {
    console.error('\n❌ Error generating API key:', err.message);
    if (err.message.includes('foreign key constraint')) {
        console.error('\nHint: Make sure the User ID exists in the "auth.users" table in your Supabase database.');
    }
  } finally {
    // Ensure the script exits cleanly
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out from Supabase:', error.message);
    }
  }
}

generate();
