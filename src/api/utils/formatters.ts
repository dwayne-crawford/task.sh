// Export format conversion utilities

import { ApiTask, ProjectExportResponse, StatusExportResponse, DateRangeExportResponse } from '../types/api.js';

// CSV conversion utilities
export const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
};

// Convert tasks to CSV format
export const tasksToCSV = (tasks: ApiTask[]): string => {
  const flatTasks = tasks.map(task => ({
    id: task.id,
    description: task.description,
    completed: task.completed,
    date: task.date,
    project: task.project || 'No Project',
    created_at: task.created_at,
    updated_at: task.updated_at,
    subtasks_count: task.subtasks.length,
    subtasks: task.subtasks.map(st => st.description).join('; ')
  }));
  
  return convertToCSV(flatTasks);
};

// Convert project export to CSV
export const projectExportToCSV = (exportData: ProjectExportResponse): string => {
  const sections = [];
  
  // Project metadata
  sections.push('# Project Export Metadata');
  sections.push(`Project Name,${exportData.project.name}`);
  sections.push(`Total Tasks,${exportData.project.task_count}`);
  sections.push(`Completed Tasks,${exportData.project.completed_count}`);
  sections.push(`Completion Rate,${(exportData.project.completion_rate * 100).toFixed(2)}%`);
  sections.push(`Exported At,${exportData.export_metadata.exported_at}`);
  sections.push('');
  
  // Tasks
  sections.push('# Tasks');
  sections.push(tasksToCSV(exportData.tasks));
  
  return sections.join('\n');
};

// Markdown conversion utilities
export const convertToMarkdown = (data: any, title: string = 'Export'): string => {
  const sections = [];
  
  sections.push(`# ${title}`);
  sections.push('');
  
  if (data.export_metadata) {
    sections.push('## Export Details');
    sections.push(`- **Exported at**: ${data.export_metadata.exported_at}`);
    sections.push(`- **Exported by**: ${data.export_metadata.exported_by}`);
    sections.push(`- **Version**: ${data.export_metadata.version}`);
    sections.push('');
  }
  
  if (data.tasks && data.tasks.length > 0) {
    sections.push('## Tasks');
    sections.push('');
    
    data.tasks.forEach((task: ApiTask, index: number) => {
      const status = task.completed ? '✅' : '⭕';
      sections.push(`### ${index + 1}. ${status} ${task.description}`);
      sections.push(`- **Project**: ${task.project || 'No Project'}`);
      sections.push(`- **Date**: ${task.date}`);
      sections.push(`- **Status**: ${task.completed ? 'Completed' : 'Pending'}`);
      
      if (task.subtasks.length > 0) {
        sections.push('- **Subtasks**:');
        task.subtasks.forEach(subtask => {
          const subStatus = subtask.completed ? '✅' : '⭕';
          sections.push(`  - ${subStatus} ${subtask.description}`);
        });
      }
      sections.push('');
    });
  }
  
  if (data.statistics) {
    sections.push('## Statistics');
    sections.push(`- **Total Tasks**: ${data.statistics.total_tasks}`);
    sections.push(`- **Completed**: ${data.statistics.completed_tasks}`);
    sections.push(`- **Pending**: ${data.statistics.pending_tasks}`);
    sections.push(`- **Completion Rate**: ${(data.statistics.completion_rate * 100).toFixed(2)}%`);
    sections.push('');
  }
  
  if (data.daily_breakdown) {
    sections.push('## Daily Breakdown');
    sections.push('');
    sections.push('| Date | Total Tasks | Completed | Pending | Completion Rate |');
    sections.push('|------|-------------|-----------|---------|-----------------|');
    
    Object.entries(data.daily_breakdown).forEach(([date, stats]: [string, any]) => {
      const rate = (stats.completion_rate * 100).toFixed(1);
      sections.push(`| ${date} | ${stats.total_tasks} | ${stats.completed_tasks} | ${stats.pending_tasks} | ${rate}% |`);
    });
    sections.push('');
  }
  
  return sections.join('\n');
};

// Format detection and conversion
export const convertExportData = (data: any, format: string, filename?: string): { content: string; mimeType: string; extension: string } => {
  switch (format.toLowerCase()) {
    case 'csv':
      let csvContent = '';
      if (data.tasks) {
        if (data.export_metadata?.export_type === 'project') {
          csvContent = projectExportToCSV(data as ProjectExportResponse);
        } else {
          csvContent = tasksToCSV(data.tasks);
        }
      }
      return {
        content: csvContent,
        mimeType: 'text/csv',
        extension: 'csv'
      };
      
    case 'markdown':
    case 'md':
      const title = filename || 
        (data.export_metadata?.project_name ? `${data.export_metadata.project_name} Export` : 'Task Export');
      return {
        content: convertToMarkdown(data, title),
        mimeType: 'text/markdown',
        extension: 'md'
      };
      
    case 'excel':
    case 'xlsx':
      // For now, return CSV content with Excel mime type
      // In a full implementation, you'd use a library like 'xlsx' to create actual Excel files
      let excelContent = '';
      if (data.tasks) {
        if (data.export_metadata?.export_type === 'project') {
          excelContent = projectExportToCSV(data as ProjectExportResponse);
        } else {
          excelContent = tasksToCSV(data.tasks);
        }
      }
      return {
        content: excelContent,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx'
      };
      
    case 'json':
    default:
      return {
        content: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
        extension: 'json'
      };
  }
};

// Helper to set appropriate response headers
export const setResponseHeaders = (res: any, format: string, filename: string): void => {
  const converted = convertExportData({}, format);
  res.setHeader('Content-Type', converted.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.${converted.extension}"`);
};