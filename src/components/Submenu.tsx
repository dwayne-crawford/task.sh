
import React from 'react';
import { Box, Text } from 'ink';

interface SubmenuProps {
  params: { name: string, description: string, required?: boolean, type?: string, alias?: string }[];
  selectedIndex: number;
}

export function Submenu({ params, selectedIndex }: SubmenuProps) {
  return (
    <Box flexDirection="column" width="100%">
      {params.map((param, index) => (
        <Box key={param.name} borderStyle={index === selectedIndex ? 'round' : undefined} borderColor={index === selectedIndex ? 'white' : undefined}>
          <Box width="30%">
            <Text color={index === selectedIndex ? 'white' : 'grey'}>{param.name}</Text>
          </Box>
          <Box width="70%">
            <Text color={index === selectedIndex ? 'white' : 'grey'}>
              {param.description}
              {param.required && <Text color="red"> (required)</Text>}
              {param.type && <Text color="gray"> ({param.type})</Text>}
              {param.alias && <Text color="gray"> (alias: {param.alias})</Text>}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
