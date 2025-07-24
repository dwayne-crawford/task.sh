import { supabase, isSupabaseConfigured } from './supabase.js';
import { User } from '@supabase/supabase-js';

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {}

  private checkSupabaseConfigured(): { success: boolean; error?: string } {
    // Service is always available in SaaS model
    if (!supabase) {
      return { success: false, error: 'TASK.SH service temporarily unavailable. Please try again later.' };
    }
    return { success: true };
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    // Service should always be available
    if (!supabase) {
      this.currentUser = null;
      return;
    }

    try {
      const { data: { session }, error } = await supabase!.auth.getSession();
      if (error) {
        console.error('Error getting session:', error.message);
        return;
      }
      
      if (session?.user) {
        this.currentUser = session.user;
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const configCheck = this.checkSupabaseConfigured();
    if (!configCheck.success) {
      return configCheck;
    }

    try {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.currentUser = data.user;
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  }

  async signInWithMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    const configCheck = this.checkSupabaseConfigured();
    if (!configCheck.success) {
      return configCheck;
    }

    try {
      const { data, error } = await supabase!.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: 'http://localhost:1337'
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const configCheck = this.checkSupabaseConfigured();
    if (!configCheck.success) {
      return configCheck;
    }

    try {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.currentUser = data.user;
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    const configCheck = this.checkSupabaseConfigured();
    if (!configCheck.success) {
      return configCheck;
    }

    try {
      const { error } = await supabase!.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUser = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error occurred' };
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  async checkAuthStatus(): Promise<boolean> {
    await this.initialize();
    return this.isAuthenticated();
  }
}