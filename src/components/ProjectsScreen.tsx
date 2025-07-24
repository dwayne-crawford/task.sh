import React from 'react';
import { Box, Text } from 'ink';
import { TaskList } from '../task-list.js';

interface ProjectsScreenProps {
  taskList: TaskList;
  onClose: () => void;
}

export function ProjectsScreen({ taskList, onClose }: ProjectsScreenProps) {
  const projects = taskList.getAllProjects();

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="blue">All Projects</Text>
      </Box>

      {projects.length === 0 ? (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="gray">No projects found.</Text>
          <Text color="gray">Create tasks with #projectname to organize by project.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={2}>
          {projects.map(project => {
            const projectTasks = taskList.getTasksByProject(project);
            const completedCount = projectTasks.filter(t => t.completed).length;
            const totalCount = projectTasks.length;
            
            return (
              <Text key={project}>
                <Text color="blue">#{project}</Text>
                <Text color="gray"> ({completedCount}/{totalCount} completed)</Text>
              </Text>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Press any key to close</Text>
      </Box>
    </Box>
  );
}