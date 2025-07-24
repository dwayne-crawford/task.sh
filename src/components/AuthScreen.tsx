import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { AuthService } from '../auth.js';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'welcome' | 'signin' | 'signup'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentField, setCurrentField] = useState<'email' | 'password' | 'confirm'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authService = AuthService.getInstance();

  useInput((input, key) => {
    if (mode === 'welcome') {
      if (input === '1') {
        setMode('signin');
        setError('');
      } else if (input === '2') {
        setMode('signup');
        setError('');
      } else if (input === 'q' || key.escape) {
        process.exit(0);
      }
      return;
    }

    if (key.escape) {
      setMode('welcome');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setCurrentField('email');
      setError('');
      setSuccess('');
      return;
    }

    if (key.tab) {
      if (mode === 'signin') {
        setCurrentField(currentField === 'email' ? 'password' : 'email');
      } else if (mode === 'signup') {
        if (currentField === 'email') setCurrentField('password');
        else if (currentField === 'password') setCurrentField('confirm');
        else setCurrentField('email');
      }
      return;
    }
  });

  const handleSubmit = async () => {
    if (isLoading) return;

    if (mode === 'signin') {
      if (!email.trim() || !password.trim()) {
        setError('Email and password are required');
        return;
      }
    } else if (mode === 'signup') {
      if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('All fields are required');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      let result;
      if (mode === 'signin') {
        result = await authService.signIn(email, password);
      } else {
        result = await authService.signUp(email, password);
      }

      if (result.success) {
        if (mode === 'signup') {
          setSuccess('Account created successfully! Please check your email to verify your account, then sign in.');
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else {
          onAuthSuccess();
        }
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'welcome') {
    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        <Box marginBottom={2}>
          <Text bold color="blue">Welcome to Todo CLI</Text>
        </Box>
        
        <Box flexDirection="column" alignItems="center" marginBottom={2}>
          <Text>To sync your tasks to the cloud, you need to authenticate.</Text>
          <Text color="gray">Your tasks will be saved locally and synced when you're online.</Text>
        </Box>

        <Box flexDirection="column" alignItems="center" marginBottom={2}>
          <Text>Choose an option:</Text>
          <Text>1. Sign in to existing account</Text>
          <Text>2. Create new account</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="gray">Press 1 or 2 to continue, q to quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={2}>
      <Box justifyContent="center" marginBottom={2}>
        <Text bold color="blue">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {success && (
        <Box marginBottom={1}>
          <Text color="green">{success}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text color={currentField === 'email' ? 'yellow' : 'white'}>
            Email: 
          </Text>
          {currentField === 'email' ? (
            <TextInput
              value={email}
              onChange={setEmail}
              onSubmit={() => {
                if (mode === 'signin' && password.trim()) {
                  handleSubmit();
                } else {
                  setCurrentField('password');
                }
              }}
              placeholder="Enter your email"
            />
          ) : (
            <Text color="gray">{email || '(empty)'}</Text>
          )}
        </Box>

        <Box marginBottom={1}>
          <Text color={currentField === 'password' ? 'yellow' : 'white'}>
            Password: 
          </Text>
          {currentField === 'password' ? (
            <TextInput
              value={password}
              onChange={setPassword}
              onSubmit={() => {
                if (mode === 'signin') {
                  handleSubmit();
                } else {
                  setCurrentField('confirm');
                }
              }}
              placeholder="Enter your password"
              mask="*"
            />
          ) : (
            <Text color="gray">{password ? '*'.repeat(password.length) : '(empty)'}</Text>
          )}
        </Box>

        {mode === 'signup' && (
          <Box marginBottom={1}>
            <Text color={currentField === 'confirm' ? 'yellow' : 'white'}>
              Confirm Password: 
            </Text>
            {currentField === 'confirm' ? (
              <TextInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                onSubmit={handleSubmit}
                placeholder="Confirm your password"
                mask="*"
              />
            ) : (
              <Text color="gray">{confirmPassword ? '*'.repeat(confirmPassword.length) : '(empty)'}</Text>
            )}
          </Box>
        )}
      </Box>

      {isLoading && (
        <Box marginBottom={1}>
          <Text color="yellow">
            {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">Tab: Switch fields</Text>
        <Text color="gray">Return: Submit</Text>
        <Text color="gray">Esc: Back to main menu</Text>
      </Box>
    </Box>
  );
}