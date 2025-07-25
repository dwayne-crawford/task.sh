import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { 
  ApiResponse, 
  PaginatedResponse, 
  ApiTask, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  TaskFilters,
  BulkTaskOperation,
  BulkOperationResult,
  ApiProject,
  CalendarResponse,
  TaskStatistics
} from '../types/api.js';
import { CloudTaskList } from '../../cloud-task-list.js';
import { TaskList } from '../../task-list.js';

const router = Router();

// Helper to get task list for user
const getTaskListForUser = (userId: string): TaskList => {
  // For now, we'll create a new instance per request
  // In production, you might want to cache these or use a different pattern
  return new CloudTaskList();
};

// Helper to convert internal task to API task
const toApiTask = (task: any): ApiTask => ({
  id: task.id,
  description: task.description,
  completed: task.completed,
  date: task.date,
  project: task.project,
  created_at: task.created_at || new Date().toISOString(),
  updated_at: task.updated_at || new Date().toISOString(),
  subtasks: task.subtasks || [],
  is_expanded: task.isExpanded || false
});

// Validation middleware
const createTaskValidation = [
  body('description').trim().notEmpty().withMessage('Task description is required'),
  body('date').optional().isISO8601().withMessage('Date must be in YYYY-MM-DD format'),
  body('project').optional().trim(),
  body('subtasks').optional().isArray().withMessage('Subtasks must be an array')
];

const updateTaskValidation = [
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  body('date').optional().isISO8601().withMessage('Date must be in YYYY-MM-DD format'),
  body('project').optional().trim(),
  body('is_expanded').optional().isBoolean().withMessage('is_expanded must be a boolean')
];

const listTasksValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  query('date').optional().isISO8601().withMessage('Date must be in YYYY-MM-DD format'),
  query('date_from').optional().isISO8601().withMessage('Date from must be in YYYY-MM-DD format'),
  query('date_to').optional().isISO8601().withMessage('Date to must be in YYYY-MM-DD format'),
  query('sort').optional().isIn(['date', 'created_at', 'updated_at', 'description']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
];

// GET /api/tasks/projects - List all projects (must come before /:id route)
router.get('/projects', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskList = getTaskListForUser(req.user!.id);
    const allTasks = taskList.tasks;
    
    // Group tasks by project
    const projectMap = new Map<string, { tasks: any[], completed: number }>();
    
    for (const task of allTasks) {
      const projectName = task.project || 'No Project';
      
      if (!projectMap.has(projectName)) {
        projectMap.set(projectName, { tasks: [], completed: 0 });
      }
      
      const project = projectMap.get(projectName)!;
      project.tasks.push(task);
      if (task.completed) {
        project.completed++;
      }
    }
    
    // Convert to API format
    const projects: ApiProject[] = Array.from(projectMap.entries()).map(([name, data]) => ({
      name: name === 'No Project' ? null : name,
      task_count: data.tasks.length,
      completed_count: data.completed,
      pending_count: data.tasks.length - data.completed,
      completion_rate: data.tasks.length > 0 ? data.completed / data.tasks.length : 0,
      created_at: Math.min(...data.tasks.map((t: any) => new Date(t.date).getTime())).toString(),
      last_activity: Math.max(...data.tasks.map((t: any) => new Date(t.date).getTime())).toString()
    })).filter(p => p.name !== null); // Filter out "No Project"

    res.json({
      success: true,
      data: projects,
      timestamp: new Date().toISOString()
    } as ApiResponse<ApiProject[]>);

  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve projects',
      code: 'LIST_PROJECTS_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// GET /api/tasks - List tasks with filtering and pagination
router.get('/', listTasksValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const filters: TaskFilters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      date: req.query.date as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      project: req.query.project as string,
      completed: req.query.completed ? req.query.completed === 'true' : undefined,
      search: req.query.search as string,
      sort: (req.query.sort as 'date' | 'created_at' | 'updated_at' | 'description') || 'date',
      order: (req.query.order as 'asc' | 'desc') || 'desc'
    };

    const taskList = getTaskListForUser(req.user!.id);
    
    // Get all tasks first (we'll implement proper filtering in the task list later)
    let allTasks = taskList.tasks;
    
    // Apply filters
    if (filters.date) {
      allTasks = allTasks.filter((task: any) => task.date === filters.date);
    }
    
    if (filters.date_from && filters.date_to) {
      allTasks = allTasks.filter((task: any) => 
        task.date >= filters.date_from! && task.date <= filters.date_to!
      );
    }
    
    if (filters.project) {
      allTasks = allTasks.filter((task: any) => task.project === filters.project);
    }
    
    if (filters.completed !== undefined) {
      allTasks = allTasks.filter((task: any) => task.completed === filters.completed);
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      allTasks = allTasks.filter((task: any) => 
        task.description.toLowerCase().includes(searchTerm)
      );
    }

    // Sort tasks
    allTasks.sort((a: any, b: any) => {
      let aValue: any, bValue: any;
      
      switch (filters.sort) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'created_at':
        case 'updated_at':
        default:
          aValue = a.date; // Fallback to date for now
          bValue = b.date;
      }
      
      if (filters.order === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = allTasks.length;
    const totalPages = Math.ceil(total / filters.limit!);
    const offset = (filters.page! - 1) * filters.limit!;
    const paginatedTasks = allTasks.slice(offset, offset + filters.limit!);

    const apiTasks = paginatedTasks.map(toApiTask);

    const response: PaginatedResponse<ApiTask> = {
      success: true,
      data: apiTasks,
      pagination: {
        page: filters.page!,
        limit: filters.limit!,
        total,
        totalPages,
        hasNext: filters.page! < totalPages,
        hasPrev: filters.page! > 1
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tasks',
      code: 'LIST_TASKS_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});


// GET /api/tasks/:id - Get specific task
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const taskList = getTaskListForUser(req.user!.id);
    
    const task = taskList.tasks.find((t: any) => t.id === id);
    
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    res.json({
      success: true,
      data: toApiTask(task),
      timestamp: new Date().toISOString()
    } as ApiResponse<ApiTask>);

  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } else {
      console.error('Get task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve task',
        code: 'GET_TASK_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
});

// POST /api/tasks - Create new task
router.post('/', createTaskValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const taskData: CreateTaskRequest = req.body;
    const taskList = getTaskListForUser(req.user!.id);
    
    // Create the task
    const newTask = taskList.addTask(
      taskData.description,
      taskData.date || new Date().toISOString().split('T')[0]
    );

    // Add subtasks if provided
    if (taskData.subtasks && taskData.subtasks.length > 0) {
      for (const subtask of taskData.subtasks) {
        // TODO: Implement subtask creation properly
        console.log('Subtask creation not yet implemented:', subtask.description);
      }
    }

    // Get the updated task with subtasks
    const createdTask = taskList.tasks.find((t: any) => t.id === newTask.id);

    res.status(201).json({
      success: true,
      data: toApiTask(createdTask || newTask),
      timestamp: new Date().toISOString()
    } as ApiResponse<ApiTask>);

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      code: 'CREATE_TASK_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', updateTaskValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { id } = req.params;
    const updateData: UpdateTaskRequest = req.body;
    const taskList = getTaskListForUser(req.user!.id);
    
    // Check if task exists
    const existingTask = taskList.tasks.find((t: any) => t.id === id);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Update task properties
    if (updateData.description !== undefined) {
      taskList.editTask(id, updateData.description);
    }
    
    if (updateData.completed !== undefined) {
      if (updateData.completed !== existingTask.completed) {
        taskList.toggleTaskCompletion(id);
      }
    }
    
    // Get updated task
    const updatedTask = taskList.tasks.find((t: any) => t.id === id);
    
    res.json({
      success: true,
      data: toApiTask(updatedTask || existingTask),
      timestamp: new Date().toISOString()
    } as ApiResponse<ApiTask>);

  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } else {
      console.error('Update task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update task',
        code: 'UPDATE_TASK_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const taskList = getTaskListForUser(req.user!.id);
    
    // Check if task exists
    const existingTask = taskList.tasks.find((t: any) => t.id === id);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Delete the task
    const success = taskList.deleteTask(id);
    
    if (!success) {
      throw new Error('Failed to delete task');
    }

    res.json({
      success: true,
      data: {
        message: 'Task deleted successfully',
        deleted_task: toApiTask(existingTask)
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } else {
      console.error('Delete task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete task',
        code: 'DELETE_TASK_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
});

// PUT /api/tasks/:id/toggle - Toggle task completion
router.put('/:id/toggle', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const taskList = getTaskListForUser(req.user!.id);
    
    // Check if task exists
    const existingTask = taskList.tasks.find((t: any) => t.id === id);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Toggle the task
    taskList.toggleTaskCompletion(id);
    
    // Get updated task
    const updatedTask = taskList.tasks.find((t: any) => t.id === id);
    
    res.json({
      success: true,
      data: toApiTask(updatedTask || existingTask),
      timestamp: new Date().toISOString()
    } as ApiResponse<ApiTask>);

  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message,
        code: 'TASK_NOT_FOUND',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    } else {
      console.error('Toggle task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle task',
        code: 'TOGGLE_TASK_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }
  }
});

export { router as taskRoutes };