// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Task API Types
export interface ApiTask {
  id: string;
  description: string;
  completed: boolean;
  date: string;
  project: string | null;
  created_at: string;
  updated_at: string;
  subtasks: ApiSubtask[];
  is_expanded: boolean;
}

export interface ApiSubtask {
  id: string;
  description: string;
  completed: boolean;
  created_at: string;
  completed_at?: string;
}

export interface CreateTaskRequest {
  description: string;
  date?: string;
  project?: string;
  subtasks?: CreateSubtaskRequest[];
}

export interface CreateSubtaskRequest {
  description: string;
  completed?: boolean;
}

export interface UpdateTaskRequest {
  description?: string;
  completed?: boolean;
  date?: string;
  project?: string;
  is_expanded?: boolean;
  subtasks?: UpdateSubtaskRequest[];
}

export interface UpdateSubtaskRequest {
  id?: string;
  description?: string;
  completed?: boolean;
}

export interface BulkTaskOperation {
  operation: 'create' | 'update' | 'delete';
  tasks: (CreateTaskRequest | (UpdateTaskRequest & { id: string }) | { id: string })[];
}

// Filter and Query Types
export interface TaskFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  project?: string;
  completed?: boolean;
  search?: string;
  has_subtasks?: boolean;
  page?: number;
  limit?: number;
  sort?: 'date' | 'created_at' | 'updated_at' | 'description';
  order?: 'asc' | 'desc';
}

// Project Types
export interface ApiProject {
  name: string | null;
  task_count: number;
  completed_count: number;
  pending_count: number;
  completion_rate: number;
  created_at?: string;
  last_activity?: string;
}

// Calendar Types
export interface CalendarDay {
  date: string;
  tasks: ApiTask[];
  task_count: number;
  completed_count: number;
  is_today: boolean;
  is_weekend: boolean;
}

export interface CalendarResponse {
  days: CalendarDay[];
  summary: {
    total_days: number;
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    most_productive_day: string;
  };
}

// Statistics Types
export interface TaskStatistics {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  total_projects: number;
  tasks_by_project: Record<string, number>;
  tasks_by_date: Record<string, number>;
  most_productive_day: string;
  average_tasks_per_day: number;
  streak_current: number;
  streak_longest: number;
}

// Export Types
export interface ExportRequest {
  format: 'json' | 'markdown' | 'excel';
  options?: {
    date_range?: {
      start: string;
      end: string;
    };
    projects?: string[];
    include_completed?: boolean;
    include_subtasks?: boolean;
    include_metadata?: boolean;
    include_statistics?: boolean;
  };
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  created_at: string;
  completed_at?: string;
  download_url?: string;
  expires_at?: string;
  file_size?: number;
  error?: string;
}

// Enhanced Export Types
export interface ExportQuery {
  status?: 'complete' | 'incomplete' | 'all';
  date?: string;
  date_from?: string;
  date_to?: string;
  week?: string;
  month?: string;
  project?: string;
  search?: string;
  priority?: 'high' | 'medium' | 'low';
  has_subtasks?: boolean;
  format?: 'json' | 'csv' | 'excel' | 'markdown' | 'pdf';
  include?: string;
  sort?: 'date' | 'priority' | 'project' | 'status';
  limit?: number;
  template?: string;
  compress?: boolean;
  password?: string;
}

export interface ProjectExportResponse {
  export_metadata: {
    export_type: 'project';
    project_name: string;
    exported_at: string;
    exported_by: string;
    filters_applied: ExportQuery;
    version: string;
  };
  project: {
    name: string;
    description?: string;
    created_at: string;
    task_count: number;
    completed_count: number;
    completion_rate: number;
  };
  tasks: ApiTask[];
  statistics: {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    completion_rate: number;
    avg_completion_time?: number;
  };
}

export interface StatusExportResponse {
  export_metadata: {
    export_type: 'status_filter';
    status_filter: 'complete' | 'incomplete';
    exported_at: string;
    exported_by: string;
  };
  tasks: ApiTask[];
  projects_summary: {
    [project_name: string]: {
      task_count: number;
      completion_rate: number;
    };
  };
  statistics: {
    total_tasks: number;
    projects_affected: number;
    completion_distribution: {
      [project: string]: number;
    };
  };
}

export interface DateRangeExportResponse {
  export_metadata: {
    export_type: 'date_range';
    date_from: string;
    date_to: string;
    exported_at: string;
    exported_by: string;
    filters_applied: ExportQuery;
    version: string;
  };
  date_range: {
    start_date: string;
    end_date: string;
    total_days: number;
    business_days: number;
  };
  tasks: ApiTask[];
  daily_breakdown: {
    [date: string]: {
      total_tasks: number;
      completed_tasks: number;
      pending_tasks: number;
      completion_rate: number;
    };
  };
  statistics: {
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    completion_rate: number;
    most_productive_day: string;
    least_productive_day: string;
    average_tasks_per_day: number;
  };
}

export interface BulkExportRequest {
  projects?: string[];
  date_ranges?: Array<{
    start: string;
    end: string;
    label?: string;
  }>;
  status_filters?: Array<'complete' | 'incomplete'>;
  format?: 'json' | 'csv' | 'excel' | 'markdown';
  compress?: boolean;
}

export interface BulkExportResponse {
  export_metadata: {
    export_type: 'bulk';
    exported_at: string;
    exported_by: string;
    bulk_request: BulkExportRequest;
    version: string;
  };
  exports: Array<{
    type: 'project' | 'date_range' | 'status_filter';
    identifier: string;
    data: ProjectExportResponse | DateRangeExportResponse | StatusExportResponse;
  }>;
  summary: {
    total_exports: number;
    total_tasks: number;
    total_projects: number;
    date_range_coverage: number; // days
  };
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password?: string;
  provider?: 'email' | 'google' | 'github';
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Webhook Types
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: string;
  last_triggered?: string;
}

export interface WebhookEvent {
  id: string;
  event: string;
  data: any;
  timestamp: string;
  webhook_id: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    code: string;
  }>;
  created_ids?: string[];
  updated_ids?: string[];
  deleted_ids?: string[];
}