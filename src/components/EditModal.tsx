import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Task } from '../task.js';

interface EditModalProps {
  task: Task;
  onSave: (newDescription: string) => void;
  onCancel: () => void;
}

export function EditModal({ task, onSave, onCancel }: EditModalProps) {
  const [description, setDescription] = useState(task.description);
  const [cursorPosition, setCursorPosition] = useState(task.description.length);

  useInput((input: string, key: any) => {
    if (key.return) {
      onSave(description);
    } else if (key.escape) {
      onCancel();
    } else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newDescription = description.slice(0, cursorPosition - 1) + description.slice(cursorPosition);
        setDescription(newDescription);
        setCursorPosition(cursorPosition - 1);
      }
    } else if (key.leftArrow) {
      if (cursorPosition > 0) {
        setCursorPosition(cursorPosition - 1);
      }
    } else if (key.rightArrow) {
      if (cursorPosition < description.length) {
        setCursorPosition(cursorPosition + 1);
      }
    } else if (key.ctrl && input === 'a') {
      setCursorPosition(0);
    } else if (key.ctrl && input === 'e') {
      setCursorPosition(description.length);
    } else if (input && !key.ctrl && !key.meta) {
      const newDescription = description.slice(0, cursorPosition) + input + description.slice(cursorPosition);
      setDescription(newDescription);
      setCursorPosition(cursorPosition + 1);
    }
  });

  const displayText = description.slice(0, cursorPosition) + '|' + description.slice(cursorPosition);

  return (
    <Box
      position="absolute"
      justifyContent="center" 
      alignItems="center"
      width="100%"
      height="100%"
    >
      <Box
        borderStyle="single"
        borderColor="blue"
        padding={1}
        flexDirection="column"
      >
        <Text bold color="blue">Edit Task</Text>
        <Box marginY={1}>
          <Text>Description:</Text>
        </Box>
        <Box borderStyle="single" padding={1}>
          <Text>{displayText}</Text>
        </Box>
        <Box marginY={1} flexDirection="column">
          <Text color="gray">Return: Save changes</Text>
          <Text color="gray">Esc: Cancel</Text>
          <Text color="gray">← →: Move cursor</Text>
          <Text color="gray">Ctrl+A: Beginning, Ctrl+E: End</Text>
        </Box>
      </Box>
    </Box>
  );
}