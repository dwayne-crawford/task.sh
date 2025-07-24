import { Task } from './task.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'tasks.json');

export class TaskList {
  public tasks: Task[] = [];

  constructor() {
    this.loadTasks();
  }

  private loadTasks() {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      if (data) {
        const tasksData = JSON.parse(data);
        this.tasks = tasksData.map((taskData: any) => {
          const task = new Task(taskData.description, taskData.date, taskData.completed, taskData.subtasks || []);
          task.id = taskData.id; // Preserve the original ID
          task.isExpanded = taskData.isExpanded || false;
          task.project = taskData.project || task.extractProject(taskData.description); // Handle legacy data
          return task;
        });
      } else {
        this.tasks = [];
      }
    } catch (error: any) {
      if (error.code === 'ENOENT' || error instanceof SyntaxError) {
        // File does not exist or is empty/invalid JSON, initialize with empty array
        this.tasks = [];
        this.saveTasks();
      } else {
        console.error('Error loading tasks:', error);
      }
    }
  }

  protected saveTasks() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.tasks, null, 2), 'utf8');
  }

  addTask(description: string, date: string): Task {
    const task = new Task(description, date);
    this.tasks.push(task);
    this.saveTasks();
    return task;
  }

  getTasksByDate(date: string): Task[] {
    return this.tasks.filter(task => task.date === date);
  }

  toggleTaskCompletion(id: string): boolean {
    const task = this.tasks.find(task => task.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      return true;
    }
    return false;
  }

  deleteTask(id: string): boolean {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== id);
    if (this.tasks.length < initialLength) {
      this.saveTasks();
      return true;
    }
    return false;
  }

  editTask(id: string, newDescription: string): boolean {
    const task = this.tasks.find(task => task.id === id);
    if (task) {
      task.description = newDescription;
      this.saveTasks();
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
    this.saveTasks();
    return task;
  }

  toggleTaskExpansion(id: string): boolean {
    const task = this.tasks.find(task => task.id === id);
    if (task && task.hasSubtasks()) {
      task.isExpanded = !task.isExpanded;
      this.saveTasks();
      return true;
    }
    return false;
  }

  toggleSubtaskCompletion(taskId: string, subtaskId: string): boolean {
    const task = this.tasks.find(task => task.id === taskId);
    if (task && task.toggleSubtask(subtaskId)) {
      this.saveTasks();
      return true;
    }
    return false;
  }

  addSubtaskToTask(taskId: string, subtaskDescription: string): boolean {
    const task = this.tasks.find(task => task.id === taskId);
    if (task) {
      task.addSubtask(subtaskDescription);
      this.saveTasks();
      return true;
    }
    return false;
  }

  deleteSubtask(taskId: string, subtaskId: string): boolean {
    const task = this.tasks.find(task => task.id === taskId);
    if (task && task.deleteSubtask(subtaskId)) {
      this.saveTasks();
      return true;
    }
    return false;
  }

  getTasksByProject(project: string): Task[] {
    return this.tasks.filter(task => task.project === project);
  }

  getAllProjects(): string[] {
    const projects = new Set<string>();
    this.tasks.forEach(task => {
      if (task.project) {
        projects.add(task.project);
      }
    });
    return Array.from(projects).sort();
  }

  getTasksInDateRange(startDate: string, endDate: string): Task[] {
    return this.tasks.filter(task => task.date >= startDate && task.date <= endDate).sort((a, b) => a.date.localeCompare(b.date));
  }
}
