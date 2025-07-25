import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables silently (mainly for development/testing)
const originalConsoleLog = console.log;
console.log = () => {}; // Temporarily disable console.log
try {
  dotenv.config();
} catch (error) {
  // Silently ignore dotenv errors - service credentials are embedded
} finally {
  console.log = originalConsoleLog; // Restore console.log
}

// TASK.SH SaaS Service Configuration
// Production credentials with Base64 encoding for security through obscurity
const supabaseUrl = process.env.TASKSH_SERVICE_URL || getSecureServiceUrl();
const supabaseAnonKey = process.env.TASKSH_SERVICE_KEY || getSecureServiceKey();

console.error(`[Supabase Init] Using URL: ${supabaseUrl}`);
console.error(`[Supabase Init] Using Anon Key (masked): ${supabaseAnonKey ? supabaseAnonKey.substring(0, 5) + '...' + supabaseAnonKey.substring(supabaseAnonKey.length - 5) : 'None'}`);

/**
 * Get the TASK.SH service URL
 * To update with your real URL:
 * 1. Run: echo -n "https://your-real-project.supabase.co" | base64
 * 2. Replace the encoded string below
 */
function getSecureServiceUrl(): string {
  // Base64 encoded service URL - TASK.SH production service
  const encoded = 'aHR0cHM6Ly91Znlzd2xlcXhrdmhyemlkbWZ3dS5zdXBhYmFzZS5jbw==';
  return Buffer.from(encoded, 'base64').toString();
}

/**
 * Get the TASK.SH service anon key
 * To update with your real anon key:
 * 1. Get your anon key from Supabase dashboard
 * 2. Run: echo -n "your-real-anon-key" | base64
 * 3. Replace the encoded string below
 */
function getSecureServiceKey(): string {
  // Base64 encoded anon key - TASK.SH production service
  // This is your actual Supabase anon key, encoded for security
  const encoded = 'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5WbWVYTjNiR1Z4ZUd0MmFISjZhV1J0Wm5kMUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTlRNek1EY3hNVFlzSW1WNGNDSTZNakEyT0RnNE16RXhObjAuSW1Vc1lOUDUyTzhpdHN5WHB6TTkwMjhDY0hBY0VNVnU0TXBRaXQ4aXRpSQ==';
  return Buffer.from(encoded, 'base64').toString();
}

// Always available - no user configuration needed
const hasValidSupabaseConfig = true;

export const supabase = hasValidSupabaseConfig ? createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    storage: {
      getItem: (key: string) => {
        try {
          const sessionFile = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.todo-cli-session.json');
          if (fs.existsSync(sessionFile)) {
            const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            return data[key] || null;
          }
        } catch (error) {
          console.error('Error reading session:', error);
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        try {
          const sessionFile = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.todo-cli-session.json');
          let data: { [key: string]: string } = {};
          if (fs.existsSync(sessionFile)) {
            data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
          }
          data[key] = value;
          fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
        } catch (error) {
          console.error('Error saving session:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          const sessionFile = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.todo-cli-session.json');
          if (fs.existsSync(sessionFile)) {
            const data: { [key: string]: string } = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            delete data[key];
            fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
          }
        } catch (error) {
          console.error('Error removing session:', error);
        }
      }
    }
  }
}) : null;

// Export a flag to check if Supabase is available
export const isSupabaseConfigured = hasValidSupabaseConfig;

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          description: string;
          completed: boolean;
          date: string;
          project: string | null;
          subtasks: any[];
          is_expanded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          description: string;
          completed?: boolean;
          date: string;
          project?: string | null;
          subtasks?: any[];
          is_expanded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          description?: string;
          completed?: boolean;
          date?: string;
          project?: string | null;
          subtasks?: any[];
          is_expanded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}