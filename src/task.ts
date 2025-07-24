export interface SubTask {
  id: string;
  description: string;
  completed: boolean;
}

export class Task {
  id: string;
  description: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  subtasks: SubTask[];
  isExpanded: boolean;
  project: string | null;

  constructor(description: string, date: string, completed: boolean = false, subtasks: SubTask[] = []) {
    this.id = Math.random().toString(36).substr(2, 9); // Simple unique ID
    this.description = description;
    this.completed = completed;
    this.date = date;
    this.subtasks = subtasks;
    this.isExpanded = false;
    this.project = this.extractProject(description);
  }

  extractProject(description: string): string | null {
    // Extract project from #projectname format
    const projectMatch = description.match(/#(\w+)/);
    return projectMatch ? projectMatch[1] : null;
  }

  getDisplayDescription(): string {
    // Return description without the #project tag for cleaner display
    return this.description.replace(/#\w+\s*/, '').trim();
  }

  getProjectTag(): string {
    return this.project ? `#${this.project}` : '';
  }

  addSubtask(description: string): SubTask {
    const subtask: SubTask = {
      id: Math.random().toString(36).substr(2, 9),
      description,
      completed: false
    };
    this.subtasks.push(subtask);
    return subtask;
  }

  toggleSubtask(subtaskId: string): boolean {
    const subtask = this.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      subtask.completed = !subtask.completed;
      return true;
    }
    return false;
  }

  deleteSubtask(subtaskId: string): boolean {
    const initialLength = this.subtasks.length;
    this.subtasks = this.subtasks.filter(st => st.id !== subtaskId);
    return this.subtasks.length < initialLength;
  }

  hasSubtasks(): boolean {
    return this.subtasks.length > 0;
  }

  getCompletedSubtasksCount(): number {
    return this.subtasks.filter(st => st.completed).length;
  }
}
