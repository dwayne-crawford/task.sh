import { Task } from './task.js';
import { TaskList } from './task-list.js';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { AuthService } from './auth.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLOUD_DATA_FILE = path.join(__dirname, '..', 'data', 'cloud-tasks.json');
const OFFLINE_FILE = path.join(__dirname, '..', 'data', 'offline-changes.json');

interface OfflineChange {
  type: 'create' | 'update' | 'delete';
  taskId: string;
  taskData?: any;
  timestamp: number;
}

export class CloudTaskList extends TaskList {
  private authService: AuthService;
  private isOnline: boolean = true;
  private offlineChanges: OfflineChange[] = [];

  constructor() {
    super();
    this.authService = AuthService.getInstance();
    this.loadCloudTasks();
    this.loadOfflineChanges();
    this.setupOfflineDetection();
  }

  private checkSupabaseConfigured(): boolean {
    return Boolean(isSupabaseConfigured && supabase !== null);
  }

  // Override parent loadTasks to use cloud-specific file
  private loadCloudTasks() {
    try {
      const data = fs.readFileSync(CLOUD_DATA_FILE, 'utf8');
      if (data) {
        const tasksData = JSON.parse(data);
        this.tasks = tasksData.map((taskData: any) => {
          const task = new Task(taskData.description, taskData.date, taskData.completed, taskData.subtasks || []);
          task.id = taskData.id;
          task.isExpanded = taskData.isExpanded || false;
          task.project = taskData.project || task.extractProject(taskData.description);
          return task;
        });
      } else {
        this.tasks = [];
      }
    } catch (error: any) {
      if (error.code === 'ENOENT' || error instanceof SyntaxError) {
        this.tasks = [];
        this.saveCloudTasks();
      } else {
        console.error('Error loading cloud tasks:', error);
      }
    }
  }

  // Override parent saveTasks to use cloud-specific file
  private saveCloudTasks() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(CLOUD_DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CLOUD_DATA_FILE, JSON.stringify(this.tasks, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving cloud tasks:', error);
    }
  }

  private setupOfflineDetection() {
    // Simple online/offline detection
    setInterval(async () => {
      try {
        await this.testConnection();
        if (!this.isOnline) {
          this.isOnline = true;
          await this.syncOfflineChanges();
        }
      } catch (error) {
        this.isOnline = false;
      }
    }, 30000); // Check every 30 seconds
  }

  private async testConnection(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }
    const { data, error } = await supabase.from('tasks').select('id').limit(1);
    if (error) throw error;
  }

  private loadOfflineChanges() {
    try {
      if (fs.existsSync(OFFLINE_FILE)) {
        const data = fs.readFileSync(OFFLINE_FILE, 'utf8');
        this.offlineChanges = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading offline changes:', error);
      this.offlineChanges = [];
    }
  }

  private saveOfflineChanges() {
    try {
      fs.writeFileSync(OFFLINE_FILE, JSON.stringify(this.offlineChanges, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving offline changes:', error);
    }
  }

  private addOfflineChange(change: OfflineChange) {
    this.offlineChanges.push(change);
    this.saveOfflineChanges();
  }

  async syncFromCloud(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Cloud sync is not configured' };
    }

    if (!this.authService.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const userId = this.authService.getUserId();
      const { data, error } = await supabase!
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        this.isOnline = false;
        return { success: false, error: error.message };
      }

      this.isOnline = true;

      // Convert cloud data to local Task objects
      this.tasks = (data || []).map((cloudTask: any) => {
        const task = new Task(
          cloudTask.description,
          cloudTask.date,
          cloudTask.completed,
          cloudTask.subtasks || []
        );
        task.id = cloudTask.id;
        task.isExpanded = cloudTask.is_expanded || false;
        task.project = cloudTask.project;
        return task;
      });

      this.saveCloudTasks();
      return { success: true };
    } catch (error) {
      this.isOnline = false;
      return { success: false, error: 'Network error occurred' };
    }
  }

  async syncToCloud(): Promise<{ success: boolean; error?: string }> {
    if (!this.checkSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync is not configured' };
    }

    if (!this.authService.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const userId = this.authService.getUserId();
      if (!userId) {
        return { success: false, error: 'User ID not found' };
      }

      // Delete all existing tasks for the user
      await supabase!.from('tasks').delete().eq('user_id', userId);

      // Insert all current tasks
      const cloudTasks = this.tasks.map(task => ({
        id: task.id,
        user_id: userId,
        description: task.description,
        completed: task.completed,
        date: task.date,
        project: task.project,
        subtasks: task.subtasks,
        is_expanded: task.isExpanded
      }));

      if (cloudTasks.length > 0) {
        const { error } = await supabase!.from('tasks').insert(cloudTasks);
        if (error) {
          this.isOnline = false;
          return { success: false, error: error.message };
        }
      }

      this.isOnline = true;
      return { success: true };
    } catch (error) {
      this.isOnline = false;
      return { success: false, error: 'Network error occurred' };
    }
  }

  async syncOfflineChanges(): Promise<void> {
    if (!this.isOnline || !this.authService.isAuthenticated() || this.offlineChanges.length === 0) {
      return;
    }

    try {
      // For simplicity, we'll just do a full sync instead of processing individual changes
      await this.syncToCloud();
      
      // Clear offline changes if sync was successful
      this.offlineChanges = [];
      this.saveOfflineChanges();
    } catch (error) {
      console.error('Error syncing offline changes:', error);
    }
  }

  // Override parent methods to add cloud sync and use cloud storage
  addTask(description: string, date: string): Task {
    const task = new Task(description, date);
    this.tasks.push(task);
    this.saveCloudTasks(); // Use cloud-specific save
    
    if (this.isOnline && this.authService.isAuthenticated()) {
      this.syncTaskToCloud(task).catch(() => {
        // If sync fails, add to offline changes
        this.addOfflineChange({
          type: 'create',
          taskId: task.id,
          taskData: this.taskToCloudFormat(task),
          timestamp: Date.now()
        });
      });
    } else {
      this.addOfflineChange({
        type: 'create',
        taskId: task.id,
        taskData: this.taskToCloudFormat(task),
        timestamp: Date.now()
      });
    }

    return task;
  }

  toggleTaskCompletion(id: string): boolean {
    const task = this.tasks.find(task => task.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveCloudTasks(); // Use cloud-specific save
      this.handleTaskUpdate(id);
      return true;
    }
    return false;
  }

  deleteTask(id: string): boolean {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== id);
    if (this.tasks.length < initialLength) {
      this.saveCloudTasks(); // Use cloud-specific save
      this.handleTaskDelete(id);
      return true;
    }
    return false;
  }

  editTask(id: string, newDescription: string): boolean {
    const task = this.tasks.find(task => task.id === id);
    if (task) {
      task.description = newDescription;
      task.project = task.extractProject(newDescription); // Update project if changed
      this.saveCloudTasks(); // Use cloud-specific save
      this.handleTaskUpdate(id);
      return true;
    }
    return false;
  }

  addTaskWithSubtasks(description: string, date: string, subtaskDescriptions: string[] = []): Task {
    const task = new Task(description, date);
    subtaskDescriptions.forEach(desc => {
      if (desc.trim()) {
        task.addSubtask(desc.trim());
      }
    });
    this.tasks.push(task);
    this.saveCloudTasks(); // Use cloud-specific save
    
    if (this.isOnline && this.authService.isAuthenticated()) {
      this.syncTaskToCloud(task).catch(() => {
        this.addOfflineChange({
          type: 'create',
          taskId: task.id,
          taskData: this.taskToCloudFormat(task),
          timestamp: Date.now()
        });
      });
    } else {
      this.addOfflineChange({
        type: 'create',
        taskId: task.id,
        taskData: this.taskToCloudFormat(task),
        timestamp: Date.now()
      });
    }

    return task;
  }

  toggleTaskExpansion(id: string): boolean {
    const task = this.tasks.find(task => task.id === id);
    if (task && task.hasSubtasks()) {
      task.isExpanded = !task.isExpanded;
      this.saveCloudTasks(); // Use cloud-specific save
      this.handleTaskUpdate(id);
      return true;
    }
    return false;
  }

  toggleSubtaskCompletion(taskId: string, subtaskId: string): boolean {
    const task = this.tasks.find(task => task.id === taskId);
    if (task && task.toggleSubtask(subtaskId)) {
      this.saveCloudTasks(); // Use cloud-specific save
      this.handleTaskUpdate(taskId);
      return true;
    }
    return false;
  }

  addSubtaskToTask(taskId: string, subtaskDescription: string): boolean {
    const task = this.tasks.find(task => task.id === taskId);
    if (task) {
      task.addSubtask(subtaskDescription);
      this.saveCloudTasks(); // Use cloud-specific save
      this.handleTaskUpdate(taskId);
      return true;
    }
    return false;
  }

  deleteSubtask(taskId: string, subtaskId: string): boolean {
    const task = this.tasks.find(task => task.id === taskId);
    if (task && task.deleteSubtask(subtaskId)) {
      this.saveCloudTasks(); // Use cloud-specific save
      this.handleTaskUpdate(taskId);
      return true;
    }
    return false;
  }

  private handleTaskUpdate(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (this.isOnline && this.authService.isAuthenticated()) {
      this.syncTaskToCloud(task).catch(() => {
        this.addOfflineChange({
          type: 'update',
          taskId: task.id,
          taskData: this.taskToCloudFormat(task),
          timestamp: Date.now()
        });
      });
    } else {
      this.addOfflineChange({
        type: 'update',
        taskId: task.id,
        taskData: this.taskToCloudFormat(task),
        timestamp: Date.now()
      });
    }
  }

  private handleTaskDelete(taskId: string) {
    if (this.isOnline && this.authService.isAuthenticated()) {
      this.deleteTaskFromCloud(taskId).catch(() => {
        this.addOfflineChange({
          type: 'delete',
          taskId: taskId,
          timestamp: Date.now()
        });
      });
    } else {
      this.addOfflineChange({
        type: 'delete',
        taskId: taskId,
        timestamp: Date.now()
      });
    }
  }

  private async syncTaskToCloud(task: Task): Promise<void> {
    if (!this.checkSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const userId = this.authService.getUserId();
    if (!userId) return;

    const { error } = await supabase!.from('tasks').upsert({
      id: task.id,
      user_id: userId,
      description: task.description,
      completed: task.completed,
      date: task.date,
      project: task.project,
      subtasks: task.subtasks,
      is_expanded: task.isExpanded
    });

    if (error) {
      throw error;
    }
  }

  private async deleteTaskFromCloud(taskId: string): Promise<void> {
    if (!this.checkSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase!.from('tasks').delete().eq('id', taskId);
    if (error) {
      throw error;
    }
  }

  private taskToCloudFormat(task: Task) {
    return {
      id: task.id,
      user_id: this.authService.getUserId(),
      description: task.description,
      completed: task.completed,
      date: task.date,
      project: task.project,
      subtasks: task.subtasks,
      is_expanded: task.isExpanded
    };
  }

  isCloudSyncEnabled(): boolean {
    return this.authService.isAuthenticated();
  }

  getConnectionStatus(): { online: boolean; authenticated: boolean } {
    return {
      online: this.isOnline,
      authenticated: this.authService.isAuthenticated()
    };
  }

  getOfflineChangesCount(): number {
    return this.offlineChanges.length;
  }
}