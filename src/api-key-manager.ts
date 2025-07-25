import { createHash, randomBytes } from 'crypto';
import { supabase } from './supabase.js';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export interface CreateApiKeyOptions {
  name: string;
  expirationDays?: number; // 30, 90, 365, or null for permanent
}

export interface ApiKeyResult {
  success: boolean;
  apiKey?: ApiKey;
  fullKey?: string; // Only returned on creation
  error?: string;
}

export class ApiKeyManager {
  /**
   * Generate a secure API key
   */
  private static generateApiKey(): { fullKey: string; keyHash: string; keyPrefix: string } {
    const keyBytes = randomBytes(32);
    const fullKey = `sk_user_${keyBytes.toString('base64url')}`;
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = `sk_user_${fullKey.slice(8, 16)}...`;
    
    return { fullKey, keyHash, keyPrefix };
  }

  /**
   * Calculate expiration date
   */
  private static getExpirationDate(days?: number): string | null {
    if (!days) return null; // Permanent key
    
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    return expirationDate.toISOString();
  }

  /**
   * Create a new API key for a user
   */
  static async createApiKey(userId: string, options: CreateApiKeyOptions): Promise<ApiKeyResult> {
    try {
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }

      // Generate secure API key
      const { fullKey, keyHash, keyPrefix } = this.generateApiKey();
      const expiresAt = this.getExpirationDate(options.expirationDays);

      // Deactivate any existing keys with the same name
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('name', options.name);

      // Insert new API key
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          user_id: userId,
          name: options.name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          expires_at: expiresAt,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('API key creation error:', error);
        return { success: false, error: 'Failed to create API key' };
      }

      return {
        success: true,
        apiKey: data,
        fullKey // Only returned on creation for security
      };

    } catch (error) {
      console.error('API key creation error:', error);
      return { success: false, error: 'Failed to create API key' };
    }
  }

  /**
   * List all API keys for a user
   */
  static async listApiKeys(userId: string): Promise<ApiKeyResult & { apiKeys?: ApiKey[] }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('API key list error:', error);
        return { success: false, error: 'Failed to retrieve API keys' };
      }

      return {
        success: true,
        apiKeys: data || []
      };

    } catch (error) {
      console.error('API key list error:', error);
      return { success: false, error: 'Failed to retrieve API keys' };
    }
  }

  /**
   * Revoke (deactivate) an API key
   */
  static async revokeApiKey(userId: string, keyId: string): Promise<ApiKeyResult> {
    try {
      if (!supabase) {
        return { success: false, error: 'Database connection not available' };
      }

      const { data, error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('API key revocation error:', error);
        return { success: false, error: 'Failed to revoke API key' };
      }

      if (!data) {
        return { success: false, error: 'API key not found' };
      }

      return {
        success: true,
        apiKey: data
      };

    } catch (error) {
      console.error('API key revocation error:', error);
      return { success: false, error: 'Failed to revoke API key' };
    }
  }

  /**
   * Validate an API key and return user info
   */
  static async validateApiKey(fullKey: string): Promise<{ 
    valid: boolean; 
    userId?: string; 
    keyId?: string;
    error?: string 
  }> {
    try {
      if (!supabase) {
        return { valid: false, error: 'Database connection not available' };
      }

      const keyHash = createHash('sha256').update(fullKey).digest('hex');

      const { data, error } = await supabase
        .from('api_keys')
        .select('id, user_id, expires_at, is_active')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { valid: false, error: 'Invalid API key' };
      }

      // Check if key is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }

      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return {
        valid: true,
        userId: data.user_id,
        keyId: data.id
      };

    } catch (error) {
      console.error('API key validation error:', error);
      return { valid: false, error: 'Failed to validate API key' };
    }
  }

  /**
   * Clean up expired API keys
   */
  static async cleanupExpiredKeys(): Promise<void> {
    try {
      if (!supabase) return;

      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

    } catch (error) {
      console.error('API key cleanup error:', error);
    }
  }

  /**
   * Format expiration for display
   */
  static formatExpiration(expiresAt: string | null): string {
    if (!expiresAt) return 'Never';
    
    const expDate = new Date(expiresAt);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months`;
    return `${Math.ceil(diffDays / 365)} years`;
  }

  /**
   * Get expiration options for UI
   */
  static getExpirationOptions(): { label: string; value: number | null; description: string }[] {
    return [
      { label: '30 days', value: 30, description: 'Recommended for testing and short-term use' },
      { label: '90 days', value: 90, description: 'Good for temporary projects' },
      { label: '1 year', value: 365, description: 'Long-term integration use' },
      { label: 'Never', value: null, description: 'Permanent key (not recommended)' }
    ];
  }
}