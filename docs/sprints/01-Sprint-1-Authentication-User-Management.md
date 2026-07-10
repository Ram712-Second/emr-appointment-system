# Sprint 1: Authentication & User Management

## Sprint Overview
**Duration**: 3-4 Days | **Focus**: Security foundation before any other features

This sprint implements the complete authentication system including JWT tokens, password hashing, protected routes, and token refresh mechanism. No other features can be built without this security foundation.

---

## Sprint Goals

✅ Implement User model with roles  
✅ JWT access token + refresh token authentication  
✅ Password hashing with bcrypt  
✅ Login/logout functionality  
✅ Protected route middleware  
✅ Token refresh mechanism  
✅ Login UI with form validation  
✅ Auth state management  

---

## Prerequisites

**Must Complete Sprint 0 First**:
- [x] Server foundation
- [x] MongoDB connection
- [x] Error handling middleware
- [x] Frontend routing

---

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, required, lowercase),
  password: String (required, bcrypt hashed),
  firstName: String (required),
  lastName: String (required),
  phoneNumber: String (required),
  role: String (enum: ['SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR'], required),
  isActive: Boolean (default: true),
  profileId: ObjectId (conditional required),
  profileType: String (conditional required),
  lastLogin: Date,
  createdAt: Date (immutable),
  updatedAt: Date,
  deletedAt: Date
}
```

### Refresh Token Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', required),
  token: String (unique, required),
  expiresAt: Date (required),
  isRevoked: Boolean (default: false),
  revokedAt: Date,
  userAgent: String,
  ipAddress: String,
  createdAt: Date (immutable)
}
```

---

## Tasks

### Task 1.1: User Model Creation
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create User schema
2. Add password hashing middleware
3. Add instance methods
4. Create indexes

**Subtasks**:
- [ ] Create `models/User.js`
- [ ] Add pre-save hook for password hashing
- [ ] Add instance methods
- [ ] Create compound indexes

**File: `backend/src/models/User.js`**:
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
      required: [true, 'Role is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Polymorphic relationship
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.role !== 'SUPER_ADMIN';
      },
    },
    profileType: {
      type: String,
      enum: ['Doctor', 'Receptionist'],
      required: function () {
        return this.role !== 'SUPER_ADMIN';
      },
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ email: 1, deletedAt: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ profileId: 1, profileType: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to get public profile
userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.deletedAt;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
```

---

### Task 1.2: Refresh Token Model
**Priority**: Critical | **Estimated Time**: 1 hour

**Steps**:
1. Create RefreshToken schema
2. Add indexes for efficient queries
3. Add instance methods

**Subtasks**:
- [ ] Create `models/RefreshToken.js`
- [ ] Add indexes
- [ ] Add instance methods

**File: `backend/src/models/RefreshToken.js`**:
```javascript
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ expiresAt: 1, isRevoked: 1 });

// Instance method to revoke token
refreshTokenSchema.methods.revoke = async function () {
  this.isRevoked = true;
  this.revokedAt = new Date();
  return await this.save();
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
```

---

### Task 1.3: JWT Utility Service
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create JWT service
2. Implement token generation
3. Implement token verification
4. Create token payload structure

**Subtasks**:
- [ ] Create `services/jwtService.js`
- [ ] Implement generateTokens
- [ ] Implement verifyToken
- [ ] Add error handling

**File: `backend/src/services/jwtService.js`**:
```javascript
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secrets are not defined in environment variables');
}

/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });
};

/**
 * Generate both tokens
 */
const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: ACCESS_EXPIRY,
  };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
};

/**
 * Decode token without verification (for getting expiration)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateTokens,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
```

---

### Task 1.4: Authentication Service
**Priority**: Critical | **Estimated Time**: 3 hours

**Steps**:
1. Create auth service
2. Implement login logic
3. Implement logout logic
4. Implement token refresh logic

**Subtasks**:
- [ ] Create `services/authService.js`
- [ ] Implement login
- [ ] Implement logout
- [ ] Implement refresh

**File: `backend/src/services/authService.js`**:
```javascript
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/AppError');
const { generateTokens, verifyRefreshToken } = require('./jwtService');

/**
 * Login service
 */
const login = async (email, password, ipAddress, userAgent) => {
  // Find user and include password for comparison
  const user = await User.findOne({ email, isActive: true }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated', 403);
  }

  // Generate tokens
  const tokens = generateTokens(user);

  // Save refresh token to database
  const refreshTokenDoc = await RefreshToken.create({
    userId: user._id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    userAgent,
    ipAddress,
  });

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  return {
    user: user.toPublic(),
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    },
  };
};

/**
 * Logout service
 */
const logout = async (userId, refreshToken) => {
  // Revoke the specific refresh token
  const tokenDoc = await RefreshToken.findOne({
    userId,
    token: refreshToken,
    isRevoked: false,
  });

  if (tokenDoc) {
    await tokenDoc.revoke();
  }

  return { message: 'Logged out successfully' };
};

/**
 * Logout from all devices
 */
const logoutAll = async (userId) => {
  await RefreshToken.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );

  return { message: 'Logged out from all devices' };
};

/**
 * Refresh token service
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if token exists and is not revoked
    const tokenDoc = await RefreshToken.findOne({
      userId: decoded.userId,
      token: refreshToken,
      isRevoked: false,
    }).populate('userId');

    if (!tokenDoc) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if user is still active
    if (!tokenDoc.userId.isActive) {
      throw new AppError('User account is deactivated', 403);
    }

    // Generate new tokens
    const tokens = generateTokens(tokenDoc.userId);

    // Save new refresh token
    await RefreshToken.create({
      userId: tokenDoc.userId._id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: tokenDoc.userAgent,
      ipAddress: tokenDoc.ipAddress,
    });

    // Revoke old refresh token
    await tokenDoc.revoke();

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  } catch (error) {
    throw new AppError(error.message, 401);
  }
};

/**
 * Clean up expired tokens (scheduled task)
 */
const cleanupExpiredTokens = async () => {
  const result = await RefreshToken.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  return { deletedCount: result.deletedCount };
};

module.exports = {
  login,
  logout,
  logoutAll,
  refreshAccessToken,
  cleanupExpiredTokens,
};
```

---

### Task 1.5: Authentication Middleware
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create auth middleware
2. Implement token verification
3. Attach user to request
4. Handle token errors

**Subtasks**:
- [ ] Create `middlewares/auth.js`
- [ ] Implement protect route
- [ ] Implement authorize roles
- [ ] Add error handling

**File: `backend/src/middlewares/auth.js`**:
```javascript
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../services/jwtService');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in. Please log in to continue.', 401);
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Your account has been deactivated.', 403);
    }

    // Grant access
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize based on roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You must be logged in.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};

/**
 * Optional auth - attach user if token exists, but don't require it
 */
const optional = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

module.exports = { protect, authorize, optional };
```

---

### Task 1.6: Auth Validators
**Priority**: High | **Estimated Time**: 1 hour

**Steps**:
1. Create validation schemas
2. Create validator middleware
3. Add error formatting

**Subtasks**:
- [ ] Create `validators/authValidators.js`
- [ ] Add login validation
- [ ] Add refresh validation

**File: `backend/src/validators/authValidators.js`**:
```javascript
const { body, validationResult } = require('express-validator');

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  next();
};

/**
 * Login validation rules
 */
const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validate,
];

/**
 * Refresh token validation
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
  validate,
];

module.exports = {
  loginValidation,
  refreshTokenValidation,
};
```

---

### Task 1.7: Auth Controllers
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create auth controller
2. Implement login endpoint
3. Implement logout endpoint
4. Implement refresh endpoint

**Subtasks**:
- [ ] Create `controllers/authController.js`
- [ ] Implement login
- [ ] Implement logout
- [ ] Implement refresh

**File: `backend/src/controllers/authController.js`**:
```javascript
const authService = require('../services/authService');
const AppError = require('../utils/AppError');

/**
 * Login controller
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Get IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'Unknown';

    const result = await authService.login(email, password, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout controller
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    await authService.logout(req.user._id, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token controller
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user controller
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: req.user.toPublic(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  refresh,
  getMe,
};
```

---

### Task 1.8: Auth Routes
**Priority**: Critical | **Estimated Time**: 1 hour

**Steps**:
1. Create auth routes
2. Apply middleware
3. Add route documentation

**Subtasks**:
- [ ] Create `routes/authRoutes.js`
- [ ] Apply validators
- [ ] Apply auth middleware

**File: `backend/src/routes/authRoutes.js`**:
```javascript
const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { loginValidation, refreshTokenValidation } = require('../validators/authValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, authController.logout);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshTokenValidation, authController.refresh);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

module.exports = router;
```

---

### Task 1.9: Update App.js with Auth Routes
**Priority**: Critical | **Estimated Time**: 30 minutes

**File: `backend/src/app.js`** (Add these routes):
```javascript
// ... existing imports and middleware

// API Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));

// ... 404 and error handlers
```

---

### Task 1.10: Frontend Auth Context
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create AuthContext
2. Implement auth state
3. Implement auth methods
4. Create AuthProvider

**Subtasks**:
- [ ] Create `contexts/AuthContext.jsx`
- [ ] Implement login
- [ ] Implement logout
- [ ] Implement token refresh

**File: `frontend/src/contexts/AuthContext.jsx`**:
```jsx
import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to parse user data:', error);
          // Clear invalid data
          localStorage.clear();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login function
   */
  const login = useCallback(async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);

      const { user, tokens } = response.data.data;

      // Store in localStorage
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Update state
      setUser(user);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  }, []);

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.clear();

      // Update state
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Update user data
   */
  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

---

### Task 1.11: Protected Route Component
**Priority**: High | **Estimated Time**: 1 hour

**Steps**:
1. Create ProtectedRoute component
2. Implement auth check
3. Implement redirect logic

**Subtasks**:
- [ ] Create `components/common/ProtectedRoute.jsx`
- [ ] Add auth check
- [ ] Add redirect

**File: `frontend/src/components/common/ProtectedRoute.jsx`**:
```jsx
import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login but save the intended location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
```

---

### Task 1.12: Login Page
**Priority**: Critical | **Estimated Time**: 3 hours

**Steps**:
1. Create login page
2. Implement login form
3. Add form validation
4. Add error handling
5. Add loading states

**Subtasks**:
- [ ] Create `pages/LoginPage.jsx`
- [ ] Implement form
- [ ] Add validation
- [ ] Add error handling

**File: `frontend/src/pages/LoginPage.jsx`**:
```jsx
import { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { login, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsLoading(true);

    try {
      const result = await login(formData);

      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setSubmitError(result.error || 'Login failed');
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>EMR Appointment System</h1>
          <h2>Login</h2>

          {submitError && (
            <div className="alert alert-error">{submitError}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

---

## Acceptance Criteria

### Backend Authentication
- [ ] User model with password hashing
- [ ] JWT access token generation
- [ ] JWT refresh token generation
- [ ] Login endpoint returns tokens
- [ ] Refresh token endpoint works
- [ ] Logout endpoint revokes tokens
- [ ] Protected routes require valid token
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected

### Frontend Authentication
- [ ] Login page renders correctly
- [ ] Form validation works
- [ ] Login stores tokens in localStorage
- [ ] Protected routes redirect to login
- [ ] Logout clears localStorage
- [ ] Auth context provides user data
- [ ] Token refresh works automatically

### Security
- [ ] Passwords are hashed with bcrypt
- [ ] Tokens are stored securely
- [ ] Refresh tokens are revoked on logout
- [ ] Expired tokens are cleaned up
- [ ] Sensitive data not exposed in responses

---

## Testing Checklist

### Manual Testing
```bash
# Test Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"admin123"}'

# Test Protected Route
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"

# Test Token Refresh
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'

# Test Logout
curl -X POST http://localhost:5000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

### Frontend Testing
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Login with missing fields
- [ ] Logout functionality
- [ ] Protected route redirect
- [ ] Token refresh on expiry

---

## Deliverables

✅ User model with password hashing  
✅ RefreshToken model  
✅ JWT service  
✅ Authentication service  
✅ Auth middleware  
✅ Auth controller  
✅ Auth routes  
✅ Frontend AuthContext  
✅ ProtectedRoute component  
✅ Login page  
✅ Form validation  
✅ Error handling  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Login/logout works end-to-end
- [ ] Token refresh works
- [ ] Protected routes are secure
- [ ] No security vulnerabilities
- [ ] Code formatted with Prettier
- [ ] No ESLint errors
- [ ] Git committed with meaningful message
- [ ] Ready for Sprint 2 (RBAC)

---

## Notes

1. **Security First**: Never expose tokens in logs or errors
2. **Password Requirements**: Enforce strong password policies
3. **Token Storage**: Consider httpOnly cookies for production
4. **Rate Limiting**: Add additional rate limiting for auth endpoints
5. **Account Lockout**: Consider implementing after failed attempts

---

## Next Sprint

After completing Sprint 1, proceed to [Sprint 2: Role-Based Access Control](./02-Sprint-2-RBAC.md) to implement authorization and role management.
