import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, getTaskListForUser } from '../mcp-server.js';
import { convertExportData } from '../api/utils/formatters.js';

const router = Router();

// Validation middleware
const projectExportValidation = [
  body('project_name').isString().notEmpty().withMessage('Project name is required'),
  body('format').optional().isIn(['json', 'csv', 'markdown', 'excel']).withMessage('Format must be json, csv, markdown, or excel'),
  body('status').optional().isIn(['complete', 'incomplete', 'all']).withMessage('Status must be complete, incomplete, or all'),
  body('date_from').optional().isISO8601().withMessage('Date from must be in YYYY-MM-DD format'),
  body('date_to').optional().isISO8601().withMessage('Date to must be in YYYY-MM-DD format')
];

const statusExportValidation = [
  body('status').isIn(['complete', 'incomplete']).withMessage('Status must be complete or incomplete'),
  body('format').optional().isIn(['json', 'csv', 'markdown', 'excel']).withMessage('Format must be json, csv, markdown, or excel')
];

const dateRangeExportValidation = [
  body('date_from').isISO8601().withMessage('Date from is required and must be in YYYY-MM-DD format'),
  body('date_to').isISO8601().withMessage('Date to is required and must be in YYYY-MM-DD format'),
  body('format').optional().isIn(['json', 'csv', 'markdown', 'excel']).withMessage('Format must be json, csv, markdown, or excel'),
  body('project').optional().isString().withMessage('Project must be a string'),
  body('status').optional().isIn(['complete', 'incomplete', 'all']).withMessage('Status must be complete, incomplete, or all')
];

const bulkExportValidation = [
  body('projects').optional().isArray().withMessage('Projects must be an array'),
  body('status_filters').optional().isArray().withMessage('Status filters must be an array'),
  body('date_ranges').optional().isArray().withMessage('Date ranges must be an array'),
  body('format').optional().isIn(['json', 'csv', 'markdown', 'excel']).withMessage('Format must be json, csv, markdown, or excel')
];

// Helper to convert internal task to API format
const toApiTask = (task: any) => ({
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

// POST /tools/export/project - Export specific project
router.post('/export/project', projectExportValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'MCP_VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }

    const { project_name, format = 'json', status = 'all', date_from, date_to } = req.body;
    
    const taskList = getTaskListForUser(req.user!.id);
    let projectTasks = taskList.tasks.filter((task: any) => task.project === project_name);

    if (projectTasks.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
        code: 'MCP_PROJECT_NOT_FOUND',
        message: `Project '${project_name}' not found or has no tasks`
      });
      return;
    }

    // Apply status filtering
    if (status === 'complete') {
      projectTasks = projectTasks.filter((task: any) => task.completed === true);
    } else if (status === 'incomplete') {
      projectTasks = projectTasks.filter((task: any) => task.completed === false);
    }

    // Apply date filtering
    if (date_from && date_to) {
      projectTasks = projectTasks.filter((task: any) => 
        task.date >= date_from && task.date <= date_to
      );
    }

    // Calculate project statistics
    const allProjectTasks = taskList.tasks.filter((task: any) => task.project === project_name);
    const completedCount = allProjectTasks.filter((task: any) => task.completed).length;

    const exportResponse = {
      export_metadata: {
        tool: 'mcp_export_project',
        export_type: 'project',
        project_name,
        exported_at: new Date().toISOString(),
        exported_by: req.user!.email,
        exported_for: 'llm_context',
        filters_applied: { status, format, date_from, date_to },
        version: '1.0'
      },
      project: {
        name: project_name,
        created_at: Math.min(...allProjectTasks.map((t: any) => new Date(t.date).getTime())).toString(),
        task_count: allProjectTasks.length,
        completed_count: completedCount,
        completion_rate: allProjectTasks.length > 0 ? completedCount / allProjectTasks.length : 0
      },
      tasks: projectTasks.map(toApiTask),
      statistics: {
        total_tasks: projectTasks.length,
        completed_tasks: projectTasks.filter((t: any) => t.completed).length,
        pending_tasks: projectTasks.filter((t: any) => !t.completed).length,
        completion_rate: projectTasks.length > 0 ? 
          projectTasks.filter((t: any) => t.completed).length / projectTasks.length : 0
      }
    };

    // Handle different formats
    if (format !== 'json') {
      const converted = convertExportData(exportResponse, format, `${project_name}-export`);
      res.json({
        success: true,
        tool_result: {
          format: format,
          content_type: converted.mimeType,
          file_extension: converted.extension,
          data: converted.content,
          filename: `${project_name}-export.${converted.extension}`
        },
        metadata: exportResponse.export_metadata
      });
    } else {
      res.json({
        success: true,
        tool_result: {
          format: 'json',
          content_type: 'application/json',
          file_extension: 'json',
          data: exportResponse,
          filename: `${project_name}-export.json`
        },
        metadata: exportResponse.export_metadata
      });
    }

  } catch (error) {
    console.error('MCP export project error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      code: 'MCP_EXPORT_ERROR',
      message: 'Failed to export project data'
    });
  }
});

// POST /tools/export/status - Export tasks by completion status
router.post('/export/status', statusExportValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',  
        code: 'MCP_VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }

    const { status, format = 'json' } = req.body;
    
    const taskList = getTaskListForUser(req.user!.id);
    const filteredTasks = taskList.tasks.filter((task: any) => 
      status === 'complete' ? task.completed === true : task.completed === false
    );

    // Group by project for summary
    const projectsSummary: { [key: string]: { task_count: number; completion_rate: number } } = {};
    const allTasksByProject = new Map<string, { total: number; completed: number }>();

    // Calculate project summaries
    for (const task of taskList.tasks) {
      const projectName = task.project || 'No Project';
      if (!allTasksByProject.has(projectName)) {
        allTasksByProject.set(projectName, { total: 0, completed: 0 });
      }
      const project = allTasksByProject.get(projectName)!;
      project.total++;
      if (task.completed) project.completed++;
    }

    allTasksByProject.forEach((stats, projectName) => {
      if (projectName !== 'No Project') {
        const relevantTaskCount = status === 'complete' ? stats.completed : (stats.total - stats.completed);
        if (relevantTaskCount > 0) {
          projectsSummary[projectName] = {
            task_count: relevantTaskCount,
            completion_rate: stats.completed / stats.total
          };
        }
      }
    });

    const exportResponse = {
      export_metadata: {
        tool: 'mcp_export_status',
        export_type: 'status_filter',
        status_filter: status,
        exported_at: new Date().toISOString(),
        exported_by: req.user!.email,
        exported_for: 'llm_context',
        version: '1.0'
      },
      tasks: filteredTasks.map(toApiTask),
      projects_summary: projectsSummary,
      statistics: {
        total_tasks: filteredTasks.length,
        projects_affected: Object.keys(projectsSummary).length,
        completion_distribution: Object.fromEntries(
          Object.entries(projectsSummary).map(([project, data]) => [project, data.task_count])
        )
      }
    };

    // Handle different formats
    if (format !== 'json') {
      const converted = convertExportData(exportResponse, format, `${status}-tasks-export`);
      res.json({
        success: true,
        tool_result: {
          format: format,
          content_type: converted.mimeType,
          file_extension: converted.extension,
          data: converted.content,
          filename: `${status}-tasks-export.${converted.extension}`
        },
        metadata: exportResponse.export_metadata
      });
    } else {
      res.json({
        success: true,
        tool_result: {
          format: 'json',
          content_type: 'application/json',
          file_extension: 'json',
          data: exportResponse,
          filename: `${status}-tasks-export.json`
        },
        metadata: exportResponse.export_metadata
      });
    }

  } catch (error) {
    console.error('MCP export status error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      code: 'MCP_EXPORT_ERROR',
      message: 'Failed to export status-filtered tasks'
    });
  }
});

// POST /tools/export/date-range - Export tasks within date range
router.post('/export/date-range', dateRangeExportValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'MCP_VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }

    const { date_from, date_to, format = 'json', project, status = 'all' } = req.body;
    
    const taskList = getTaskListForUser(req.user!.id);
    let filteredTasks = taskList.tasks.filter((task: any) => 
      task.date >= date_from && task.date <= date_to
    );

    // Apply project filter
    if (project) {
      filteredTasks = filteredTasks.filter((task: any) => task.project === project);
    }

    // Apply status filter
    if (status === 'complete') {
      filteredTasks = filteredTasks.filter((task: any) => task.completed === true);
    } else if (status === 'incomplete') {
      filteredTasks = filteredTasks.filter((task: any) => task.completed === false);
    }

    // Calculate daily breakdown
    const dailyBreakdown: { [date: string]: { total: number; completed: number; pending: number } } = {};
    
    for (let d = new Date(date_from); d <= new Date(date_to); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayTasks = filteredTasks.filter((task: any) => task.date === dateStr);
      const completedCount = dayTasks.filter((task: any) => task.completed).length;
      
      dailyBreakdown[dateStr] = {
        total: dayTasks.length,
        completed: completedCount,
        pending: dayTasks.length - completedCount
      };
    }

    const totalDays = Math.ceil((new Date(date_to).getTime() - new Date(date_from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const completedTasks = filteredTasks.filter((task: any) => task.completed).length;

    const exportResponse = {
      export_metadata: {
        tool: 'mcp_export_date_range',
        export_type: 'date_range',
        date_from,
        date_to,
        exported_at: new Date().toISOString(),
        exported_by: req.user!.email,
        exported_for: 'llm_context',
        filters_applied: { project, status, format },
        version: '1.0'
      },
      date_range: {
        start_date: date_from,
        end_date: date_to,
        total_days: totalDays
      },
      tasks: filteredTasks.map(toApiTask),
      daily_breakdown: dailyBreakdown,
      statistics: {
        total_tasks: filteredTasks.length,
        completed_tasks: completedTasks,
        pending_tasks: filteredTasks.length - completedTasks,
        completion_rate: filteredTasks.length > 0 ? completedTasks / filteredTasks.length : 0,
        average_tasks_per_day: filteredTasks.length / totalDays
      }
    };

    // Handle different formats
    if (format !== 'json') {
      const converted = convertExportData(exportResponse, format, `date-${date_from}-to-${date_to}-export`);
      res.json({
        success: true,
        tool_result: {
          format: format,
          content_type: converted.mimeType,
          file_extension: converted.extension,
          data: converted.content,
          filename: `date-${date_from}-to-${date_to}-export.${converted.extension}`
        },
        metadata: exportResponse.export_metadata
      });
    } else {
      res.json({
        success: true,
        tool_result: {
          format: 'json',
          content_type: 'application/json',
          file_extension: 'json',
          data: exportResponse,
          filename: `date-${date_from}-to-${date_to}-export.json`
        },
        metadata: exportResponse.export_metadata
      });
    }

  } catch (error) {
    console.error('MCP export date range error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      code: 'MCP_EXPORT_ERROR',
      message: 'Failed to export date range data'
    });
  }
});

// POST /tools/export/bulk - Bulk export operations
router.post('/export/bulk', bulkExportValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'MCP_VALIDATION_ERROR',
        details: errors.array()
      });
      return;
    }

    const { projects, status_filters, date_ranges, format = 'json' } = req.body;
    
    const taskList = getTaskListForUser(req.user!.id);
    const exports: Array<{
      type: 'project' | 'date_range' | 'status_filter';
      identifier: string;
      data: any;
    }> = [];

    let totalTasks = 0;
    let totalProjects = 0;

    // Export projects
    if (projects && projects.length > 0) {
      for (const projectName of projects) {
        const projectTasks = taskList.tasks.filter((task: any) => task.project === projectName);
        
        if (projectTasks.length > 0) {
          const completedCount = projectTasks.filter((task: any) => task.completed).length;

          const projectExport = {
            project: {
              name: projectName,
              task_count: projectTasks.length,
              completed_count: completedCount,
              completion_rate: completedCount / projectTasks.length
            },
            tasks: projectTasks.map(toApiTask),
            statistics: {
              total_tasks: projectTasks.length,
              completed_tasks: completedCount,
              pending_tasks: projectTasks.length - completedCount,
              completion_rate: completedCount / projectTasks.length
            }
          };

          exports.push({
            type: 'project',
            identifier: projectName,
            data: projectExport
          });

          totalTasks += projectTasks.length;
          totalProjects++;
        }
      }
    }

    // Export status filters
    if (status_filters && status_filters.length > 0) {
      for (const statusFilter of status_filters) {
        let statusTasks = taskList.tasks;
        
        if (statusFilter === 'complete') {
          statusTasks = statusTasks.filter((task: any) => task.completed === true);
        } else if (statusFilter === 'incomplete') {
          statusTasks = statusTasks.filter((task: any) => task.completed === false);
        }

        const statusExport = {
          status_filter: statusFilter,
          tasks: statusTasks.map(toApiTask),
          statistics: {
            total_tasks: statusTasks.length,
            projects_affected: new Set(statusTasks.map((t: any) => t.project).filter(Boolean)).size
          }
        };

        exports.push({
          type: 'status_filter',
          identifier: statusFilter,
          data: statusExport
        });

        totalTasks += statusTasks.length;
      }
    }

    // Export date ranges
    if (date_ranges && date_ranges.length > 0) {
      for (const dateRange of date_ranges) {
        const rangeTasks = taskList.tasks.filter((task: any) => 
          task.date >= dateRange.start && task.date <= dateRange.end
        );

        const completedTasks = rangeTasks.filter((task: any) => task.completed).length;

        const dateRangeExport = {
          date_range: {
            start_date: dateRange.start,
            end_date: dateRange.end,
            label: dateRange.label || `${dateRange.start} to ${dateRange.end}`
          },
          tasks: rangeTasks.map(toApiTask),
          statistics: {
            total_tasks: rangeTasks.length,
            completed_tasks: completedTasks,
            pending_tasks: rangeTasks.length - completedTasks,
            completion_rate: rangeTasks.length > 0 ? completedTasks / rangeTasks.length : 0
          }
        };

        exports.push({
          type: 'date_range',
          identifier: dateRange.label || `${dateRange.start}-to-${dateRange.end}`,
          data: dateRangeExport
        });

        totalTasks += rangeTasks.length;
      }
    }

    const bulkResponse = {
      export_metadata: {
        tool: 'mcp_export_bulk',
        export_type: 'bulk',
        exported_at: new Date().toISOString(),
        exported_by: req.user!.email,
        exported_for: 'llm_context',
        bulk_request: { projects, status_filters, date_ranges, format },
        version: '1.0'
      },
      exports,
      summary: {
        total_exports: exports.length,
        total_tasks: totalTasks,
        total_projects: totalProjects,
        export_types: {
          projects: exports.filter(e => e.type === 'project').length,
          status_filters: exports.filter(e => e.type === 'status_filter').length,
          date_ranges: exports.filter(e => e.type === 'date_range').length
        }
      }
    };

    // Handle different formats
    if (format !== 'json') {
      const converted = convertExportData(bulkResponse, format, `bulk-export-${Date.now()}`);
      res.json({
        success: true,
        tool_result: {
          format: format,
          content_type: converted.mimeType,
          file_extension: converted.extension,
          data: converted.content,
          filename: `bulk-export-${Date.now()}.${converted.extension}`
        },
        metadata: bulkResponse.export_metadata
      });
    } else {
      res.json({
        success: true,
        tool_result: {
          format: 'json',
          content_type: 'application/json',
          file_extension: 'json',
          data: bulkResponse,
          filename: `bulk-export-${Date.now()}.json`
        },
        metadata: bulkResponse.export_metadata
      });
    }

  } catch (error) {
    console.error('MCP export bulk error:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      code: 'MCP_EXPORT_ERROR',
      message: 'Failed to perform bulk export'
    });
  }
});

export { router as toolsRoutes };