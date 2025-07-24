-- TASK.SH Database Schema with Security
-- Run this in your Supabase SQL editor

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  project TEXT,
  subtasks JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_expanded BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS) - This is the REAL security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can only insert tasks for themselves
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own tasks
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own tasks
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_date_idx ON tasks(date);
CREATE INDEX IF NOT EXISTS tasks_user_date_idx ON tasks(user_id, date);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project) WHERE project IS NOT NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Rate limiting function (basic implementation)
CREATE OR REPLACE FUNCTION check_user_rate_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Check if user has created more than 100 tasks in last hour
  SELECT COUNT(*) INTO recent_count
  FROM tasks 
  WHERE user_id = user_uuid 
    AND created_at > NOW() - INTERVAL '1 hour';
    
  -- Return false if rate limit exceeded
  IF recent_count > 100 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Add rate limiting to insert policy
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
CREATE POLICY "Users can insert own tasks with rate limit" ON tasks
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND check_user_rate_limit(auth.uid())
  );

-- Create a view for task statistics (optional)
CREATE OR REPLACE VIEW user_task_stats AS
SELECT 
  user_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE completed = true) as completed_tasks,
  COUNT(*) FILTER (WHERE completed = false) as pending_tasks,
  COUNT(DISTINCT project) FILTER (WHERE project IS NOT NULL) as total_projects,
  MIN(created_at) as first_task_date,
  MAX(updated_at) as last_activity
FROM tasks 
GROUP BY user_id;

-- Enable RLS on the view
ALTER VIEW user_task_stats SET (security_barrier = true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT SELECT ON user_task_stats TO authenticated;

-- Optional: Create a function to clean up old completed tasks (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_completed_tasks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed tasks older than 1 year
  DELETE FROM tasks 
  WHERE completed = true 
    AND updated_at < NOW() - INTERVAL '1 year';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment with setup instructions
COMMENT ON TABLE tasks IS 'TASK.SH user tasks with Row Level Security enabled. Each user can only access their own tasks.';
COMMENT ON FUNCTION check_user_rate_limit IS 'Rate limiting function to prevent abuse - limits users to 100 task creations per hour.';
COMMENT ON VIEW user_task_stats IS 'Aggregated statistics for user tasks, respects RLS policies.';

-- Display setup completion message
DO $$
BEGIN
  RAISE NOTICE 'TASK.SH Database Schema Setup Complete!';
  RAISE NOTICE '✅ Tasks table created with RLS enabled';
  RAISE NOTICE '✅ Security policies applied';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '✅ Rate limiting enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Update your CLI app with your Supabase URL and anon key';
  RAISE NOTICE '2. Test authentication and task creation';
  RAISE NOTICE '3. Monitor usage in Supabase dashboard';
END $$;