import React from 'react';
import { Box, Text } from 'ink';

interface HelpScreenProps {
  onClose: () => void;
}

export function HelpScreen({ onClose }: HelpScreenProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="blue">TASK.SH - Help</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">Interactive Mode Controls:</Text>
        <Text>← →                       Navigate dates</Text>
        <Text>↑ ↓                       Select task/subtask</Text>
        <Text>Space                     Toggle completion</Text>
        <Text>Tab                       Expand/collapse subtasks</Text>
        <Text>e                         Edit selected task</Text>
        <Text>d                         Delete selected item</Text>
        <Text>n                         Add task</Text>
        <Text>N                         Add task with subtasks</Text>
        <Text>i                         Toggle task ID display</Text>
        <Text>/help                     Show this help screen</Text>
        <Text>/login                    Login to cloud sync</Text>
        <Text>/logout                   Sign out from account</Text>
        <Text>/add [task] [--date YYYY-MM-DD]  Add task or open add dialog</Text>
        <Text>/delete [id]              Delete selected or specified task</Text>
        <Text>/edit [id] [desc]         Edit selected or specified task</Text>
        <Text>/list                     Advanced list view with filters</Text>
        <Text>/calendar                 Calendar view with date range</Text>
        <Text>/projects                 Show all projects</Text>
        <Text>/sync                     Sync with cloud</Text>
        <Text>/ids                      Toggle task ID display</Text>
        <Text>Esc                       Quit</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">CLI Commands:</Text>
        <Text>todo                      Launch interactive mode</Text>
        <Text>todo add "task"           Add a new task</Text>
        <Text>todo list                 List today's tasks</Text>
        <Text>todo list [date]          List tasks for specific date</Text>
        <Text>todo calendar             Show calendar view</Text>
        <Text>todo projects             List all projects</Text>
        <Text>todo logout               Sign out</Text>
        <Text>todo sync                 Sync with cloud</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">CLI Flags:</Text>
        <Text>--all, -a                 Show tasks from all dates</Text>
        <Text>--project, -p [name]      Filter by project</Text>
        <Text>--completed, -c           Show only completed tasks</Text>
        <Text>--pending                 Show only pending tasks</Text>
        <Text>--ids                     Show task IDs</Text>
        <Text>--date, -d [YYYY-MM-DD]   Specify date for task</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">Projects & Organization:</Text>
        <Text>Use #projectname in task description to organize by project</Text>
        <Text>Example: "Fix bug in login #webapp"</Text>
        <Text>Projects appear as blue tags and can be filtered</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">Subtasks:</Text>
        <Text>Create with Shift+N or use multiline input</Text>
        <Text>Lines starting with "- " become subtasks</Text>
        <Text>Use Tab to expand/collapse subtask view</Text>
        <Text>Progress shown as (completed/total)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="white">Authentication:</Text>
        <Text>Sign in to sync tasks across devices</Text>
        <Text>Cloud tasks are separate from local tasks</Text>
        <Text>Tasks are automatically synced when online</Text>
        <Text>Offline changes sync when connection returns</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press any key to close this help screen</Text>
      </Box>
    </Box>
  );
}