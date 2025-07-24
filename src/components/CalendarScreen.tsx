import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import chalk from 'chalk';
import { TaskList } from '../task-list.js';
import { CloudTaskList } from '../cloud-task-list.js';
import { Task } from '../task.js';

interface CalendarScreenProps {
  taskList: TaskList | CloudTaskList;
  onClose: () => void;
}

export function CalendarScreen({ taskList, onClose }: CalendarScreenProps) {
  const [days, setDays] = useState(7);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [showIds, setShowIds] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksByDate, setTasksByDate] = useState<{ [date: string]: Task[] }>({});

  const loadCalendarTasks = () => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days - 1);
    
    const startDateStr = today.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    let calendarTasks = taskList.getTasksInDateRange(startDateStr, endDateStr);
    
    // Apply project filter if specified
    if (projectFilter) {
      calendarTasks = calendarTasks.filter(task => task.project === projectFilter);
    }
    
    // Group tasks by date
    const grouped: { [date: string]: Task[] } = {};
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      grouped[dateStr] = [];
    }
    
    calendarTasks.forEach(task => {
      if (!grouped[task.date]) {
        grouped[task.date] = [];
      }
      grouped[task.date].push(task);
    });
    
    setTasks(calendarTasks);
    setTasksByDate(grouped);
  };

  useEffect(() => {
    loadCalendarTasks();
  }, [days, projectFilter, showIds]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().slice(0, 10);
    const dayLabel = dateStr === today ? ' (Today)' : '';
    return `${date.toDateString()}${dayLabel}`;
  };

  useInput((input: string, key: any) => {
    if (key.escape || input === 'q') {
      onClose();
    } else if (input === '+') {
      setDays(Math.min(30, days + 1));
    } else if (input === '-') {
      setDays(Math.max(1, days - 1));
    } else if (input === 'i') {
      setShowIds(!showIds);
    } else if (input === 'p') {
      // Cycle through projects
      const projects = taskList.getAllProjects();
      if (projects.length === 0) {
        return;
      }
      if (!projectFilter) {
        setProjectFilter(projects[0]);
      } else {
        const currentIndex = projects.indexOf(projectFilter);
        const nextIndex = (currentIndex + 1) % (projects.length + 1);
        setProjectFilter(nextIndex === projects.length ? null : projects[nextIndex]);
      }
    }
  });

  const filterDesc = projectFilter ? ` for project #${projectFilter}` : '';
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="blue" bold>Calendar View ({days} days{filterDesc})</Text>
      </Box>
      
      {/* Stats */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="gray">
          {totalTasks} tasks ({completedTasks} completed, {totalTasks - completedTasks} pending)
        </Text>
      </Box>

      {/* Calendar Content */}
      <Box flexDirection="column" marginBottom={1}>
        {Object.keys(tasksByDate).map(date => (
          <Box key={date} flexDirection="column" marginBottom={1}>
            <Text color="cyan" bold>{formatDate(date)}:</Text>
            {tasksByDate[date].length === 0 ? (
              <Box marginLeft={2}>
                <Text color="gray">
                  {projectFilter ? 'No tasks for this project' : 'No tasks'}
                </Text>
              </Box>
            ) : (
              tasksByDate[date].map((task: Task) => {
                const status = task.completed ? chalk.green('✓') : ' ';
                const projectTag = task.project ? ` ${task.getProjectTag()}` : '';
                const subtaskInfo = task.hasSubtasks() ? ` (${task.getCompletedSubtasksCount()}/${task.subtasks.length})` : '';
                const idPrefix = showIds ? `[${task.id.substring(0, 8)}] ` : '';
                
                return (
                  <Box key={task.id} marginLeft={2}>
                    <Text>
                      - {idPrefix}[{status}] {task.getDisplayDescription()}
                      {task.project && <Text color="blue">{projectTag}</Text>}
                      {task.hasSubtasks() && <Text color="gray">{subtaskInfo}</Text>}
                    </Text>
                  </Box>
                );
              })
            )}
          </Box>
        ))}
      </Box>

      {/* Controls */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
        <Text color="yellow" bold>Calendar Controls:</Text>
        <Text>+/-                     Increase/decrease days ({days})</Text>
        <Text>p                       Cycle project filter ({projectFilter || 'all'})</Text>
        <Text>i                       Toggle task IDs ({showIds ? 'shown' : 'hidden'})</Text>
        <Text>q/Esc                   Return to main view</Text>
      </Box>
    </Box>
  );
}