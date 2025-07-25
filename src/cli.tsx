#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { TaskList } from './task-list.js';
import { Task } from './task.js';
import { TodoApp } from './components/TodoApp.js';
import { AuthService } from './auth.js';
import { CloudTaskList } from './cloud-task-list.js';
import { apiCommand } from './commands/api.js';
import * as fs from 'fs';
import * as path from 'path';

const argv = yargs()
  .command('add <task>', 'Add a new todo task', (yargs: any) => {
    yargs.positional('task', {
      describe: 'The task description',
      type: 'string'
    })
    .option('date', {
      alias: 'd',
      describe: 'Date for the task (YYYY-MM-DD)',
      type: 'string'
    });
  }, async (argv: any) => {
    const taskDate = argv.date || new Date().toISOString().slice(0, 10);
    
    // Initialize auth and use appropriate task list
    const authService = AuthService.getInstance();
    await authService.initialize();
    
    const taskList = authService.isAuthenticated() ? new CloudTaskList() : new TaskList();
    taskList.addTask(argv.task, taskDate);
    console.log('Task added successfully!');
    
    if (authService.isAuthenticated()) {
      console.log('Task synced to cloud.');
    }
    
    process.exit(0);
  })
  .command('list [date]', 'List all todo tasks', (yargs: any) => {
    yargs.positional('date', {
      describe: 'Date to list tasks for (YYYY-MM-DD)',
      type: 'string',
      default: new Date().toISOString().slice(0, 10)
    })
    .option('all', {
      alias: 'a',
      describe: 'Show tasks from all dates',
      type: 'boolean',
      default: false
    })
    .option('project', {
      alias: 'p',
      describe: 'Filter by project name (without #)',
      type: 'string'
    })
    .option('completed', {
      alias: 'c',
      describe: 'Show only completed tasks',
      type: 'boolean',
      default: false
    })
    .option('pending', {
      describe: 'Show only pending (incomplete) tasks',
      type: 'boolean',
      default: false
    })
    .option('ids', {
      describe: 'Show task IDs (useful for delete/edit commands)',
      type: 'boolean',
      default: false
    });
  }, (argv: any) => {
    const taskList = new TaskList();
    let tasks: Task[] = [];

    // Get tasks based on date filter
    if (argv.all) {
      tasks = taskList.tasks;
    } else {
      tasks = taskList.getTasksByDate(argv.date);
    }

    // Apply project filter
    if (argv.project) {
      tasks = tasks.filter(task => task.project === argv.project);
    }

    // Apply completion filter
    if (argv.completed && !argv.pending) {
      tasks = tasks.filter(task => task.completed);
    } else if (argv.pending && !argv.completed) {
      tasks = tasks.filter(task => !task.completed);
    }

    // Display results
    if (tasks.length === 0) {
      if (argv.all) {
        console.log('No tasks found.');
      } else if (argv.project) {
        console.log(`No tasks found for project #${argv.project}.`);
      } else {
        console.log(`No tasks for ${argv.date}.`);
      }
    } else {
      // Group by date if showing all
      if (argv.all) {
        const tasksByDate: { [date: string]: Task[] } = {};
        tasks.forEach(task => {
          if (!tasksByDate[task.date]) {
            tasksByDate[task.date] = [];
          }
          tasksByDate[task.date].push(task);
        });

        Object.keys(tasksByDate).sort().forEach(date => {
          const dateObj = new Date(date + 'T00:00:00');
          const isToday = date === new Date().toISOString().slice(0, 10);
          const dayLabel = isToday ? ' (Today)' : '';
          
          console.log(`\n${dateObj.toDateString()}${dayLabel}:`);
          tasksByDate[date].forEach((task: Task) => {
            const projectTag = task.project ? ` ${task.getProjectTag()}` : '';
            const subtaskInfo = task.hasSubtasks() ? ` (${task.getCompletedSubtasksCount()}/${task.subtasks.length})` : '';
            const idPrefix = argv.ids ? `[${task.id.substring(0, 8)}] ` : '';
            console.log(`  - ${idPrefix}[${task.completed ? 'x' : ' '}] ${task.getDisplayDescription()}${projectTag}${subtaskInfo}`);
          });
        });
      } else {
        const filterDesc = argv.project ? ` for project #${argv.project}` : '';
        const statusDesc = argv.completed ? ' (completed)' : argv.pending ? ' (pending)' : '';
        console.log(`Tasks for ${argv.date}${filterDesc}${statusDesc}:`);
        
        tasks.forEach((task: Task) => {
          const projectTag = task.project ? ` ${task.getProjectTag()}` : '';
          const subtaskInfo = task.hasSubtasks() ? ` (${task.getCompletedSubtasksCount()}/${task.subtasks.length})` : '';
          const idPrefix = argv.ids ? `[${task.id.substring(0, 8)}] ` : '';
          console.log(`- ${idPrefix}[${task.completed ? 'x' : ' '}] ${task.getDisplayDescription()}${projectTag}${subtaskInfo}`);
        });
      }
    }
    process.exit(0);
  })
  .command('delete <id>', 'Delete a task by ID', (yargs: any) => {
    yargs.positional('id', {
      describe: 'The ID of the task to delete',
      type: 'string'
    });
  }, (argv: any) => {
    const taskList = new TaskList();
    if (taskList.deleteTask(argv.id)) {
      console.log(`Task with ID ${argv.id} deleted successfully.`);
    } else {
      console.log(`Task with ID ${argv.id} not found.`);
    }
    process.exit(0);
  })
  .command('edit <id> <newDescription>', 'Edit a task description by ID', (yargs: any) => {
    yargs.positional('id', {
      describe: 'The ID of the task to edit',
      type: 'string'
    });
    yargs.positional('newDescription', {
      describe: 'The new description for the task',
      type: 'string'
    });
  }, (argv: any) => {
    const taskList = new TaskList();
    if (taskList.editTask(argv.id, argv.newDescription)) {
      console.log(`Task with ID ${argv.id} updated successfully.`);
    } else {
      console.log(`Task with ID ${argv.id} not found.`);
    }
    process.exit(0);
  })
  .command('calendar [days]', 'Show tasks in calendar view', (yargs: any) => {
    yargs.positional('days', {
      describe: 'Number of days to show (default: 7)',
      type: 'number',
      default: 7
    })
    .option('project', {
      alias: 'p',
      describe: 'Filter by project name (without #)',
      type: 'string'
    })
    .option('ids', {
      describe: 'Show task IDs (useful for delete/edit commands)',
      type: 'boolean',
      default: false
    });
  }, (argv: any) => {
    const taskList = new TaskList();
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + argv.days - 1);
    
    const startDateStr = today.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    let tasks = taskList.getTasksInDateRange(startDateStr, endDateStr);
    
    // Apply project filter if specified
    if (argv.project) {
      tasks = tasks.filter(task => task.project === argv.project);
    }
    
    // Group tasks by date
    const tasksByDate: { [date: string]: Task[] } = {};
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      tasksByDate[dateStr] = [];
    }
    
    tasks.forEach(task => {
      if (!tasksByDate[task.date]) {
        tasksByDate[task.date] = [];
      }
      tasksByDate[task.date].push(task);
    });
    
    // Display calendar
    const filterDesc = argv.project ? ` for project #${argv.project}` : '';
    if (filterDesc) {
      console.log(`Calendar view${filterDesc}:\n`);
    }
    
    Object.keys(tasksByDate).forEach(date => {
      const dateObj = new Date(date + 'T00:00:00');
      const isToday = date === today.toISOString().slice(0, 10);
      const dayLabel = isToday ? ' (Today)' : '';
      
      console.log(`${dateObj.toDateString()}${dayLabel}:`);
      
      if (tasksByDate[date].length === 0) {
        if (argv.project) {
          console.log('  No tasks for this project');
        } else {
          console.log('  No tasks');
        }
      } else {
        tasksByDate[date].forEach((task: Task) => {
          const status = task.completed ? 'x' : ' ';
          const projectTag = task.project ? ` ${task.getProjectTag()}` : '';
          const subtaskInfo = task.hasSubtasks() ? ` (${task.getCompletedSubtasksCount()}/${task.subtasks.length})` : '';
          const idPrefix = argv.ids ? `[${task.id.substring(0, 8)}] ` : '';
          console.log(`  - ${idPrefix}[${status}] ${task.getDisplayDescription()}${projectTag}${subtaskInfo}`);
        });
      }
      console.log(''); // Add blank line between dates
    });
    process.exit(0);
  })
  .command('projects', 'List all projects', {}, async (argv: any) => {
    const authService = AuthService.getInstance();
    await authService.initialize();
    
    const taskList = authService.isAuthenticated() ? new CloudTaskList() : new TaskList();
    
    if (authService.isAuthenticated()) {
      await (taskList as CloudTaskList).syncFromCloud();
    }
    
    const projects = taskList.getAllProjects();
    
    if (projects.length === 0) {
      console.log('No projects found. Create tasks with #projectname to organize by project.');
    } else {
      console.log('Projects:');
      projects.forEach(project => {
        const projectTasks = taskList.getTasksByProject(project);
        const completedCount = projectTasks.filter(t => t.completed).length;
        console.log(`  #${project} (${completedCount}/${projectTasks.length} completed)`);
      });
    }
    process.exit(0);
  })
  .command('logout', 'Sign out from your account', {}, async (argv: any) => {
    const authService = AuthService.getInstance();
    await authService.initialize();
    
    if (!authService.isAuthenticated()) {
      console.log('You are not signed in.');
      process.exit(0);
    }
    
    const result = await authService.signOut();
    if (result.success) {
      console.log('Successfully signed out.');
    } else {
      console.log('Error signing out:', result.error);
    }
    process.exit(0);
  })
  .command('sync', 'Sync tasks with cloud', {}, async (argv: any) => {
    const authService = AuthService.getInstance();
    await authService.initialize();
    
    if (!authService.isAuthenticated()) {
      console.log('You must be signed in to sync with cloud.');
      process.exit(0);
    }
    
    const taskList = new CloudTaskList();
    console.log('Syncing with cloud...');
    
    const result = await taskList.syncFromCloud();
    if (result.success) {
      console.log('Tasks synced successfully from cloud.');
    } else {
      console.log('Sync failed:', result.error);
    }
    
    process.exit(0);
  })
  .command('status', 'Show TASK.SH service status and account info', {}, async (argv: any) => {
    const authService = AuthService.getInstance();
    await authService.initialize();
    
    console.log('🌟 TASK.SH Cloud Service Status:');
    console.log('  Service: ✅ Online and ready');
    console.log('  Features: Full sync, cross-device access, backup');
    console.log('');
    
    if (authService.isAuthenticated()) {
      console.log('📱 Your Account:');
      console.log(`  Email: ${authService.getUserEmail()}`);
      console.log('  Status: ✅ Signed in');
      console.log('  Sync: 🔄 Active');
      console.log('');
      console.log('💡 Use "/logout" in interactive mode or "todo logout" to sign out');
    } else {
      console.log('🔐 Account Status: Not signed in');
      console.log('');
      console.log('To get started with cloud sync:');
      console.log('  1. Launch interactive mode: todo');
      console.log('  2. Type: /login');
      console.log('  3. Create account or sign in');
      console.log('');
      console.log('✨ Cloud features:');
      console.log('  • Sync tasks across all devices');
      console.log('  • Automatic backup');
      console.log('  • Access from anywhere');
    }
    
    process.exit(0);
  })
  .command(apiCommand)
  .help()
  .alias('h', 'help')
  .parse(process.argv.slice(2), (err: any, argv: any, output: string) => {
    if (output) {
      console.log(output);
      return;
    }

    if (argv._.length === 0) {
      // If no command is provided, launch the interactive UI
      render(<TodoApp />);
    }
  });