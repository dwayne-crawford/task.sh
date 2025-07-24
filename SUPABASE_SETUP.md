# Supabase Setup Guide

This guide will help you set up Supabase authentication and cloud sync for the Todo CLI application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js and npm installed
3. Todo CLI application cloned and dependencies installed

## Setup Steps

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - Name: `todo-cli` (or any name you prefer)
   - Database Password: Create a strong password
   - Region: Choose the closest region to you
5. Click "Create new project"
6. Wait for the project to be set up (usually takes 1-2 minutes)

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to "Settings" → "API"
2. Copy the following values:
   - Project URL (something like `https://xxxxx.supabase.co`)
   - Anon key (public key, starts with `eyJ...`)

### 3. Configure Environment Variables

1. In your todo-cli project folder, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Set Up Database Schema

1. In your Supabase dashboard, go to "SQL Editor"
2. Copy the contents of `supabase-schema.sql` from this project
3. Paste it into the SQL Editor and click "Run"
4. This will create:
   - The `tasks` table with proper structure
   - Row Level Security policies
   - Necessary indexes for performance
   - Automatic timestamp updates

### 5. Configure Authentication

1. In your Supabase dashboard, go to "Authentication" → "Settings"
2. Under "Auth Providers", make sure "Email" is enabled
3. Configure your site URL:
   - Site URL: `http://localhost` (for local development)
   - Redirect URLs: `http://localhost` (for local development)

### 6. Test the Setup

1. Build your project:
   ```bash
   npm run build
   ```

2. Run the application:
   ```bash
   node dist/cli.js
   ```

3. You should see the authentication screen
4. Try creating an account and signing in
5. Add some tasks and verify they sync to the cloud

## Features Enabled

With Supabase configured, your Todo CLI now has:

### Authentication
- User signup and signin
- Secure session management
- Automatic session persistence

### Cloud Sync
- Tasks automatically sync to Supabase
- Offline support with local storage fallback
- Automatic retry when connection is restored
- Real-time sync across devices (when signed in)

### Security
- Row Level Security ensures users only see their own tasks
- Secure authentication with JWT tokens
- API keys safely managed through environment variables

## CLI Commands with Cloud Sync

All existing commands now work with cloud sync when authenticated:

```bash
# Add a task (syncs to cloud if authenticated)
node dist/cli.js add "Complete project setup"

# List tasks (shows cloud tasks if authenticated)
node dist/cli.js list

# Manual sync command
node dist/cli.js sync

# Sign out
node dist/cli.js logout
```

## Interactive Mode

When you run the app without commands, you'll see:

1. **First time**: Authentication screen
2. **After authentication**: Normal todo interface with:
   - Cloud sync status indicators
   - User info toggle (press 'u')
   - Offline change counters
   - Automatic background sync

## Troubleshooting

### "Module not found" errors
```bash
npm install
npm run build
```

### Authentication errors
- Verify your `.env` file has correct SUPABASE_URL and SUPABASE_ANON_KEY
- Check that the Supabase project is active
- Ensure the database schema was applied correctly

### Sync issues
- Check your internet connection
- Verify the tasks table exists in Supabase
- Check the browser console in Supabase dashboard for any errors

### Database errors
- Go to Supabase Dashboard → SQL Editor
- Run the schema from `supabase-schema.sql` again
- Check that Row Level Security is enabled

## Advanced Configuration

### Custom Session Storage
The app stores authentication sessions in `~/.todo-cli-session.json`. You can customize this location by modifying the `supabase.ts` configuration.

### Offline Behavior
- Tasks are always saved locally first
- Cloud sync happens in the background
- Offline changes are tracked and synced when connection is restored
- The app shows sync status indicators

### Multiple Devices
- Sign in with the same account on multiple devices
- Tasks will sync across all devices
- Changes made on one device appear on others after refresh/restart

## Security Notes

- Never commit your `.env` file to version control
- Keep your Supabase keys secure
- Use environment variables in production
- Enable additional security features in Supabase as needed

## Production Deployment

For production use:
1. Set up proper environment variables
2. Configure proper site URLs in Supabase
3. Consider enabling additional auth providers
4. Set up proper backup strategies
5. Monitor usage through Supabase dashboard