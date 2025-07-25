import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import clipboardy from 'clipboardy';
import { exec } from 'child_process';
import { ApiKeyManager, ApiKey } from '../api-key-manager.js';
import { AuthService } from '../auth.js';

interface ApiScreenProps {
  onClose: () => void;
}

type ViewState = 'list' | 'generate' | 'confirm-revoke';
type ExpirationOption = '30' | '90' | '365' | 'never';

export function ApiScreen({ onClose }: ApiScreenProps) {
  const [viewState, setViewState] = useState<ViewState>('list');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Generate key state
  const [keyName, setKeyName] = useState('');
  const [selectedExpiration, setSelectedExpiration] = useState<ExpirationOption>('90');
  const [isInputtingName, setIsInputtingName] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ fullKey: string; apiKey: ApiKey } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  
  // Revoke key state
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

  const expirationOptions: { value: ExpirationOption; label: string; description: string }[] = [
    { value: '30', label: '30 days', description: 'Good for testing and short-term use' },
    { value: '90', label: '90 days', description: 'Recommended for temporary projects' },
    { value: '365', label: '1 year', description: 'Long-term integration use' },
    { value: 'never', label: 'Never', description: 'Permanent key (not recommended)' }
  ];

  const loadApiKeys = async () => {
    setLoading(true);
    setError(null);
    
    const authService = AuthService.getInstance();
    const userId = authService.getUserId();
    
    if (!userId) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const result = await ApiKeyManager.listApiKeys(userId);
    if (result.success) {
      setApiKeys(result.apiKeys || []);
    } else {
      setError(result.error || 'Failed to load API keys');
    }
    
    setLoading(false);
  };

  const generateApiKey = async () => {
    if (!keyName.trim()) {
      setError('Key name is required');
      return;
    }

    setLoading(true);
    setError(null);
    
    const authService = AuthService.getInstance();
    const userId = authService.getUserId();
    
    if (!userId) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const expirationDays = selectedExpiration === 'never' ? undefined : parseInt(selectedExpiration);
    const result = await ApiKeyManager.createApiKey(userId, {
      name: keyName.trim(),
      expirationDays
    });

    if (result.success && result.fullKey && result.apiKey) {
      setGeneratedKey({ fullKey: result.fullKey, apiKey: result.apiKey });
      setKeyName('');
      setSelectedExpiration('90');
      setIsInputtingName(false);
      setKeyCopied(false); // Reset copy state
      await loadApiKeys(); // Refresh the list
    } else {
      setError(result.error || 'Failed to generate API key');
    }
    
    setLoading(false);
  };

  const revokeApiKey = async (keyId: string) => {
    setLoading(true);
    setError(null);
    
    const authService = AuthService.getInstance();
    const userId = authService.getUserId();
    
    if (!userId) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const result = await ApiKeyManager.revokeApiKey(userId, keyId);
    if (result.success) {
      await loadApiKeys(); // Refresh the list
      setViewState('list');
      setKeyToRevoke(null);
    } else {
      setError(result.error || 'Failed to revoke API key');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  useInput((input: string, key: any) => {
    if (key.escape) {
      if (viewState === 'generate' || viewState === 'confirm-revoke') {
        setViewState('list');
        setError(null);
        setGeneratedKey(null);
        setKeyToRevoke(null);
        setIsInputtingName(false);
        return;
      }
      onClose();
      return;
    }

    if (isInputtingName) {
      // Let TextInput handle the input
      return;
    }

    if (generatedKey) {
      if (input === 'c' || input === 'C') {
        // Copy the API key to clipboard
        // Try clipboardy first
        try {
          clipboardy.writeSync(generatedKey.fullKey);
          setKeyCopied(true);
          setError(null);
        } catch (clipboardyError) {
          
          // Fallback to platform-specific clipboard commands
          const platform = process.platform;
          let command: string;
          
          if (platform === 'darwin') {
            command = `echo "${generatedKey.fullKey}" | pbcopy`;
          } else if (platform === 'linux') {
            command = `echo "${generatedKey.fullKey}" | xclip -selection clipboard`;
          } else if (platform === 'win32') {
            command = `echo ${generatedKey.fullKey} | clip`;
          } else {
            setError('Clipboard not supported on this platform. Please select and copy the key manually.');
            setKeyCopied(false);
            return;
          }
          
          exec(command, (error) => {
            if (error) {
              setError('Failed to copy to clipboard. Please select and copy the key manually.');
              setKeyCopied(false);
            } else {
              setKeyCopied(true);
              setError(null);
            }
          });
        }
        return;
      }
      // Any other key dismisses the generated key display
      setGeneratedKey(null);
      setKeyCopied(false);
      return;
    }

    if (viewState === 'list') {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      } else if (key.downArrow && selectedIndex < apiKeys.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      } else if (input === 'g') {
        setViewState('generate');
        setError(null);
      } else if (input === 'r' || key.delete) {
        if (apiKeys.length > 0 && selectedIndex < apiKeys.length) {
          setKeyToRevoke(apiKeys[selectedIndex]);
          setViewState('confirm-revoke');
        }
      } else if (input === 'R') {
        loadApiKeys();
      }
    } else if (viewState === 'generate') {
      if (key.upArrow) {
        const currentIndex = expirationOptions.findIndex(opt => opt.value === selectedExpiration);
        if (currentIndex > 0) {
          setSelectedExpiration(expirationOptions[currentIndex - 1].value);
        }
      } else if (key.downArrow) {
        const currentIndex = expirationOptions.findIndex(opt => opt.value === selectedExpiration);
        if (currentIndex < expirationOptions.length - 1) {
          setSelectedExpiration(expirationOptions[currentIndex + 1].value);
        }
      } else if (input === 'n') {
        setIsInputtingName(true);
      } else if (key.return) {
        if (keyName.trim()) {
          generateApiKey();
        } else {
          setIsInputtingName(true);
        }
      }
    } else if (viewState === 'confirm-revoke') {
      if (input === 'y' || input === 'Y') {
        if (keyToRevoke) {
          revokeApiKey(keyToRevoke.id);
        }
      } else if (input === 'n' || input === 'N') {
        setViewState('list');
        setKeyToRevoke(null);
      }
    }
  });

  const renderKeyList = () => (
    <Box flexDirection="column">
      <Text bold color="blue">🔑 API Key Management</Text>
      <Text color="gray">Manage API keys for MCP server integration</Text>
      <Box marginTop={1} />

      {loading ? (
        <Text color="yellow">Loading API keys...</Text>
      ) : error ? (
        <Text color="red">❌ Error: {error}</Text>
      ) : apiKeys.length === 0 ? (
        <Box flexDirection="column">
          <Text color="yellow">📭 No API keys found</Text>
          <Text color="gray">Generate your first API key to start using the MCP server</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color="green">✅ Found {apiKeys.length} active API key(s):</Text>
          <Box marginTop={1} />
          
          {apiKeys.map((key, index) => (
            <Box key={key.id} marginBottom={1}>
              <Text color={index === selectedIndex ? 'yellow' : undefined}>
                {index === selectedIndex ? '> ' : '  '}
                <Text bold>{key.name}</Text>
                <Text color="gray"> - {key.key_prefix}</Text>
              </Text>
              <Text color="gray">
                {'  '}Expires: {ApiKeyManager.formatExpiration(key.expires_at)}
                {' • '}Created: {new Date(key.created_at).toLocaleDateString()}
              </Text>
              {key.last_used_at && (
                <Text color="gray">
                  {'  '}Last used: {new Date(key.last_used_at).toLocaleDateString()}
                </Text>
              )}
              {/* Check if expiring soon */}
              {key.expires_at && (() => {
                const expiresAt = new Date(key.expires_at);
                const now = new Date();
                const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                  return <Text color="yellow">{'  '}⚠️  Expires in {daysUntilExpiry} day(s)</Text>;
                } else if (daysUntilExpiry <= 0) {
                  return <Text color="red">{'  '}❌ Expired</Text>;
                }
                return null;
              })()}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={2} flexDirection="column">
        <Text color="blue" bold>Commands:</Text>
        <Text color="gray">g - Generate new API key</Text>
        {apiKeys.length > 0 && (
          <>
            <Text color="gray">r/Delete - Revoke selected key</Text>
            <Text color="gray">↑/↓ - Navigate keys</Text>
          </>
        )}
        <Text color="gray">R - Refresh list</Text>
        <Text color="gray">Esc - Close</Text>
      </Box>
    </Box>
  );

  const renderGenerateForm = () => (
    <Box flexDirection="column">
      <Text bold color="blue">🔑 Generate New API Key</Text>
      <Box marginTop={1} />

      <Box flexDirection="column" marginBottom={2}>
        <Text bold>Key Name:</Text>
        {isInputtingName ? (
          <Box>
            <Text>Name: </Text>
            <TextInput
              value={keyName}
              onChange={setKeyName}
              onSubmit={() => {
                setIsInputtingName(false);
                if (keyName.trim()) {
                  generateApiKey();
                }
              }}
              placeholder="Enter a name for this API key..."
            />
          </Box>
        ) : (
          <Text color={keyName ? 'white' : 'gray'}>
            {keyName || 'Press "n" to enter name'}
          </Text>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text bold>Expiration:</Text>
        {expirationOptions.map((option, index) => (
          <Text key={option.value} color={option.value === selectedExpiration ? 'yellow' : 'gray'}>
            {option.value === selectedExpiration ? '> ' : '  '}
            {option.label} - {option.description}
          </Text>
        ))}
      </Box>

      {loading ? (
        <Text color="yellow">Generating API key...</Text>
      ) : error ? (
        <Text color="red">❌ Error: {error}</Text>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <Text color="blue" bold>Commands:</Text>
        <Text color="gray">n - Enter/edit key name</Text>
        <Text color="gray">↑/↓ - Select expiration</Text>
        <Text color="gray">Return - Generate key</Text>
        <Text color="gray">Esc - Back to list</Text>
      </Box>
    </Box>
  );

  const renderGeneratedKey = () => (
    <Box flexDirection="column">
      <Text bold color="green">✅ API Key Generated Successfully!</Text>
      <Box marginTop={2} />
      

      <Box flexDirection="column" borderStyle="single" borderColor="yellow" padding={1}>
        <Text color="yellow" bold>🔐 Your API Key (save this securely):</Text>
        <Text color="white" bold>{generatedKey!.fullKey}</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color="blue" bold>📋 Key Details:</Text>
        <Text color="gray">ID: {generatedKey!.apiKey.id}</Text>
        <Text color="gray">Name: {generatedKey!.apiKey.name}</Text>
        <Text color="gray">Prefix: {generatedKey!.apiKey.key_prefix}</Text>
        <Text color="gray">Expires: {ApiKeyManager.formatExpiration(generatedKey!.apiKey.expires_at)}</Text>
        <Text color="gray">Created: {new Date(generatedKey!.apiKey.created_at).toLocaleDateString()}</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color="blue" bold>🚀 Getting Started:</Text>
        <Text color="gray">1. Start the MCP server: npm run dev:mcp</Text>
        <Text color="gray">2. Use your API key in LLM tools:</Text>
        <Text color="white">   Authorization: Bearer {generatedKey!.fullKey}</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color="yellow" bold>⚠️  Important:</Text>
        <Text color="gray">• Keep this API key secure and private</Text>
        <Text color="gray">• This key will not be shown again</Text>
        <Text color="gray">• Generate a new key if this one is compromised</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color="blue" bold>📋 Commands:</Text>
        <Text color="gray">c/C - Copy API key to clipboard</Text>
        <Text color="gray">Any other key - Continue</Text>
        
        {keyCopied && (
          <Box marginTop={1}>
            <Text color="green">✅ API key copied to clipboard!</Text>
          </Box>
        )}
        
        {error && (
          <Box marginTop={1}>
            <Text color="red">❌ {error}</Text>
          </Box>
        )}
        
        <Box marginTop={1}>
          <Text color="yellow">💡 You can also select and manually copy the key above</Text>
        </Box>
      </Box>
    </Box>
  );

  const renderRevokeConfirm = () => (
    <Box flexDirection="column">
      <Text bold color="red">🗑️  Revoke API Key</Text>
      <Box marginTop={1} />

      {keyToRevoke && (
        <Box flexDirection="column">
          <Text>Are you sure you want to revoke this API key?</Text>
          <Box marginTop={1} />
          
          <Box flexDirection="column" borderStyle="single" borderColor="red" padding={1}>
            <Text bold>{keyToRevoke.name}</Text>
            <Text color="gray">Prefix: {keyToRevoke.key_prefix}</Text>
            <Text color="gray">Expires: {ApiKeyManager.formatExpiration(keyToRevoke.expires_at)}</Text>
            <Text color="gray">Created: {new Date(keyToRevoke.created_at).toLocaleDateString()}</Text>
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text color="yellow" bold>⚠️  Warning:</Text>
            <Text color="gray">• Any applications using this key will lose access</Text>
            <Text color="gray">• This action cannot be undone</Text>
            <Text color="gray">• Generate a new key if you need continued access</Text>
          </Box>
        </Box>
      )}

      {loading ? (
        <Text color="yellow">Revoking API key...</Text>
      ) : error ? (
        <Text color="red">❌ Error: {error}</Text>
      ) : null}

      <Box marginTop={2} flexDirection="column">
        <Text color="blue" bold>Commands:</Text>
        <Text color="gray">y/Y - Yes, revoke this key</Text>
        <Text color="gray">n/N - No, keep this key</Text>
        <Text color="gray">Esc - Cancel</Text>
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column" padding={1}>
      {generatedKey ? renderGeneratedKey() :
       viewState === 'generate' ? renderGenerateForm() :
       viewState === 'confirm-revoke' ? renderRevokeConfirm() :
       renderKeyList()}
    </Box>
  );
}