import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../../supabase.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Access token required',
        code: 'UNAUTHORIZED',
        message: 'Please provide a valid Bearer token in the Authorization header'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    if (!supabase) {
      res.status(500).json({
        error: 'Supabase not configured',
        code: 'SUPABASE_ERROR',
        message: 'Authentication service is not available'
      });
      return;
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        message: 'The provided token is invalid or has expired'
      });
      return;
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.substring(7);
    
    if (!supabase) {
      next();
      return;
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email || '',
        role: user.role || 'user'
      };
    }
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request for optional auth
  }

  next();
};

// API key authentication for server-to-server
export const apiKeyMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({
      error: 'API key required',
      code: 'API_KEY_REQUIRED',
      message: 'Please provide a valid API key in the X-API-Key header'
    });
    return;
  }

  // TODO: Implement proper API key validation with database
  // For now, check against environment variable
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey || apiKey !== validApiKey) {
    res.status(401).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
      message: 'The provided API key is invalid'
    });
    return;
  }

  // Set a system user context for API key requests
  req.user = {
    id: 'system',
    email: 'system@tasksh.com',
    role: 'system'
  };

  next();
};