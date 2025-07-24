import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { AuthService } from '../auth.js';
import { CloudTaskList } from '../cloud-task-list.js';
import { Task } from '../task.js';
import { AuthScreen } from './AuthScreen.js';
import { TodoApp } from './TodoApp.js';

export function TodoAppWithAuth() {
  const [authService] = useState(() => AuthService.getInstance());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUserInfo, setShowUserInfo] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setIsLoading(true);
    try {
      await authService.initialize();
      setIsAuthenticated(authService.isAuthenticated());
    } catch (error) {
      console.error('Auth initialization error:', error);
      setError('Failed to initialize authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setError('');
  };

  const handleSignOut = async () => {
    const result = await authService.signOut();
    if (result.success) {
      setIsAuthenticated(false);
    } else {
      setError(result.error || 'Sign out failed');
    }
  };

  useInput((input, key) => {
    if (isAuthenticated && input === 'u') {
      setShowUserInfo(!showUserInfo);
    } else if (isAuthenticated && showUserInfo && input === 'l') {
      handleSignOut();
    }
  });

  if (isLoading) {
    return (
      <Box justifyContent="center" alignItems="center" padding={2}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" alignItems="center" padding={2}>
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press any key to retry</Text>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Box flexDirection="column">
      {showUserInfo && (
        <Box 
          borderStyle="single" 
          borderColor="blue" 
          padding={1} 
          marginBottom={1}
        >
          <Box flexDirection="column">
            <Text color="blue" bold>User Info:</Text>
            <Text>Email: {authService.getUserEmail()}</Text>
            <Text color="gray">Press 'u' to hide | Press 'l' to logout</Text>
          </Box>
        </Box>
      )}
      
      <TodoAppContent showUserInfo={showUserInfo} />
    </Box>
  );
}

interface TodoAppContentProps {
  showUserInfo: boolean;
}

function TodoAppContent({ showUserInfo }: TodoAppContentProps) {
  // Just render the existing TodoApp component - it already has all the functionality
  return <TodoApp />;
}