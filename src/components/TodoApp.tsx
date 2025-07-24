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
        break;
      
      case '/login':
        setShowLoginScreen(true);
        break;
      
      case '/logout':
        handleLogout();
        break;
      
      case '/add':
        if (args.length === 0) {
          // No task provided, start interactive add
          startAddingTask(false);
        } else {
          // Check for --date flag
          let taskDescription = '';
          let taskDate = currentDate;
          
          const dateIndex = args.findIndex(arg => arg === '--date' || arg === '-d');
          if (dateIndex !== -1 && dateIndex < args.length - 1) {
            // Extract date and remove --date flag from args
            taskDate = args[dateIndex + 1];
            const filteredArgs = [...args];
            filteredArgs.splice(dateIndex, 2); // Remove --date and the date value
            taskDescription = filteredArgs.join(' ');
          } else {
            taskDescription = args.join(' ');
          }
          
          if (taskDescription.trim()) {
            taskList.addTask(taskDescription, taskDate);
            loadTasks();
          }
        }
        break;
      
      case '/delete':
        if (args.length === 0) {
          // Delete selected task
          deleteTask();
        } else {
          // Delete by ID
          const taskId = args[0];
          if (taskList.deleteTask(taskId)) {
            loadTasks();
          }
        }
        break;
      
      case '/edit':
        if (args.length === 0) {
          // Edit selected task
          startEdit();
        } else if (args.length >= 2) {
          // Edit by ID and description
          const taskId = args[0];
          const newDescription = args.slice(1).join(' ');
          if (taskList.editTask(taskId, newDescription)) {
            loadTasks();
          }
        }
        break;
      
      case '/projects':
        setShowProjectsScreen(true);
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
        break;
      
      case '/calendar':
        setShowCalendarScreen(true);
        break;
      
      case '/list':
        setShowListScreen(true);
        break;
      
      case '/ids':
        setShowTaskIds(!showTaskIds);
        break;
      
      case '/status':
        // Show service and account status
        if (authService.isAuthenticated()) {
          console.log('🌟 TASK.SH: Online • Account:', authService.getUserEmail());
        } else {
          console.log('🌟 TASK.SH: Online • Account: Not signed in (use /login)');
        }
        break;
      
      default:
        // Unknown command - could show error
        console.log(`Unknown command: ${cmd}`);
    }
  };

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
        setSlashCommand('');
        return;
      }
      if (key.return) {
        // Process the command
        handleSlashCommand(slashCommand);
        setSlashCommand('');
        return;
      }
      if (key.backspace || key.delete) {
        setSlashCommand(slashCommand.slice(0, -1));
        return;
      }
      if (input) {
        setSlashCommand(slashCommand + input);
        return;
      }
      return;
    }
    
    // Start slash command if user types '/'
    if (input === '/' && !isEditing && !isAddingTask) {
      setSlashCommand('/');
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
      {slashCommand && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="blue">Command: {slashCommand}</Text>
          <Text color="gray"> (Return: Execute • Esc: Cancel)</Text>
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