
import React from 'react';
import { Box, Text } from 'ink';

interface CommandMenuProps {
  commands: { command: string, description: string }[];
  selectedIndex: number;
}

export function CommandMenu({ commands, selectedIndex }: CommandMenuProps) {
  return (
    <Box flexDirection="column" width="100%">
      {commands.map((item, index) => (
        <Box key={item.command} borderStyle={index === selectedIndex ? 'round' : undefined} borderColor={index === selectedIndex ? 'white' : undefined}>
          <Box width="30%">
            <Text color={index === selectedIndex ? 'white' : 'grey'}>{item.command}</Text>
          </Box>
          <Box width="70%">
            <Text color={index === selectedIndex ? 'white' : 'grey'}>{item.description}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
