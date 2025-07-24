
import React from 'react';
import { Box, Text } from 'ink';

interface SubmenuProps {
  params: { name: string, description: string, required?: boolean, type?: string, alias?: string, paramType?: string }[];
  selectedIndex: number;
  currentCommand: string;
}

export function Submenu({ params, selectedIndex, currentCommand }: SubmenuProps) {
  // Helper to check if a flag is already used in the command
  const isFlagUsed = (flagName: string) => {
    const command = currentCommand.toLowerCase();
    return command.includes(flagName.toLowerCase());
  };

  // Helper to get usage indicator
  const getUsageIndicator = (param: any, isSelected: boolean) => {
    if (param.paramType === 'example') {
      return <Text color="blue"> 💡</Text>;
    }
    if (param.paramType === 'flag' && isFlagUsed(param.name)) {
      return <Text color="green"> ✓</Text>;
    }
    if (isSelected && param.paramType !== 'example') {
      return <Text color="yellow"> ← press Enter</Text>;
    }
    return null;
  };

  return (
    <Box flexDirection="column" width="100%">
      <Box marginBottom={1}>
        <Text color="blue" bold>📋 Parameters & Flags:</Text>
      </Box>
      {params.map((param, index) => {
        const isSelected = index === selectedIndex;
        const isUsed = param.paramType === 'flag' && isFlagUsed(param.name);
        
        return (
          <Box 
            key={param.name} 
            borderStyle={isSelected ? 'round' : undefined} 
            borderColor={isSelected ? 'cyan' : undefined}
            marginBottom={0}
            paddingX={param.paramType === 'example' ? 1 : 0}
          >
            {param.paramType === 'example' ? (
              // Special layout for examples
              <Box width="100%">
                <Text color="blue" bold>📋 {param.name}:</Text>
                <Text color="gray"> {param.description}</Text>
              </Box>
            ) : (
              // Regular parameter layout
              <>
                <Box width="25%">
                  <Text color={isSelected ? 'cyan' : isUsed ? 'green' : 'grey'} bold={isSelected}>
                    {param.name}
                    {param.alias && <Text color="gray"> ({param.alias})</Text>}
                  </Text>
                </Box>
                <Box width="50%">
                  <Text color={isSelected ? 'white' : 'grey'}>
                    {param.description}
                  </Text>
                </Box>
                <Box width="25%">
                  <Text color={isSelected ? 'white' : 'grey'}>
                    {param.required && <Text color="red">required </Text>}
                    {param.type && <Text color="cyan">({param.type}) </Text>}
                    {getUsageIndicator(param, isSelected)}
                  </Text>
                </Box>
              </>
            )}
          </Box>
        );
      })}
      
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          💡 Use ↑/↓ to navigate, Enter to add parameter, Esc to hide menu
        </Text>
      </Box>
    </Box>
  );
}
