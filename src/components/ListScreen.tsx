import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import chalk from 'chalk';
import { TaskList } from '../task-list.js';
import { CloudTaskList } from '../cloud-task-list.js';
import { Task } from '../task.js';

interface ListScreenProps {
  taskList: TaskList | CloudTaskList;
  onClose: () => void;
  initialDate?: string;
}

export function ListScreen({ taskList, onClose, initialDate }: ListScreenProps) {
  const [showAll, setShowAll] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [showIds, setShowIds] = useState(false);
  const [currentDate, setCurrentDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadFilteredTasks = () => {
    let filteredTasks: Task[] = [];

    // Get tasks based on date filter
    if (showAll) {
      filteredTasks = taskList.tasks;
    } else {
      filteredTasks = taskList.getTasksByDate(currentDate);
    }

    // Apply project filter
    if (projectFilter) {
      filteredTasks = filteredTasks.filter(task => task.project === projectFilter);
    }

    // Apply completion filter
    if (completionFilter === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (completionFilter === 'pending') {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }

    setTasks(filteredTasks);
  };

  useEffect(() => {
    loadFilteredTasks();
  }, [showAll, projectFilter, completionFilter, showIds, currentDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().slice(0, 10);
    const dayLabel = dateStr === today ? ' (Today)' : '';
    return `${date.toDateString()}${dayLabel}`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (showAll) return; // Don't navigate when showing all
    
    const date = new Date(currentDate);
    if (direction === 'prev') {
      date.setDate(date.getDate() - 1);
    } else {
      date.setDate(date.getDate() + 1);
    }
    setCurrentDate(date.toISOString().slice(0, 10));
  };

  useInput((input: string, key: any) => {
    if (key.escape || input === 'q') {
      onClose();
    } else if (input === 'a') {
      setShowAll(!showAll);
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
    } else if (input === 'c') {
      // Cycle through completion filters
      const filters: Array<'all' | 'completed' | 'pending'> = ['all', 'completed', 'pending'];
      const currentIndex = filters.indexOf(completionFilter);
      const nextIndex = (currentIndex + 1) % filters.length;
      setCompletionFilter(filters[nextIndex]);
    } else if (input === 'i') {
      setShowIds(!showIds);
    } else if (key.leftArrow && !showAll) {
      navigateDate('prev');
    } else if (key.rightArrow && !showAll) {
      navigateDate('next');
    }
  });

  const getFilterDescription = () => {
    let desc = '';
    if (showAll) {
      desc += 'All dates';
    } else {
      desc += formatDate(currentDate);
    }
    if (projectFilter) {
      desc += ` • Project: #${projectFilter}`;
    }
    if (completionFilter !== 'all') {
      desc += ` • ${completionFilter === 'completed' ? 'Completed' : 'Pending'} only`;
    }
    return desc;
  };

  const renderTasks = () => {
    if (tasks.length === 0) {
      let emptyMessage = 'No tasks found';
      if (projectFilter) emptyMessage += ` for project #${projectFilter}`;
      if (completionFilter !== 'all') emptyMessage += ` (${completionFilter})`;
      return <Text color="gray">{emptyMessage}</Text>;
    }

    if (showAll) {
      // Group by date when showing all
      const tasksByDate: { [date: string]: Task[] } = {};
      tasks.forEach(task => {
        if (!tasksByDate[task.date]) {
          tasksByDate[task.date] = [];
        }
        tasksByDate[task.date].push(task);
      });

      return Object.keys(tasksByDate).sort().map(date => (
        <Box key={date} flexDirection="column" marginBottom={1}>
          <Text color="cyan" bold>{formatDate(date)}:</Text>
          {tasksByDate[date].map((task: Task) => renderTask(task, 2))}
        </Box>
      ));
    } else {
      // Single date view
      return tasks.map((task: Task) => renderTask(task, 0));
    }
  };

  const renderTask = (task: Task, marginLeft: number = 0) => {
    const status = task.completed ? chalk.green('✓') : ' ';
    const projectTag = task.project ? ` ${task.getProjectTag()}` : '';
    const subtaskInfo = task.hasSubtasks() ? ` (${task.getCompletedSubtasksCount()}/${task.subtasks.length})` : '';
    const idPrefix = showIds ? `[${task.id.substring(0, 8)}] ` : '';
    
    return (
      <Box key={task.id} marginLeft={marginLeft}>
        <Text>
          - {idPrefix}[{status}] {task.getDisplayDescription()}
          {task.project && <Text color="blue">{projectTag}</Text>}
          {task.hasSubtasks() && <Text color="gray">{subtaskInfo}</Text>}
        </Text>
      </Box>
    );
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="blue" bold>Task List</Text>
      </Box>
      
      {/* Filter Status */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="yellow">{getFilterDescription()}</Text>
      </Box>

      {/* Stats */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="gray">
          {totalTasks} tasks ({completedTasks} completed, {totalTasks - completedTasks} pending)
        </Text>
      </Box>

      {/* Tasks */}
      <Box flexDirection="column" marginBottom={1}>
        {renderTasks()}
      </Box>

      {/* Controls */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
        <Text color="yellow" bold>List Controls:</Text>
        <Text>a                       Toggle all dates ({showAll ? 'all' : 'single'})</Text>
        <Text>← →                     Navigate dates {showAll ? '' : `(${currentDate})`}</Text>
        <Text>p                       Cycle project filter ({projectFilter || 'all'})</Text>
        <Text>c                       Cycle completion filter ({completionFilter})</Text>
        <Text>i                       Toggle task IDs ({showIds ? 'shown' : 'hidden'})</Text>
        <Text>q/Esc                   Return to main view</Text>
      </Box>
    </Box>
  );
}