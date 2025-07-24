import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables silently
const originalConsoleLog = console.log;
console.log = () => {}; // Temporarily disable console.log
try {
  dotenv.config();
} catch (error) {
  // Silently ignore dotenv errors
} finally {
  console.log = originalConsoleLog; // Restore console.log
}

// These should be set as environment variables in production
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
});

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