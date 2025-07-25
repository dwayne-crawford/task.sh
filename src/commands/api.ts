import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { supabase } from '../supabase.js';
import { ApiKeyManager } from '../api-key-manager.js';

export const apiCommand = {
  command: 'api',
  describe: 'Manage API keys for MCP server integration',
  builder: (yargs: any) => {
    return yargs
      .command({
        command: 'generate-key [name]',
        describe: 'Generate a new API key for MCP server access',
        builder: (yargs: any) => {
          return yargs
            .positional('name', {
              describe: 'Name for the API key',
              type: 'string',
              default: 'Default MCP Key'
            })
            .option('expires', {
              alias: 'e',
              describe: 'Key expiration period',
              choices: ['30', '90', '365', 'never'],
              default: '90',
              type: 'string'
            })
            .option('replace', {
              alias: 'r',
              describe: 'Replace existing key with same name',
              type: 'boolean',
              default: true
            });
        },
        handler: async (argv: any) => {
          await generateApiKey(argv.name, argv.expires, argv.replace);
        }
      })
      .command({
        command: 'list-keys',
        describe: 'List all active API keys',
        handler: async () => {
          await listApiKeys();
        }
      })
      .command({
        command: 'revoke-key [keyId]',
        describe: 'Revoke an API key',
        builder: (yargs: any) => {
          return yargs
            .positional('keyId', {
              describe: 'ID of the API key to revoke',
              type: 'string',
              demandOption: true
            });
        },
        handler: async (argv: any) => {
          await revokeApiKey(argv.keyId);
        }
      })
      .command({
        command: 'info',
        describe: 'Show information about MCP server integration',
        handler: async () => {
          await showApiInfo();
        }
      })
      .demandCommand(1, 'Please specify a subcommand')
      .help();
  },
  handler: (argv: any) => {
    // Show help if no subcommand provided
    console.log(chalk.yellow('Use --help to see available API management commands'));
  }
};

async function ensureAuthenticated(): Promise<string | null> {
  if (!supabase) {
    console.log(chalk.red('❌ Error: Supabase not configured'));
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.log(chalk.red('❌ Error: Not authenticated'));
    console.log(chalk.gray('Please run the application and log in first'));
    return null;
  }

  return user.id;
}

async function generateApiKey(name: string, expires: string, replace: boolean): Promise<void> {
  const userId = await ensureAuthenticated();
  if (!userId) return;

  console.log(chalk.blue('🔑 Generating API key...'));
  console.log(chalk.gray(`Name: ${name}`));
  console.log(chalk.gray(`Expires: ${expires === 'never' ? 'Never' : `${expires} days`}`));

  // Convert expires to days
  let expirationDays: number | undefined;
  if (expires === 'never') {
    expirationDays = undefined;
  } else {
    expirationDays = parseInt(expires);
  }

  const result = await ApiKeyManager.createApiKey(userId, {
    name,
    expirationDays
  });

  if (!result.success) {
    console.log(chalk.red(`❌ Failed to generate API key: ${result.error}`));
    return;
  }

  console.log(chalk.green('\n✅ API key generated successfully!'));
  console.log(chalk.yellow('\n🔐 Your API key (save this securely):'));
  console.log(chalk.white.bold(`${result.fullKey}`));
  
  console.log(chalk.yellow('\n📋 Key details:'));
  console.log(chalk.gray(`ID: ${result.apiKey!.id}`));
  console.log(chalk.gray(`Name: ${result.apiKey!.name}`));
  console.log(chalk.gray(`Prefix: ${result.apiKey!.key_prefix}`));
  console.log(chalk.gray(`Expires: ${ApiKeyManager.formatExpiration(result.apiKey!.expires_at)}`));
  console.log(chalk.gray(`Created: ${new Date(result.apiKey!.created_at).toLocaleDateString()}`));

  console.log(chalk.blue('\n🚀 Getting started with MCP server:'));
  console.log(chalk.gray('1. Start the MCP server: npm run dev:mcp'));
  console.log(chalk.gray('2. Copy this API key and use it in your LLM tools:'));
  console.log(chalk.white(`   Authorization: Bearer ${result.fullKey}`));
  
  console.log(chalk.yellow('\n⚠️  Important:'));
  console.log(chalk.gray('- Copy this API key now - it will not be shown again'));
  console.log(chalk.gray('- Keep this API key secure and private'));
  console.log(chalk.gray('- Generate a new key if this one is compromised'));
  
  console.log(chalk.blue('\n💡 Pro tip:'));
  console.log(chalk.gray('- You can select and copy the key above'));
  console.log(chalk.gray('- Or use the interactive UI (/api) for easier key management'));
}

async function listApiKeys(): Promise<void> {
  const userId = await ensureAuthenticated();
  if (!userId) return;

  console.log(chalk.blue('🔑 Fetching API keys...'));

  const result = await ApiKeyManager.listApiKeys(userId);

  if (!result.success) {
    console.log(chalk.red(`❌ Failed to fetch API keys: ${result.error}`));
    return;
  }

  const apiKeys = result.apiKeys || [];

  if (apiKeys.length === 0) {
    console.log(chalk.yellow('📭 No API keys found'));
    console.log(chalk.gray('Generate one with: todo api generate-key'));
    return;
  }

  console.log(chalk.green(`\n✅ Found ${apiKeys.length} active API key(s):\n`));

  apiKeys.forEach((key, index) => {
    console.log(chalk.white(`${index + 1}. ${key.name}`));
    console.log(chalk.gray(`   ID: ${key.id}`));
    console.log(chalk.gray(`   Prefix: ${key.key_prefix}`));
    console.log(chalk.gray(`   Expires: ${ApiKeyManager.formatExpiration(key.expires_at)}`));
    console.log(chalk.gray(`   Created: ${new Date(key.created_at).toLocaleDateString()}`));
    
    if (key.last_used_at) {
      console.log(chalk.gray(`   Last used: ${new Date(key.last_used_at).toLocaleDateString()}`));
    } else {
      console.log(chalk.gray('   Last used: Never'));
    }
    
    // Check if expiring soon
    if (key.expires_at) {
      const expiresAt = new Date(key.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        console.log(chalk.yellow(`   ⚠️  Expires in ${daysUntilExpiry} day(s)`));
      } else if (daysUntilExpiry <= 0) {
        console.log(chalk.red('   ❌ Expired'));
      }
    }
    
    console.log(); // Empty line
  });

  console.log(chalk.blue('🛠️  Management commands:'));
  console.log(chalk.gray('- Generate new key: todo api generate-key [name]'));
  console.log(chalk.gray('- Revoke key: todo api revoke-key [keyId]'));
}

async function revokeApiKey(keyId: string): Promise<void> {
  const userId = await ensureAuthenticated();
  if (!userId) return;

  console.log(chalk.yellow(`🗑️  Revoking API key: ${keyId}`));

  const result = await ApiKeyManager.revokeApiKey(userId, keyId);

  if (!result.success) {
    console.log(chalk.red(`❌ Failed to revoke API key: ${result.error}`));
    return;
  }

  console.log(chalk.green('✅ API key revoked successfully'));
  console.log(chalk.gray(`Key "${result.apiKey!.name}" is no longer active`));
  console.log(chalk.yellow('\n⚠️  Any applications using this key will lose access'));
  console.log(chalk.gray('Generate a new key if you need continued access'));
}

async function showApiInfo(): Promise<void> {
  console.log(chalk.blue('🤖 Task.sh MCP Server Integration\n'));
  
  console.log(chalk.white('📖 What is MCP?'));
  console.log(chalk.gray('The Model Context Protocol (MCP) allows AI assistants like'));
  console.log(chalk.gray('Claude Code, Cursor, and others to access your task data.\n'));
  
  console.log(chalk.white('🚀 Quick Setup:'));
  console.log(chalk.gray('1. Generate an API key: todo api generate-key'));
  console.log(chalk.gray('2. Start MCP server: npm run dev:mcp'));
  console.log(chalk.gray('3. Configure your AI assistant with the API key\n'));
  
  console.log(chalk.white('🔧 Server Details:'));
  console.log(chalk.gray('- URL: http://localhost:3002'));
  console.log(chalk.gray('- Health check: http://localhost:3002/health'));
  console.log(chalk.gray('- OpenAPI spec: http://localhost:3002/openapi.json\n'));
  
  console.log(chalk.white('🤝 Supported AI Platforms:'));
  console.log(chalk.gray('- Claude Code (Anthropic)'));
  console.log(chalk.gray('- Cursor IDE'));
  console.log(chalk.gray('- GitHub Copilot'));
  console.log(chalk.gray('- OpenAI ChatGPT'));
  console.log(chalk.gray('- Any HTTP-compatible AI tool\n'));
  
  console.log(chalk.white('📚 Documentation:'));
  console.log(chalk.gray('- Setup guide: docs/mcp/SETUP.md'));
  console.log(chalk.gray('- Platform integration: docs/mcp/PLATFORM_INTEGRATIONS.md'));
  console.log(chalk.gray('- API reference: docs/mcp/API_REFERENCE.md\n'));
  
  console.log(chalk.yellow('💡 Need help?'));
  console.log(chalk.gray('- List keys: todo api list-keys'));
  console.log(chalk.gray('- Generate key: todo api generate-key [name] --expires [30|90|365|never]'));
  console.log(chalk.gray('- Revoke key: todo api revoke-key [keyId]'));
}