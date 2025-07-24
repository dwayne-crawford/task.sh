-- Real security comes from Row Level Security (RLS) policies
-- Not from hiding the anon key

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY "Users can only see own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own tasks  
CREATE POLICY "Users can only insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tasks
CREATE POLICY "Users can only update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own tasks
CREATE POLICY "Users can only delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Additional security: Rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS BOOLEAN AS $$
BEGIN
  -- Implement rate limiting logic here
  -- E.g., max 1000 operations per hour per user
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;