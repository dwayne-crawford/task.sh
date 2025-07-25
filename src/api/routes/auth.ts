import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../../supabase.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { ApiResponse, LoginRequest, LoginResponse } from '../types/api.js';

const router = Router();

// Validation middleware
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const magicLinkValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

// POST /api/auth/login - Email/password login
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password }: LoginRequest = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required for email login',
        code: 'PASSWORD_REQUIRED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service not available',
        code: 'SUPABASE_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: error.message,
        code: 'LOGIN_FAILED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    if (!data.user || !data.session) {
      return res.status(401).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_FAILED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    const response: LoginResponse = {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0
      }
    };

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    } as ApiResponse<LoginResponse>);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// POST /api/auth/magic-link - Magic link authentication
router.post('/magic-link', magicLinkValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email }: { email: string } = req.body;
    const redirectTo = req.body.redirect_to || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service not available',
        code: 'SUPABASE_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'MAGIC_LINK_FAILED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: {
        message: 'Magic link sent to your email',
        email
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send magic link',
      code: 'MAGIC_LINK_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// POST /api/auth/signup - User registration
router.post('/signup', loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password }: LoginRequest = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required for signup',
        code: 'PASSWORD_REQUIRED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service not available',
        code: 'SUPABASE_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'SIGNUP_FAILED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created successfully. Please check your email for verification.',
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at
        } : null
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Signup failed',
      code: 'SIGNUP_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_REQUIRED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service not available',
        code: 'SUPABASE_ERROR',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED',
        timestamp: new Date().toISOString()
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
      code: 'USER_INFO_ERROR',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// POST /api/auth/logout - Sign out user
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Sign out with Supabase
      if (supabase) {
        await supabase.auth.admin.signOut(token);
      }
    }

    res.json({
      success: true,
      data: {
        message: 'Successfully logged out'
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Logout error:', error);
    // Still return success even if logout fails
    res.json({
      success: true,
      data: {
        message: 'Successfully logged out'
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

export { router as authRoutes };