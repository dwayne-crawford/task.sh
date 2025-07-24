import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import { TaskList } from '../task-list.js';
import { CloudTaskList } from '../cloud-task-list.js';
import { AuthService } from '../auth.js';
import { Task, SubTask } from '../task.js';
import { EditModal } from './EditModal.js';
import { MultilineInput } from './MultilineInput.js';
import { LoginScreen } from './LoginScreen.js';
import { HelpScreen } from './HelpScreen.js';
import { ProjectsScreen } from './ProjectsScreen.js';
import { CalendarScreen } from './CalendarScreen.js';
import { ListScreen } from './ListScreen.js';
import { CommandMenu } from './CommandMenu.js';
import { Submenu } from './Submenu.js';

export function TodoApp() {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [authService] = useState(() => AuthService.getInstance());
  const [taskList, setTaskList] = useState(() => {
    const auth = AuthService.getInstance();
    return auth.isAuthenticated() ? new CloudTaskList() : new TaskList();
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [useMultilineInput, setUseMultilineInput] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState({ online: true, authenticated: false, pendingChanges: 0 });
  const [showLoginScreen, setShowLoginScreen] = useState(false); // Don't show login by default
  const [showHelpScreen, setShowHelpScreen] = useState(false);
  const [showProjectsScreen, setShowProjectsScreen] = useState(false);
  const [showCalendarScreen, setShowCalendarScreen] = useState(false);
  const [showListScreen, setShowListScreen] = useState(false);
  const [showTaskIds, setShowTaskIds] = useState(false);
  const [slashCommand, setSlashCommand] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [commandMenuVisible, setCommandMenuVisible] = useState(false);
  const [commandMenuIndex, setCommandMenuIndex] = useState(0);
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [submenuIndex, setSubmenuIndex] = useState(0);
  const [activeCommand, setActiveCommand] = useState<{ command: string, description: string, params?: any[] } | null>(null);

  const loadTasks = (preserveSelection: boolean = false, customTaskList?: any) => {
    const currentTaskList = customTaskList || taskList;
    const dateTasks = currentTaskList.getTasksByDate(currentDate);
    setTasks(dateTasks);
    if (!preserveSelection) {
      setSelectedIndex(0);
    }
  };

  const updateSyncStatus = (shouldReloadTasks: boolean = false) => {
    const authenticated = authService.isAuthenticated();
    const email = authService.getUserEmail();
    
    setIsAuthenticated(authenticated);
    setUserEmail(email);
    
    // Switch task list based on authentication status
    const currentTaskList = authenticated ? new CloudTaskList() : new TaskList();
    setTaskList(currentTaskList);
    
    if (currentTaskList instanceof CloudTaskList) {
      const status = currentTaskList.getConnectionStatus();
      const pendingChanges = currentTaskList.getOfflineChangesCount();
      setSyncStatus({
        online: status.online,
        authenticated: status.authenticated,
        pendingChanges
      });
    } else {
      setSyncStatus({ online: false, authenticated: false, pendingChanges: 0 });
    }
    
    // Reload tasks with the new task list if requested
    if (shouldReloadTasks) {
      loadTasks(false, currentTaskList);
    }
  };

  const handleLogout = async () => {
    const result = await authService.signOut();
    if (result.success) {
      updateSyncStatus(true);
    } else {
      console.error('Logout failed:', result.error);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginScreen(false);
    updateSyncStatus(true);
  };

  const handleLoginCancel = () => {
    setShowLoginScreen(false);
  };

  const handleSlashCommand = (command: string) => {
    const parts = command.trim().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case '/help':
        setShowHelpScreen(true);
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/login':
        setShowLoginScreen(true);
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/logout':
        handleLogout();
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/add':
        {
          // Helper function to validate date format
          const isValidDate = (dateStr: string): boolean => {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateStr)) return false;
            const date = new Date(dateStr);
            return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateStr;
          };

          // Helper function to reset command state
          const resetCommandState = () => {
            setSlashCommand('');
            setCommandMenuVisible(false);
            setSubmenuVisible(false);
            setActiveCommand(null);
          };

          if (args.length === 0) {
            console.log('❌ Task description required');
            console.log('💡 Usage: /add <description> [--date YYYY-MM-DD]');
            console.log('💡 Example: /add "Buy groceries" --date 2025-01-15');
            resetCommandState();
            return;
          }

          // Parse command arguments
          let taskDescription = '';
          let taskDate = currentDate;
          let hasDateFlag = false;
          
          const dateIndex = args.findIndex(arg => arg === '--date' || arg === '-d');
          if (dateIndex !== -1) {
            hasDateFlag = true;
            if (dateIndex >= args.length - 1) {
              console.log('❌ Date value missing after --date flag');
              console.log('💡 Usage: /add <description> --date YYYY-MM-DD');
              resetCommandState();
              return;
            }
            
            const providedDate = args[dateIndex + 1];
            if (!isValidDate(providedDate)) {
              console.log(`❌ Invalid date format: "${providedDate}"`);
              console.log('💡 Date must be in YYYY-MM-DD format (e.g., 2025-01-15)');
              resetCommandState();
              return;
            }
            
            taskDate = providedDate;
            const filteredArgs = [...args];
            filteredArgs.splice(dateIndex, 2); // Remove --date and the date value
            taskDescription = filteredArgs.join(' ');
          } else {
            taskDescription = args.join(' ');
          }
          
          const trimmedDescription = taskDescription.trim();
          if (!trimmedDescription) {
            console.log('❌ Task description cannot be empty');
            console.log('💡 Provide a meaningful task description');
            resetCommandState();
            return;
          }

          // Add the task
          try {
            taskList.addTask(trimmedDescription, taskDate);
            loadTasks();
            
            // Find and select the newly added task
            const newTasks = taskList.getTasksByDate(taskDate);
            const newTask = newTasks.find((t: any) => t.description === trimmedDescription);
            if (newTask) {
              const allVisibleItems = buildVisibleItems();
              const newTaskIndex = allVisibleItems.findIndex(item => 
                item.type === 'task' && item.task.id === newTask.id
              );
              if (newTaskIndex !== -1) {
                setSelectedIndex(newTaskIndex);
              }
            }
            
            const dateInfo = hasDateFlag ? ` for ${taskDate}` : '';
            console.log(`✅ Task added${dateInfo}: "${trimmedDescription}"`);
          } catch (error) {
            console.log('❌ Failed to add task. Please try again.');
          }
          
          resetCommandState();
        }
        break;
      
      case '/delete':
        {
          // Helper function to reset command state
          const resetCommandState = () => {
            setSlashCommand('');
            setCommandMenuVisible(false);
            setSubmenuVisible(false);
            setActiveCommand(null);
          };

          // Helper function to adjust selection after deletion
          const adjustSelectionAfterDelete = (deletedTaskIndex: number) => {
            const remainingItems = buildVisibleItems().length - 1; // -1 for the deleted item
            if (remainingItems === 0) {
              setSelectedIndex(0);
            } else if (selectedIndex >= remainingItems) {
              setSelectedIndex(remainingItems - 1);
            }
            // Otherwise keep current selection index
          };

          if (args.length === 0) {
            // Delete selected task
            const visibleItems = buildVisibleItems();
            
            if (visibleItems.length === 0) {
              console.log('❌ No tasks available to delete');
              console.log('💡 Add some tasks first with: /add <description>');
              resetCommandState();
              return;
            }
            
            if (selectedIndex >= visibleItems.length) {
              console.log('❌ No task currently selected');
              console.log('💡 Use arrow keys to select a task, then try /delete again');
              resetCommandState();
              return;
            }

            const item = visibleItems[selectedIndex];
            if (item.type !== 'task') {
              console.log('❌ Cannot delete subtask directly');
              console.log('💡 Select the main task to delete it entirely, or use: /delete <task-id>');
              resetCommandState();
              return;
            }

            const taskToDelete = item.task;
            const hasSubtasks = taskToDelete.hasSubtasks();
            const subtaskCount = hasSubtasks ? taskToDelete.subtasks.length : 0;
            
            try {
              if (taskList.deleteTask(taskToDelete.id)) {
                adjustSelectionAfterDelete(selectedIndex);
                loadTasks();
                
                let deleteMessage = `✅ Task deleted: "${taskToDelete.description}"`;
                if (hasSubtasks) {
                  deleteMessage += ` (including ${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''})`;
                }
                console.log(deleteMessage);
              } else {
                console.log('❌ Failed to delete task. Please try again.');
              }
            } catch (error) {
              console.log('❌ Error deleting task. Please try again.');
            }
          } else {
            // Delete by ID
            const taskId = args[0];
            const taskToDelete = tasks.find(t => t.id === taskId);
            
            if (!taskToDelete) {
              console.log(`❌ Task ID "${taskId}" not found`);
              console.log('💡 Use /ids to show task IDs, or /delete without parameters to delete selected task');
              resetCommandState();
              return;
            }

            const hasSubtasks = taskToDelete.hasSubtasks();
            const subtaskCount = hasSubtasks ? taskToDelete.subtasks.length : 0;
            
            // Show what will be deleted
            console.log(`🗑️ Deleting: "${taskToDelete.description}"`);
            if (hasSubtasks) {
              console.log(`   ⚠️ This will also delete ${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}`);
            }
            
            try {
              if (taskList.deleteTask(taskId)) {
                loadTasks();
                
                let deleteMessage = `✅ Task deleted: "${taskToDelete.description}"`;
                if (hasSubtasks) {
                  deleteMessage += ` (including ${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''})`;
                }
                console.log(deleteMessage);
              } else {
                console.log('❌ Failed to delete task. Please try again.');
              }
            } catch (error) {
              console.log('❌ Error deleting task. Please try again.');
            }
          }
          
          resetCommandState();
        }
        break;
      
      case '/edit':
        {
          // Helper function to reset command state
          const resetCommandState = () => {
            setSlashCommand('');
            setCommandMenuVisible(false);
            setSubmenuVisible(false);
            setActiveCommand(null);
          };

          // Helper function to validate description
          const isValidDescription = (desc: string): boolean => {
            const trimmed = desc.trim();
            return trimmed.length > 0 && trimmed.length <= 500; // Reasonable max length
          };

          if (args.length === 0) {
            // Edit selected task using interactive edit mode
            const visibleItems = buildVisibleItems();
            if (visibleItems.length === 0) {
              console.log('❌ No tasks available to edit');
              console.log('💡 Add some tasks first with: /add <description>');
              resetCommandState();
              return;
            }
            
            if (selectedIndex >= visibleItems.length) {
              console.log('❌ No task currently selected');
              console.log('💡 Use arrow keys to select a task, then try /edit again');
              resetCommandState();
              return;
            }

            const item = visibleItems[selectedIndex];
            if (item.type !== 'task') {
              console.log('❌ Cannot edit subtask directly');
              console.log('💡 Select the main task instead, or use: /edit <task-id> <new-description>');
              resetCommandState();
              return;
            }

            // Switch to interactive edit mode
            console.log(`📝 Editing: "${item.task.description}"`);
            startEdit();
            resetCommandState();
            return;
          }

          if (args.length === 1) {
            const taskId = args[0];
            const task = tasks.find(t => t.id === taskId);
            if (task) {
              console.log('❌ New description required');
              console.log(`💡 Usage: /edit ${taskId} <new description>`);
              console.log(`💡 Current: "${task.description}"`);
            } else {
              console.log(`❌ Task ID "${taskId}" not found`);
              console.log('💡 Use /ids to show task IDs, or /edit without parameters to edit selected task');
            }
            resetCommandState();
            return;
          }

          // Edit by ID and description
          const taskId = args[0];
          const newDescription = args.slice(1).join(' ').trim();
          
          if (!isValidDescription(newDescription)) {
            console.log('❌ Invalid task description');
            if (newDescription.length === 0) {
              console.log('💡 Description cannot be empty');
            } else if (newDescription.length > 500) {
              console.log('💡 Description too long (max 500 characters)');
            }
            resetCommandState();
            return;
          }

          const taskToEdit = tasks.find(t => t.id === taskId);
          if (!taskToEdit) {
            console.log(`❌ Task ID "${taskId}" not found`);
            console.log('💡 Use /ids to show task IDs');
            resetCommandState();
            return;
          }

          const oldDescription = taskToEdit.description;
          if (oldDescription === newDescription) {
            console.log('ℹ️ No changes made - descriptions are identical');
            resetCommandState();
            return;
          }

          try {
            if (taskList.editTask(taskId, newDescription)) {
              loadTasks(true); // Preserve selection
              console.log(`✅ Task updated successfully`);
              console.log(`   Old: "${oldDescription}"`);
              console.log(`   New: "${newDescription}"`);
            } else {
              console.log('❌ Failed to update task. Please try again.');
            }
          } catch (error) {
            console.log('❌ Error updating task. Please try again.');
          }
          
          resetCommandState();
        }
        break;
      
      case '/projects':
        setShowProjectsScreen(true);
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/sync':
        if (taskList instanceof CloudTaskList) {
          (taskList as CloudTaskList).syncFromCloud().then(result => {
            if (result.success) {
              loadTasks();
              console.log('Sync successful');
            } else {
              console.log('Sync failed:', result.error);
            }
          });
        } else {
          console.log('Must be logged in to sync');
        }
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/calendar':
        setShowCalendarScreen(true);
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/list':
        setShowListScreen(true);
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/ids':
        setShowTaskIds(!showTaskIds);
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      case '/status':
        // Show service and account status
        if (authService.isAuthenticated()) {
          console.log('🌟 TASK.SH: Online • Account:', authService.getUserEmail());
        } else {
          console.log('🌟 TASK.SH: Online • Account: Not signed in (use /login)');
        }
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
        break;
      
      default:
        // Unknown command - could show error
        console.log(`Unknown command: ${cmd}`);
        setSlashCommand('');
        setCommandMenuVisible(false);
        setSubmenuVisible(false);
        setActiveCommand(null);
    }
  };

  const availableCommands = [
    { command: '/help', description: 'Show help screen' },
    { command: '/login', description: 'Login to your account' },
    { command: '/logout', description: 'Logout from your account' },
    { command: '/add', description: 'Add a new task', params: [
      { name: '<description>', description: 'The task description (required)', required: true, paramType: 'placeholder' },
      { name: '--date', alias: '-d', description: 'Date for the task (YYYY-MM-DD format)', type: 'string', paramType: 'flag' },
      { name: 'Examples', description: '/add "Buy groceries" | /add "Meeting" --date 2025-01-15', paramType: 'example' }
    ]},
    { command: '/delete', description: 'Delete a task (or use /delete to delete selected)', params: [
      { name: '<id>', description: 'Task ID (optional if task selected)', required: false, paramType: 'placeholder' },
      { name: 'Examples', description: '/delete | /delete abc123 | Use /ids to show task IDs', paramType: 'example' }
    ]},
    { command: '/edit', description: 'Edit a task (or use /edit to edit selected)', params: [
      { name: '<id>', description: 'Task ID (optional if task selected)', required: false, paramType: 'placeholder' },
      { name: '<new-description>', description: 'New task description', required: false, paramType: 'placeholder' },
      { name: 'Examples', description: '/edit | /edit abc123 "Updated task" | Select task first for modal edit', paramType: 'example' }
    ]},
    { command: '/projects', description: 'List all projects' },
    { command: '/sync', description: 'Sync tasks with the cloud' },
    { command: '/calendar', description: 'Show calendar view', params: [
      { name: '[days]', description: 'Number of days to show (default: 7)', type: 'number', paramType: 'placeholder' },
      { name: '--project', alias: '-p', description: 'Filter by project name (without #)', type: 'string', paramType: 'flag' },
      { name: '--ids', description: 'Show task IDs', type: 'boolean', paramType: 'flag' },
      { name: 'Examples', description: '/calendar | /calendar 14 --project work --ids', paramType: 'example' }
    ]},
    { command: '/list', description: 'List all todo tasks', params: [
      { name: '[date]', description: 'Date to list tasks for (YYYY-MM-DD)', type: 'string', paramType: 'placeholder' },
      { name: '--all', alias: '-a', description: 'Show tasks from all dates', type: 'boolean', paramType: 'flag' },
      { name: '--project', alias: '-p', description: 'Filter by project name (without #)', type: 'string', paramType: 'flag' },
      { name: '--completed', description: 'Show only completed tasks', type: 'boolean', paramType: 'flag' },
      { name: '--pending', description: 'Show only pending (incomplete) tasks', type: 'boolean', paramType: 'flag' },
      { name: '--ids', description: 'Show task IDs', type: 'boolean', paramType: 'flag' },
      { name: 'Examples', description: '/list | /list 2025-01-15 | /list --all --project work', paramType: 'example' }
    ]},
    { command: '/ids', description: 'Toggle task IDs' },
    { command: '/status', description: 'Show service status' },
  ];

  // Build flat list of all visible items (tasks + expanded subtasks)
  const buildVisibleItems = () => {
    const items: Array<{type: 'task' | 'subtask', task: Task, subtask?: SubTask, index: number}> = [];
    
    tasks.forEach((task, taskIndex) => {
      items.push({ type: 'task', task, index: taskIndex });
      
      if (task.isExpanded && task.hasSubtasks()) {
        task.subtasks.forEach((subtask) => {
          items.push({ type: 'subtask', task, subtask, index: taskIndex });
        });
      }
    });
    
    return items;
  };

  useEffect(() => {
    loadTasks();
  }, [currentDate]);

  useEffect(() => {
    // Initialize auth status on component mount
    const initializeApp = async () => {
      await authService.initialize();
      const authenticated = authService.isAuthenticated();
      
      setIsAuthenticated(authenticated);
      setUserEmail(authService.getUserEmail());
      setIsInitialized(true);
      
      updateSyncStatus();
    };
    
    initializeApp();
  }, []);

  // Ensure selection is always valid
  useEffect(() => {
    const visibleItems = buildVisibleItems();
    if (visibleItems.length > 0 && selectedIndex >= visibleItems.length) {
      setSelectedIndex(Math.max(0, visibleItems.length - 1));
    }
  }, [tasks, selectedIndex]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today) {
      return `${date.toDateString()} (Today)`;
    } else if (dateStr === yesterday.toISOString().slice(0, 10)) {
      return `${date.toDateString()} (Yesterday)`;
    } else if (dateStr === tomorrow.toISOString().slice(0, 10)) {
      return `${date.toDateString()} (Tomorrow)`;
    } else {
      return date.toDateString();
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(currentDate);
    if (direction === 'prev') {
      date.setDate(date.getDate() - 1);
    } else {
      date.setDate(date.getDate() + 1);
    }
    setCurrentDate(date.toISOString().slice(0, 10));
  };

  const toggleTask = () => {
    const visibleItems = buildVisibleItems();
    if (visibleItems.length > 0 && selectedIndex < visibleItems.length) {
      const item = visibleItems[selectedIndex];
      if (item.type === 'task') {
        taskList.toggleTaskCompletion(item.task.id);
      } else if (item.type === 'subtask' && item.subtask) {
        taskList.toggleSubtaskCompletion(item.task.id, item.subtask.id);
      }
      loadTasks(true); // Preserve selection
    }
  };

  const deleteTask = () => {
    const visibleItems = buildVisibleItems();
    if (visibleItems.length > 0 && selectedIndex < visibleItems.length) {
      const item = visibleItems[selectedIndex];
      if (item.type === 'task') {
        taskList.deleteTask(item.task.id);
      } else if (item.type === 'subtask' && item.subtask) {
        taskList.deleteSubtask(item.task.id, item.subtask.id);
      }
      loadTasks(true); // Preserve selection initially
      // Adjust selection if we deleted the last item
      const newVisibleItems = buildVisibleItems();
      if (selectedIndex >= newVisibleItems.length && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    }
  };

  const startEdit = () => {
    const visibleItems = buildVisibleItems();
    if (visibleItems.length > 0 && selectedIndex < visibleItems.length) {
      const item = visibleItems[selectedIndex];
      if (item.type === 'task') {
        setEditingTask(item.task);
        setIsEditing(true);
      }
      // Note: We don't allow editing subtasks directly for now
    }
  };

  const saveEdit = (newDescription: string) => {
    if (editingTask) {
      taskList.editTask(editingTask.id, newDescription);
      loadTasks(true); // Preserve selection
    }
    setIsEditing(false);
    setEditingTask(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingTask(null);
  };

  const addNewTask = () => {
    if (newTaskInput.trim()) {
      taskList.addTask(newTaskInput.trim(), currentDate);
      setNewTaskInput('');
      setIsAddingTask(false);
      loadTasks();
    }
  };

  const addTaskWithSubtasks = (mainTask: string, subtasks: string[]) => {
    taskList.addTaskWithSubtasks(mainTask, currentDate, subtasks);
    setIsAddingTask(false);
    setUseMultilineInput(false);
    loadTasks();
  };

  const startAddingTask = (multiline: boolean = false) => {
    setIsAddingTask(true);
    setUseMultilineInput(multiline);
    setNewTaskInput('');
  };

  const cancelAddingTask = () => {
    setIsAddingTask(false);
    setUseMultilineInput(false);
    setNewTaskInput('');
  };

  const toggleTaskExpansion = () => {
    const visibleItems = buildVisibleItems();
    if (visibleItems.length > 0 && selectedIndex < visibleItems.length) {
      const item = visibleItems[selectedIndex];
      if (item.type === 'task' && item.task.hasSubtasks()) {
        taskList.toggleTaskExpansion(item.task.id);
        loadTasks(true); // Preserve selection
      }
    }
  };

  useInput((input: string, key: any) => {
    // Handle help screen closure
    if (showHelpScreen) {
      setShowHelpScreen(false);
      return;
    }

    // Handle projects screen closure
    if (showProjectsScreen) {
      setShowProjectsScreen(false);
      return;
    }

    // Handle calendar screen closure
    if (showCalendarScreen) {
      setShowCalendarScreen(false);
      return;
    }

    // Handle list screen closure
    if (showListScreen) {
      setShowListScreen(false);
      return;
    }

    // Handle Esc key in adding task mode
    if (isAddingTask && key.escape) {
      cancelAddingTask();
      return;
    }
    
    // Handle slash command input
    if (slashCommand.length > 0) {
      if (key.escape) {
        if (submenuVisible) {
          setSubmenuVisible(false);
          setSubmenuIndex(0);
          return;
        }
        setSlashCommand('');
        setCommandMenuVisible(false);
        return;
      }
      if (key.return) {
        if (submenuVisible) {
          const selectedParam = activeCommand?.params?.[submenuIndex];
          if (selectedParam) {
            if (selectedParam.paramType === 'example') {
              // Example entries are informational only, don't modify command
              return;
            } else if (selectedParam.paramType === 'placeholder') {
              // For placeholder params, add a space to indicate where user should type
              const currentCommand = slashCommand.trim();
              if (!currentCommand.includes(' ')) {
                setSlashCommand(prev => `${prev} `);
              }
              // Keep submenu visible for continued parameter selection
            } else {
              // For flag params, add them to the command
              const flag = selectedParam.name;
              const currentCommand = slashCommand.trim();
              
              // Check if flag already exists
              if (!currentCommand.includes(flag)) {
                if (selectedParam.type === 'boolean') {
                  // Boolean flags don't need values
                  setSlashCommand(prev => `${prev} ${flag}`);
                } else {
                  // String/number flags need values - add flag and space for value
                  setSlashCommand(prev => `${prev} ${flag} `);
                }
              }
              // Keep submenu visible for additional parameters
            }
          }
        } else if (commandMenuVisible) {
          const filteredCommands = availableCommands.filter(cmd => cmd.command.startsWith(slashCommand));
          const selectedCommand = filteredCommands[commandMenuIndex];
          console.log('🔍 Selected command:', selectedCommand.command, 'Has params:', selectedCommand.params?.length || 0);
          
          if (selectedCommand.params && selectedCommand.params.length > 0) {
            console.log('✅ Activating submenu for:', selectedCommand.command);
            setSlashCommand(selectedCommand.command);
            setActiveCommand(selectedCommand);
            setSubmenuVisible(true);
            setSubmenuIndex(0);
            setCommandMenuVisible(false);
            console.log('🎯 Submenu should now be visible');
          } else {
            console.log('⏩ Executing parameterless command:', selectedCommand.command);
            setSlashCommand(selectedCommand.command);
            setCommandMenuVisible(false);
            setSubmenuVisible(false);
            setActiveCommand(null);
            // Execute command immediately for parameterless commands
            setTimeout(() => handleSlashCommand(selectedCommand.command), 0);
          }
        } else {
          // Execute the current command
          handleSlashCommand(slashCommand);
        }
        return;
      }
      if (key.upArrow) {
        if (submenuVisible) {
          setSubmenuIndex(Math.max(0, submenuIndex - 1));
        } else if (commandMenuVisible) {
          setCommandMenuIndex(Math.max(0, commandMenuIndex - 1));
        }
        return;
      }
      if (key.downArrow) {
        if (submenuVisible) {
          setSubmenuIndex(Math.min((activeCommand?.params?.length || 0) - 1, submenuIndex + 1));
        } else if (commandMenuVisible) {
          setCommandMenuIndex(Math.min(availableCommands.filter(cmd => cmd.command.startsWith(slashCommand)).length - 1, commandMenuIndex + 1));
        }
        return;
      }
      if (key.backspace || key.delete) {
        const newCommand = slashCommand.slice(0, -1);
        setSlashCommand(newCommand);

        if (newCommand.length === 0) {
          setCommandMenuVisible(false);
          setSubmenuVisible(false);
          setActiveCommand(null);
        } else if (activeCommand) {
          // Check if we're still typing the base command or its parameters
          const baseCommand = activeCommand.command;
          const commandPart = newCommand.split(' ')[0];
          const hasSpace = newCommand.includes(' ');
          
          if (commandPart === baseCommand && hasSpace) {
            // Still within the same command with space, keep submenu visible
            setSubmenuVisible(true);
            setCommandMenuVisible(false);
          } else if (commandPart === baseCommand && !hasSpace) {
            // Just the command without space, hide submenu but keep active command
            setSubmenuVisible(false);
            setCommandMenuVisible(false);
          } else if (baseCommand.startsWith(commandPart)) {
            // Backspacing through the command itself
            setSubmenuVisible(false);
            setActiveCommand(null);
            const matchingCommands = availableCommands.filter(cmd => cmd.command.startsWith(newCommand));
            if (matchingCommands.length > 0) {
              setCommandMenuVisible(true);
              setCommandMenuIndex(0);
            } else {
              setCommandMenuVisible(false);
            }
          } else {
            // Command changed completely
            setSubmenuVisible(false);
            setActiveCommand(null);
            const matchingCommands = availableCommands.filter(cmd => cmd.command.startsWith(newCommand));
            if (matchingCommands.length > 0) {
              setCommandMenuVisible(true);
              setCommandMenuIndex(0);
            } else {
              setCommandMenuVisible(false);
            }
          }
        } else {
          // No active command, control main menu visibility
          const matchingCommands = availableCommands.filter(cmd => cmd.command.startsWith(newCommand));
          if (matchingCommands.length > 0) {
            setCommandMenuVisible(true);
            setCommandMenuIndex(0);
          } else {
            setCommandMenuVisible(false);
          }
        }
        return;
      }
      if (input) {
        const newCommand = slashCommand + input;
        setSlashCommand(newCommand);

        // Check if typing matches any complete command + space pattern
        const commandPart = newCommand.split(' ')[0];
        const hasSpace = newCommand.includes(' ');
        const matchingCommand = availableCommands.find(cmd => cmd.command === commandPart);
        
        if (matchingCommand && hasSpace && matchingCommand.params && matchingCommand.params.length > 0) {
          // Typing parameters for a command with params - show submenu
          setActiveCommand(matchingCommand);
          setSubmenuVisible(true);
          setCommandMenuVisible(false);
          console.log('🎯 Showing submenu for:', matchingCommand.command, 'while typing params');
        } else if (activeCommand) {
          const currentCommandPart = newCommand.split(' ')[0];
          if (currentCommandPart === activeCommand.command && hasSpace) {
            // Keep submenu visible while typing parameters for the active command
            setSubmenuVisible(true);
            setCommandMenuVisible(false);
          } else if (activeCommand.command.startsWith(currentCommandPart)) {
            // Still typing the base command
            setSubmenuVisible(false);
            setActiveCommand(null);
            const matchingCommands = availableCommands.filter(cmd => cmd.command.startsWith(newCommand));
            if (matchingCommands.length > 0) {
              setCommandMenuVisible(true);
              setCommandMenuIndex(0);
            } else {
              setCommandMenuVisible(false);
            }
          } else {
            // Command changed completely, reset submenu and show main menu if applicable
            setSubmenuVisible(false);
            setActiveCommand(null);
            const matchingCommands = availableCommands.filter(cmd => cmd.command.startsWith(newCommand));
            if (matchingCommands.length > 0) {
              setCommandMenuVisible(true);
              setCommandMenuIndex(0);
            } else {
              setCommandMenuVisible(false);
            }
          }
        } else {
          // No active command with submenu, control main command menu visibility
          const matchingCommands = availableCommands.filter(cmd => cmd.command.startsWith(newCommand));
          if (matchingCommands.length > 0) {
            setCommandMenuVisible(true);
            setCommandMenuIndex(0);
          } else {
            setCommandMenuVisible(false);
          }
        }
        return;
      }
        return;
      }
    
    // Start slash command if user types '/'
    if (input === '/' && !isEditing && !isAddingTask) {
      setSlashCommand('/');
      setCommandMenuVisible(true);
      setCommandMenuIndex(0);
      return;
    }
    
    // Don't handle other input if we're in edit mode or adding a task
    if (isEditing || isAddingTask) return;

    if (key.leftArrow) {
      navigateDate('prev');
    } else if (key.rightArrow) {
      navigateDate('next');
    } else if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    } else if (key.downArrow) {
      const visibleItems = buildVisibleItems();
      if (selectedIndex < visibleItems.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
    } else if (input === ' ') {
      toggleTask();
    } else if (input === 'e') {
      startEdit();
    } else if (input === 'd') {
      deleteTask();
    } else if (input === 'n') {
      startAddingTask(false);
    } else if (input === 'N') {
      startAddingTask(true);
    } else if (key.tab) {
      toggleTaskExpansion();
    } else if (input === 'i') {
      setShowTaskIds(!showTaskIds);
    } else if (key.escape) {
      process.exit(0);
    }
  });

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <Box justifyContent="center" alignItems="center" padding={2}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (showLoginScreen) {
    return (
      <LoginScreen 
        onLoginSuccess={handleLoginSuccess}
        onCancel={handleLoginCancel}
      />
    );
  }

  if (showHelpScreen) {
    return (
      <HelpScreen 
        onClose={() => setShowHelpScreen(false)}
      />
    );
  }

  if (showProjectsScreen) {
    return (
      <ProjectsScreen 
        taskList={taskList}
        onClose={() => setShowProjectsScreen(false)}
      />
    );
  }

  if (showCalendarScreen) {
    return (
      <CalendarScreen 
        taskList={taskList}
        onClose={() => setShowCalendarScreen(false)}
      />
    );
  }

  if (showListScreen) {
    return (
      <ListScreen 
        taskList={taskList}
        onClose={() => setShowListScreen(false)}
        initialDate={currentDate}
      />
    );
  }

  const asciiLogo = `
 ███          ███████████   █████████    █████████  █████   ████     █████████  █████   █████
░░░███       ░█░░░███░░░█  ███░░░░░███  ███░░░░░███░░███   ███░     ███░░░░░███░░███   ░░███ 
  ░░░███     ░   ░███  ░  ░███    ░███ ░███    ░░░  ░███  ███      ░███    ░░░  ░███    ░███ 
    ░░░███       ░███     ░███████████ ░░█████████  ░███████       ░░█████████  ░███████████ 
     ███░        ░███     ░███░░░░░███  ░░░░░░░░███ ░███░░███       ░░░░░░░░███ ░███░░░░░███ 
   ███░          ░███     ░███    ░███  ███    ░███ ░███ ░░███      ███    ░███ ░███    ░███ 
 ███░            █████    █████   █████░░█████████  █████ ░░████ ██░░█████████  █████   █████
░░░             ░░░░░    ░░░░░   ░░░░░  ░░░░░░░░░  ░░░░░   ░░░░ ░░  ░░░░░░░░░  ░░░░░   ░░░░░ 
  `;

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="blue">{asciiLogo}</Text>
      </Box>
      
      {/* Date Navigation */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color="gray">← </Text>
        <Text bold>{formatDate(currentDate)}</Text>
        <Text color="gray"> →</Text>
      </Box>
      
      {/* Tasks */}
      <Box flexDirection="column" marginBottom={1}>
        {tasks.length === 0 ? (
          <Box justifyContent="center">
            <Text color="gray">No tasks for this date</Text>
          </Box>
        ) : (
          (() => {
            const visibleItems = buildVisibleItems();
            return visibleItems.map((item, index) => (
              <Box key={`${item.type}-${item.task.id}-${item.subtask?.id || index}`} marginBottom={0}>
                <Text color={index === selectedIndex ? 'yellow' : undefined}>
                  {index === selectedIndex ? '> ' : '  '}
                  {item.type === 'task' ? (
                    <>
                      {showTaskIds && <Text color="gray">[{item.task.id.substring(0, 8)}] </Text>}
                      [{item.task.completed ? chalk.green('✓') : ' '}] {item.task.getDisplayDescription()}
                      {item.task.project && (
                        <Text color="blue"> {item.task.getProjectTag()}</Text>
                      )}
                      {item.task.hasSubtasks() && (
                        <Text color="gray"> ({item.task.getCompletedSubtasksCount()}/{item.task.subtasks.length}) {item.task.isExpanded ? '[-]' : '[+]'}</Text>
                      )}
                    </>
                  ) : (
                    <Text color="gray">
                      {'    - '}
                      {showTaskIds && `[${item.subtask?.id.substring(0, 8)}] `}
                      [{item.subtask?.completed ? chalk.green('✓') : ' '}] {item.subtask?.description}
                    </Text>
                  )}
                </Text>
              </Box>
            ));
          })()
        )}
      </Box>
      
      {/* Add New Task Input */}
      <Box borderStyle="single" borderColor="blue" padding={1} marginBottom={1}>
        <Box flexDirection="column">
          <Text color="blue" bold>Add New Task:</Text>
          <Box marginTop={1}>
            {isAddingTask ? (
              useMultilineInput ? (
                <MultilineInput
                  onSubmit={addTaskWithSubtasks}
                  onCancel={cancelAddingTask}
                  placeholder="Enter task description..."
                />
              ) : (
                <Box>
                  <Text>Description: </Text>
                  <TextInput
                    value={newTaskInput}
                    onChange={setNewTaskInput}
                    onSubmit={addNewTask}
                    placeholder="Enter task description..."
                  />
                </Box>
              )
            ) : (
              <Text color="gray">Press 'n' to add task, Shift+N for task with subtasks</Text>
            )}
          </Box>
          {isAddingTask && !useMultilineInput && (
            <Box marginTop={1}>
              <Text color="gray">Return: Save task | Esc: Cancel</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Auth Status and Help */}
      <Box marginTop={1} justifyContent="space-between">
        <Box>
          {isAuthenticated ? (
            <Text color="green" bold>
              Online - cloud saves enabled ({userEmail})
            </Text>
          ) : (
            <Text color="yellow" bold>
              Offline - tasks saved locally
            </Text>
          )}
        </Box>
        <Box>
          <Text color="gray">/help for more information</Text>
        </Box>
      </Box>

      {/* Slash Command Input */}
      {slashCommand.length > 0 && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="blue">Command: </Text>
          <TextInput
            value={slashCommand}
            onChange={setSlashCommand}
            onSubmit={() => handleSlashCommand(slashCommand)}
          />
          <Text color="gray"> (Return: Execute • Esc: Cancel)</Text>
        </Box>
      )}

      {commandMenuVisible && !submenuVisible && (
        <Box justifyContent="center" marginTop={1}>
          <CommandMenu commands={availableCommands.filter(cmd => cmd.command.startsWith(slashCommand))} selectedIndex={commandMenuIndex} />
        </Box>
      )}

      {submenuVisible && activeCommand && (
        <Box justifyContent="center" marginTop={1}>
          <Submenu params={activeCommand.params || []} selectedIndex={submenuIndex} currentCommand={slashCommand} />
        </Box>
      )}
      
      {/* Debug info - remove in production */}
      {slashCommand.length > 0 && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>
            Debug: submenuVisible={submenuVisible.toString()}, activeCommand={activeCommand?.command || 'null'}, commandMenuVisible={commandMenuVisible.toString()}
          </Text>
        </Box>
      )}

      {/* Edit Modal */}
      {isEditing && editingTask && (
        <EditModal
          task={editingTask}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      )}
    </Box>
  );
}