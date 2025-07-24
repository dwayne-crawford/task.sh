import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface MultilineInputProps {
  onSubmit: (mainTask: string, subtasks: string[]) => void;
  onCancel: () => void;
  placeholder?: string;
}

export function MultilineInput({ onSubmit, onCancel, placeholder = "Enter task description..." }: MultilineInputProps) {
  const [lines, setLines] = useState<string[]>(['']);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const getCurrentLine = () => lines[currentLineIndex] || '';
  
  const updateCurrentLine = (newContent: string) => {
    const newLines = [...lines];
    newLines[currentLineIndex] = newContent;
    setLines(newLines);
  };

  const parseInput = () => {
    const allText = lines.join('\n').trim();
    if (!allText) return;

    const textLines = allText.split('\n').map(line => line.trim()).filter(line => line);
    const mainTask = textLines[0];
    const subtasks = textLines.slice(1)
      .filter(line => line.startsWith('- '))
      .map(line => line.substring(2).trim())
      .filter(line => line);

    onSubmit(mainTask, subtasks);
  };

  useInput((input: string, key: any) => {
    const currentLine = getCurrentLine();

    // Debug logging to see what keys we're getting
    // console.log('Key pressed:', { input, key, sequence: key.sequence });

    // Check for Ctrl+J (which produces '\n' without ctrl flag being set)
    // We need to distinguish from regular Return key
    const isNewLine = input === '\n' && !key.return;
    const isSubmit = key.return || input === '\r';

    if (isNewLine) {
      // Ctrl+J: Add new line
      const newLines = [...lines];
      const beforeCursor = currentLine.slice(0, cursorPosition);
      const afterCursor = currentLine.slice(cursorPosition);
      
      newLines[currentLineIndex] = beforeCursor;
      newLines.splice(currentLineIndex + 1, 0, afterCursor);
      
      setLines(newLines);
      setCurrentLineIndex(currentLineIndex + 1);
      setCursorPosition(0);
    } else if (isSubmit) {
      // Regular Return: Submit
      parseInput();
    } else if (key.escape) {
      onCancel();
    } else if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newContent = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition);
        updateCurrentLine(newContent);
        setCursorPosition(cursorPosition - 1);
      } else if (currentLineIndex > 0 && cursorPosition === 0) {
        // Backspace at beginning of line - merge with previous line
        const newLines = [...lines];
        const prevLine = newLines[currentLineIndex - 1];
        const currentLineContent = newLines[currentLineIndex];
        
        newLines[currentLineIndex - 1] = prevLine + currentLineContent;
        newLines.splice(currentLineIndex, 1);
        
        setLines(newLines);
        setCurrentLineIndex(currentLineIndex - 1);
        setCursorPosition(prevLine.length);
      }
    } else if (key.leftArrow) {
      if (cursorPosition > 0) {
        setCursorPosition(cursorPosition - 1);
      } else if (currentLineIndex > 0) {
        setCurrentLineIndex(currentLineIndex - 1);
        setCursorPosition(lines[currentLineIndex - 1]?.length || 0);
      }
    } else if (key.rightArrow) {
      if (cursorPosition < currentLine.length) {
        setCursorPosition(cursorPosition + 1);
      } else if (currentLineIndex < lines.length - 1) {
        setCurrentLineIndex(currentLineIndex + 1);
        setCursorPosition(0);
      }
    } else if (key.upArrow) {
      if (currentLineIndex > 0) {
        setCurrentLineIndex(currentLineIndex - 1);
        setCursorPosition(Math.min(cursorPosition, lines[currentLineIndex - 1]?.length || 0));
      }
    } else if (key.downArrow) {
      if (currentLineIndex < lines.length - 1) {
        setCurrentLineIndex(currentLineIndex + 1);
        setCursorPosition(Math.min(cursorPosition, lines[currentLineIndex + 1]?.length || 0));
      }
    } else if (input && !key.ctrl && !key.meta) {
      // Add character at cursor position
      const newContent = currentLine.slice(0, cursorPosition) + input + currentLine.slice(cursorPosition);
      updateCurrentLine(newContent);
      setCursorPosition(cursorPosition + 1);
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Task with subtasks (Ctrl+J for new line, "- " for subtasks):</Text>
      </Box>
      
      <Box borderStyle="single" padding={1} flexDirection="column" minHeight={3}>
        {lines.map((line, index) => {
          const isCurrentLine = index === currentLineIndex;
          let displayLine = line;
          
          if (isCurrentLine) {
            displayLine = line.slice(0, cursorPosition) + '|' + line.slice(cursorPosition);
          }
          
          // Color subtask lines differently
          const isSubtask = line.trim().startsWith('- ');
          const color = isSubtask ? 'gray' : 'white';
          
          return (
            <Box key={index}>
              <Text color={color}>
                {displayLine || (index === 0 && !isCurrentLine ? placeholder : '')}
              </Text>
            </Box>
          );
        })}
      </Box>
      
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">Return: Save task | Ctrl+J: New line</Text>
        <Text color="gray">Start line with "- " for subtasks | Esc: Cancel</Text>
      </Box>
    </Box>
  );
}