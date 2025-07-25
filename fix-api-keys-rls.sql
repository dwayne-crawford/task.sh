-- Fix RLS policy for api_keys table to allow validation
-- This needs to be run in your Supabase SQL editor

-- First, check if RLS is enabled (it probably is)
-- SELECT * FROM pg_tables WHERE tablename = 'api_keys';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Allow API key validation" ON api_keys;
DROP POLICY IF EXISTS "Allow anon key validation" ON api_keys;

-- Create new policies
-- 1. Allow authenticated users to manage their own keys
CREATE POLICY "Users can manage their own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

-- 2. Allow anon role to validate API keys (CRITICAL for MCP server)
CREATE POLICY "Allow API key validation" ON api_keys
    FOR SELECT USING (true);

-- Alternative: If you want more restrictive validation
-- CREATE POLICY "Allow API key validation" ON api_keys
--     FOR SELECT USING (is_active = true);

-- Ensure RLS is enabled
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Test the policy
-- SELECT key_hash, is_active FROM api_keys LIMIT 1;