import { Router, Response } from 'express';
import { AuthenticatedRequest, getTaskListForUser } from '../mcp-server.js';

const router = Router();

// Helper to convert internal task to MCP-compatible format
const toMCPTask = (task: any) => ({
  id: task.id,
  description: task.description,
  completed: task.completed,
  date: task.date,
  project: task.project || null,
  created_at: task.created_at || new Date().toISOString(),
  updated_at: task.updated_at || new Date().toISOString(),
  subtasks: task.subtasks || [],
  is_expanded: task.isExpanded || false,
  due_date: task.date, // For MCP compatibility
  tags: task.project ? [task.project] : []
});

// GET /context/tasks/all - Get all tasks for authenticated user
router.get('/tasks/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskList = getTaskListForUser(req.user!.id);
    const allTasks = taskList.tasks.map(toMCPTask);

    res.json({
      success: true,
      context_type: 'all_tasks',
      user_id: req.user!.id,
      timestamp: new Date().toISOString(),
      data: allTasks,
      summary: {
        total_tasks: allTasks.length,
        completed_tasks: allTasks.filter(t => t.completed).length,
        pending_tasks: allTasks.filter(t => !t.completed).length,
        projects: [...new Set(allTasks.map(t => t.project).filter(Boolean))]
      }
    });
  } catch (error) {
    console.error('MCP context error (all tasks):', error);
    res.status(500).json({
      error: 'Failed to retrieve tasks',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to fetch task context'
    });
  }
});

// GET /context/tasks/incomplete - Get incomplete tasks
router.get('/tasks/incomplete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskList = getTaskListForUser(req.user!.id);
    const incompleteTasks = taskList.tasks
      .filter((task: any) => !task.completed)
      .map(toMCPTask);

    res.json({
      success: true,
      context_type: 'incomplete_tasks',
      user_id: req.user!.id,
      timestamp: new Date().toISOString(),
      data: incompleteTasks,
      summary: {
        total_incomplete: incompleteTasks.length,
        projects: [...new Set(incompleteTasks.map(t => t.project).filter(Boolean))],
        oldest_task: incompleteTasks.length > 0 ? 
          incompleteTasks.reduce((oldest, task) => 
            new Date(task.created_at) < new Date(oldest.created_at) ? task : oldest
          ) : null
      }
    });
  } catch (error) {
    console.error('MCP context error (incomplete tasks):', error);
    res.status(500).json({
      error: 'Failed to retrieve incomplete tasks',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to fetch incomplete task context'
    });
  }
});

// GET /context/tasks/complete - Get completed tasks
router.get('/tasks/complete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskList = getTaskListForUser(req.user!.id);
    const completedTasks = taskList.tasks
      .filter((task: any) => task.completed)
      .map(toMCPTask);

    res.json({
      success: true,
      context_type: 'completed_tasks',
      user_id: req.user!.id,
      timestamp: new Date().toISOString(),
      data: completedTasks,
      summary: {
        total_completed: completedTasks.length,
        projects: [...new Set(completedTasks.map(t => t.project).filter(Boolean))],
        recently_completed: completedTasks
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5)
      }
    });
  } catch (error) {
    console.error('MCP context error (completed tasks):', error);
    res.status(500).json({
      error: 'Failed to retrieve completed tasks',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to fetch completed task context'
    });
  }
});

// GET /context/tasks/due-today - Get tasks due today
router.get('/tasks/due-today', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const taskList = getTaskListForUser(req.user!.id);
    const dueTodayTasks = taskList.tasks
      .filter((task: any) => task.date === today)
      .map(toMCPTask);

    res.json({
      success: true,
      context_type: 'due_today_tasks',
      user_id: req.user!.id,
      date: today,
      timestamp: new Date().toISOString(),
      data: dueTodayTasks,
      summary: {
        total_due_today: dueTodayTasks.length,
        completed_today: dueTodayTasks.filter(t => t.completed).length,
        pending_today: dueTodayTasks.filter(t => !t.completed).length,
        projects_due_today: [...new Set(dueTodayTasks.map(t => t.project).filter(Boolean))]
      }
    });
  } catch (error) {
    console.error('MCP context error (due today):', error);
    res.status(500).json({
      error: 'Failed to retrieve due today tasks',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to fetch due today task context'
    });
  }
});

// GET /context/tasks/search?query=keyword - Search tasks
router.get('/tasks/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = req.query.query as string;
    
    if (!query || query.trim().length === 0) {
      res.status(400).json({
        error: 'Search query required',
        code: 'MCP_INVALID_QUERY',
        message: 'Please provide a search query parameter'
      });
      return;
    }

    const taskList = getTaskListForUser(req.user!.id);
    const searchTerm = query.toLowerCase().trim();
    const matchingTasks = taskList.tasks
      .filter((task: any) => 
        task.description.toLowerCase().includes(searchTerm) ||
        (task.project && task.project.toLowerCase().includes(searchTerm))
      )
      .map(toMCPTask);

    res.json({
      success: true,
      context_type: 'search_results',
      user_id: req.user!.id,
      search_query: query,
      timestamp: new Date().toISOString(),
      data: matchingTasks,
      summary: {
        total_matches: matchingTasks.length,
        completed_matches: matchingTasks.filter(t => t.completed).length,
        pending_matches: matchingTasks.filter(t => !t.completed).length,
        projects_matched: [...new Set(matchingTasks.map(t => t.project).filter(Boolean))]
      }
    });
  } catch (error) {
    console.error('MCP context error (search):', error);
    res.status(500).json({
      error: 'Failed to search tasks',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to perform task search'
    });
  }
});

// GET /context/tasks/:taskId - Get specific task by ID
router.get('/tasks/:taskId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const taskList = getTaskListForUser(req.user!.id);
    const task = taskList.tasks.find((t: any) => t.id === taskId);

    if (!task) {
      res.status(404).json({
        error: 'Task not found',
        code: 'MCP_TASK_NOT_FOUND',
        message: `Task with ID '${taskId}' not found or does not belong to authenticated user`
      });
      return;
    }

    const mcpTask = toMCPTask(task);

    res.json({
      success: true,
      context_type: 'single_task',
      user_id: req.user!.id,
      timestamp: new Date().toISOString(),
      data: mcpTask,
      related_tasks: taskList.tasks
        .filter((t: any) => t.id !== taskId && t.project === task.project)
        .slice(0, 3)
        .map(toMCPTask)
    });
  } catch (error) {
    console.error('MCP context error (single task):', error);
    res.status(500).json({
      error: 'Failed to retrieve task',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to fetch task context'
    });
  }
});

// GET /context/projects - Get projects summary
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
    
    // Convert to projects summary
    const projects = Array.from(projectMap.entries()).map(([name, data]) => ({
      name: name === 'No Project' ? null : name,
      task_count: data.tasks.length,
      completed_count: data.completed,
      pending_count: data.tasks.length - data.completed,
      completion_rate: data.tasks.length > 0 ? data.completed / data.tasks.length : 0,
      latest_activity: Math.max(...data.tasks.map((t: any) => new Date(t.date || t.created_at).getTime()))
    })).filter(p => p.name !== null);

    res.json({
      success: true,
      context_type: 'projects_summary',
      user_id: req.user!.id,
      timestamp: new Date().toISOString(),
      data: projects,
      summary: {
        total_projects: projects.length,
        total_tasks: allTasks.length,
        most_active_project: projects.reduce((max, p) => 
          p.task_count > max.task_count ? p : max, projects[0] || null),
        completion_overview: {
          fully_complete: projects.filter(p => p.completion_rate === 1).length,
          in_progress: projects.filter(p => p.completion_rate > 0 && p.completion_rate < 1).length,
          not_started: projects.filter(p => p.completion_rate === 0).length
        }
      }
    });
  } catch (error) {
    console.error('MCP context error (projects):', error);
    res.status(500).json({
      error: 'Failed to retrieve projects',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to fetch projects context'
    });
  }
});

// GET /context/stats - Get overall statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskList = getTaskListForUser(req.user!.id);
    const allTasks = taskList.tasks;
    const completedTasks = allTasks.filter((t: any) => t.completed);
    const incompleteTasks = allTasks.filter((t: any) => !t.completed);
    
    // Calculate date-based stats
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = getWeekRange();
    const thisMonth = getMonthRange();
    
    const todayTasks = allTasks.filter((t: any) => t.date === today);
    const weekTasks = allTasks.filter((t: any) => 
      t.date >= thisWeek.start && t.date <= thisWeek.end);
    const monthTasks = allTasks.filter((t: any) => 
      t.date >= thisMonth.start && t.date <= thisMonth.end);

    // Project stats
    const projects = [...new Set(allTasks.map((t: any) => t.project).filter(Boolean))];
    
    res.json({
      success: true,
      context_type: 'user_statistics',
      user_id: req.user!.id,
      timestamp: new Date().toISOString(),
      data: {
        overall: {
          total_tasks: allTasks.length,
          completed_tasks: completedTasks.length,
          incomplete_tasks: incompleteTasks.length,
          completion_rate: allTasks.length > 0 ? completedTasks.length / allTasks.length : 0
        },
        time_based: {
          today: {
            total: todayTasks.length,
            completed: todayTasks.filter(t => t.completed).length,
            pending: todayTasks.filter(t => !t.completed).length
          },
          this_week: {
            total: weekTasks.length,
            completed: weekTasks.filter(t => t.completed).length,
            pending: weekTasks.filter(t => !t.completed).length
          },
          this_month: {
            total: monthTasks.length,
            completed: monthTasks.filter(t => t.completed).length,
            pending: monthTasks.filter(t => !t.completed).length
          }
        },
        projects: {
          total_projects: projects.length,
          project_names: projects,
          most_tasks_project: projects.reduce((max, project) => {
            const projectTaskCount = allTasks.filter((t: any) => t.project === project).length;
            const maxTaskCount = allTasks.filter((t: any) => t.project === max).length;
            return projectTaskCount > maxTaskCount ? project : max;
          }, projects[0] || null)
        },
        productivity: {
          average_completion_rate: allTasks.length > 0 ? completedTasks.length / allTasks.length : 0,
          tasks_with_subtasks: allTasks.filter((t: any) => t.subtasks && t.subtasks.length > 0).length,
          oldest_incomplete_task: incompleteTasks.length > 0 ? 
            incompleteTasks.reduce((oldest, task) => 
              new Date(task.date) < new Date(oldest.date) ? task : oldest
            ) : null
        }
      }
    });
  } catch (error) {
    console.error('MCP context error (stats):', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      code: 'MCP_CONTEXT_ERROR',
      message: 'Unable to fetch user statistics'
    });
  }
});

// Helper functions for date calculations
function getWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0]
  };
}

function getMonthRange() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0]
  };
}

export { router as contextRoutes };