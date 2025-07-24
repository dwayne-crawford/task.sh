-- Todo CLI Database Setup Script
-- Run this in your Supabase SQL Editor

-- Clean start: Drop existing objects if they exist
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create the tasks table with all required fields
CREATE TABLE public.tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    date DATE NOT NULL,
    project TEXT,
    subtasks JSONB DEFAULT '[]' NOT NULL,
    is_expanded BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment for documentation
COMMENT ON TABLE public.tasks IS 'User tasks with support for projects, subtasks, and date organization';
COMMENT ON COLUMN public.tasks.id IS 'Unique task identifier';
COMMENT ON COLUMN public.tasks.user_id IS 'Reference to the user who owns this task';
COMMENT ON COLUMN public.tasks.description IS 'Task description text';
COMMENT ON COLUMN public.tasks.completed IS 'Whether the task is completed';
COMMENT ON COLUMN public.tasks.date IS 'Date the task is scheduled for';
COMMENT ON COLUMN public.tasks.project IS 'Project name (extracted from #project tags)';
COMMENT ON COLUMN public.tasks.subtasks IS 'JSON array of subtask objects';
COMMENT ON COLUMN public.tasks.is_expanded IS 'Whether subtasks are expanded in UI';

-- Enable Row Level Security for data protection
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create performance indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_date ON public.tasks(date);
CREATE INDEX idx_tasks_project ON public.tasks(project) WHERE project IS NOT NULL;
CREATE INDEX idx_tasks_completed ON public.tasks(completed);
CREATE INDEX idx_tasks_user_date ON public.tasks(user_id, date);
CREATE INDEX idx_tasks_user_project ON public.tasks(user_id, project) WHERE project IS NOT NULL;

-- Row Level Security Policies
-- Users can only view their own tasks
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps on row updates
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON public.tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verification queries (optional - you can run these to check the setup)
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'tasks';

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tasks' 
AND schemaname = 'public';

-- Show RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'tasks' 
AND schemaname = 'public';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Todo CLI database schema created successfully!';
    RAISE NOTICE '📊 Table: public.tasks';
    RAISE NOTICE '🔒 Row Level Security: ENABLED';
    RAISE NOTICE '⚡ Performance indexes: CREATED';
    RAISE NOTICE '🔄 Auto-timestamp trigger: ACTIVE';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your Todo CLI is ready for cloud sync!';
END $$;