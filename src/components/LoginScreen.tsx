import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { AuthService } from '../auth.js';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export function LoginScreen({ onLoginSuccess, onCancel }: LoginScreenProps) {
  const [mode, setMode] = useState<'menu' | 'signin' | 'signup'>('menu');
  const [selectedMenuOption, setSelectedMenuOption] = useState(0); // 0 = signin, 1 = signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentField, setCurrentField] = useState<'email' | 'password'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authService = AuthService.getInstance();

  useInput((input, key) => {
    if (key.escape) {
      if (mode === 'menu') {
        onCancel();
      } else {
        setMode('menu');
        setError('');
        setSuccess('');
        setEmail('');
        setPassword('');
        setCurrentField('email');
      }
      return;
    }

    if (mode === 'menu') {
      if (key.upArrow) {
        setSelectedMenuOption(selectedMenuOption > 0 ? selectedMenuOption - 1 : 1);
      } else if (key.downArrow) {
        setSelectedMenuOption(selectedMenuOption < 1 ? selectedMenuOption + 1 : 0);
      } else if (key.return) {
        if (selectedMenuOption === 0) {
          setMode('signin');
        } else {
          setMode('signup');
        }
        setCurrentField('email');
      } else if (input === '1') {
        setMode('signin');
        setCurrentField('email');
      } else if (input === '2') {
        setMode('signup');
        setCurrentField('email');
      }
    }

    // Handle field switching with Tab for signin/signup modes
    if ((mode === 'signin' || mode === 'signup') && key.tab) {
      setCurrentField(currentField === 'email' ? 'password' : 'email');
    }
  });

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await authService.signIn(email, password);
    setIsLoading(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || 'Sign in failed');
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await authService.signUp(email, password);
    setIsLoading(false);

    if (result.success) {
      // Try to sign in immediately
      const signInResult = await authService.signIn(email, password);
      if (signInResult.success) {
        onLoginSuccess();
      } else {
        setSuccess('Account created! Please sign in.');
        setMode('signin');
      }
    } else {
      setError(result.error || 'Sign up failed');
    }
  };

  const asciiLogo = `
 ███          ███████████   █████████    █████████  █████   ████     █████████  █████   █████
░░░███       ░█░░░███░░░█  ███░░░░░███  ███░░░░░███░░███   ███░     ███░░░░░███░░███   ░░███ 
  ░░░███     ░   ░███  ░  ░███    ░███ ░███    ░░░  ░███  ███      ░███    ░░░  ░███    ░███ 
    ░░░███       ░███     ░███████████ ░░█████████  ░███████       ░░█████████  ░███████████ 
     ███░        ░███     ░███░░░░░███  ░░░░░░░░███ ░███░░███       ░░░░░░░░███ ░███░░░░░███ 
   ███░          ░███     ░███    ░███  ███    ░███ ░███ ░░███      ███    ░███ ░███    ░███ 
 ███░            █████    █████   █████░░█████████  █████ ░░████ ██░░█████████  █████   █████
░░░             ░░░░░    ░░░░░   ░░░░░  ░░░░░░░░░  ░░░░░   ░░░░ ░░  ░░░░░░░░░  ░░░░░   ░░░░░ 
  `;

  if (mode === 'menu') {
    return (
      <Box flexDirection="column" padding={2}>
        <Box justifyContent="center" marginBottom={2}>
          <Text color="blue">{asciiLogo}</Text>
        </Box>
        
        <Box flexDirection="column" marginTop={2}>
          <Text color="gray">Choose your authentication method:</Text>
        </Box>

        <Box flexDirection="column" marginTop={2}>
          <Text color={selectedMenuOption === 0 ? 'yellow' : 'white'}>
            {selectedMenuOption === 0 ? '> ' : '  '}1. Sign in with password
          </Text>
          <Text color={selectedMenuOption === 1 ? 'yellow' : 'white'}>
            {selectedMenuOption === 1 ? '> ' : '  '}2. Create new account
          </Text>
        </Box>

        <Box marginTop={2}>
          <Text color="gray">Use ↑↓ arrows and Return to select • Press 1 or 2 • Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text bold color="blue">
          {mode === 'signin' && 'Sign In'}
          {mode === 'signup' && 'Create Account'}
        </Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {success && (
        <Box marginBottom={1}>
          <Text color="green">Success: {success}</Text>
        </Box>
      )}

      {isLoading && (
        <Box marginBottom={1}>
          <Text color="yellow">Processing...</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text color={currentField === 'email' ? 'yellow' : 'white'}>Email: </Text>
          {currentField === 'email' ? (
            <TextInput
              value={email}
              onChange={setEmail}
              onSubmit={() => {
                setCurrentField('password');
              }}
              placeholder="Enter your email"
            />
          ) : (
            <Text color="gray">{email || '(empty)'}</Text>
          )}
        </Box>

        {(mode === 'signin' || mode === 'signup') && (
          <Box marginBottom={1}>
            <Text color={currentField === 'password' ? 'yellow' : 'white'}>Password: </Text>
            {currentField === 'password' ? (
              <TextInput
                value={password}
                onChange={setPassword}
                onSubmit={() => {
                  if (mode === 'signin') {
                    handleSignIn();
                  } else if (mode === 'signup') {
                    handleSignUp();
                  }
                }}
                placeholder="Enter your password"
                mask="*"
              />
            ) : (
              <Text color="gray">{password ? '*'.repeat(password.length) : '(empty)'}</Text>
            )}
          </Box>
        )}
      </Box>

      <Box flexDirection="column">
        <Text color="gray">Return: Submit • Esc: Back to menu</Text>
      </Box>
    </Box>
  );
}