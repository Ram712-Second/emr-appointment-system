# Sprint 12: Error Handling & Edge Cases

## Sprint Overview
**Duration**: 2 Days | **Focus**: Production resilience

This sprint implements comprehensive error handling, edge case management, and user-friendly error responses to ensure the application is production-ready.

---

## Sprint Goals

✅ Centralize error handling  
✅ Implement proper HTTP status codes  
✅ Add validation error formatting  
✅ Handle async errors in React  
✅ Create loading states throughout  
✅ Implement error boundaries  
✅ Add user-friendly error messages  
✅ Create error notification system  

---

## Prerequisites

**Must Complete Sprint 11 First**:
- [x] Real-time updates
- [x] Socket.IO integration
- [x] All core features

---

## Error Categories

1. **Validation Errors** (400)
   - Missing required fields
   - Invalid data formats
   - Business rule violations

2. **Authentication Errors** (401)
   - Invalid credentials
   - Expired tokens
   - Missing tokens

3. **Authorization Errors** (403)
   - Insufficient permissions
   - Resource access denied

4. **Not Found Errors** (404)
   - Resource not found
   - Invalid IDs

5. **Conflict Errors** (409)
   - Duplicate resources
   - Double booking attempts

6. **Server Errors** (500)
   - Unexpected errors
   - Database errors

---

## Tasks

### Task 12.1: Enhanced Error Middleware
**Priority**: High | **Estimated Time**: 2 hours

**Update `backend/src/middlewares/errorHandler.js`**:

```javascript
const AppError = require('../utils/AppError');

/**
 * Enhanced error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new AppError('Validation Error', 400, messages);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    error = new AppError(
      `An entry with this ${field} already exists`,
      400
    );
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = new AppError('Resource not found', 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired. Please log in again.', 401);
  }

  // MongoDB transaction errors
  if (err.name === 'MongoTransactionError') {
    error = new AppError('Transaction failed. Please try again.', 500);
  }

  // Socket errors
  if (err.name === 'SocketError') {
    error = new AppError('Connection error. Please refresh the page.', 500);
  }

  // Prepare response
  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
    errors: error.errors || null,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = {
      name: err.name,
      code: err.code,
    };
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
```

---

### Task 12.2: Async Handler Wrapper
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/utils/asyncHandler.js`**:

```javascript
/**
 * Wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function to wrap
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
```

**Usage in controllers**:
```javascript
const asyncHandler = require('../utils/asyncHandler');

const createAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await appointmentService.createAppointment(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: { appointment },
  });
});
```

---

### Task 12.3: Custom Error Classes
**Priority**: Medium | **Estimated Time**: 1 hour

**Update `backend/src/utils/AppError.js`**:

```javascript
/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 400, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};
```

---

### Task 12.4: React Error Boundary
**Priority**: High | **Estimated Time**: 2 hours

**File: `frontend/src/components/common/ErrorBoundary.jsx`**:

```jsx
import { Component } from 'react';
import { Button } from './Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (fallback) {
        return fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="error-boundary">
          <div className="error-container">
            <h2>Something went wrong</h2>
            <p>We're sorry for the inconvenience. Please try again.</p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error details</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}

            <div className="error-actions">
              <Button onClick={this.handleReset}>Try Again</Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

### Task 12.5: React Error Hook
**Priority**: Medium | **Estimated Time**: 1 hour

**File: `frontend/src/hooks/useErrorHandler.js`**:

```javascript
import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * Custom hook for handling API errors
 */
const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleError = useCallback((err) => {
    let errorMessage = 'An unexpected error occurred';

    if (err.response) {
      // Server responded with error
      const { data } = err.response;
      errorMessage = data?.message || errorMessage;
      
      // Handle validation errors
      if (data?.errors) {
        errorMessage = data.errors.map((e) => e.message).join(', ');
      }
    } else if (err.request) {
      // Request made but no response
      errorMessage = 'Network error. Please check your connection.';
    } else {
      // Error in setting up request
      errorMessage = err.message || errorMessage;
    }

    setError(errorMessage);
    return errorMessage;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(
    async (asyncFn) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn();
        return result;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  return {
    error,
    loading,
    handleError,
    clearError,
    executeAsync,
  };
};

export default useErrorHandler;
```

---

### Task 12.6: Notification System
**Priority**: High | **Estimated Time**: 2 hours

**File: `frontend/src/contexts/NotificationContext.jsx`**:

```jsx
import { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification,
    };

    setNotifications((prev) => [...prev, newNotification]);

    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const success = (message, options = {}) => {
    return addNotification({ ...options, type: 'success', message });
  };

  const error = (message, options = {}) => {
    return addNotification({ ...options, type: 'error', message, duration: 10000 });
  };

  const warning = (message, options = {}) => {
    return addNotification({ ...options, type: 'warning', message });
  };

  const info = (message, options = {}) => {
    return addNotification({ ...options, type: 'info', message });
  };

  const clear = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
    clear,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
```

**Notification Component** (`frontend/src/components/common/Notification.jsx`**):

```jsx
import { useNotification } from '../../contexts/NotificationContext';
import './Notification.css';

const NotificationItem = ({ notification, onRemove }) => {
  const { type, message } = notification;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`notification notification-${type}`}>
      <span className="notification-icon">{icons[type]}</span>
      <span className="notification-message">{message}</span>
      <button
        className="notification-close"
        onClick={() => onRemove(notification.id)}
      >
        ×
      </button>
    </div>
  );
};

export const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};
```

---

### Task 12.7: API Error Interceptor
**Priority**: High | **Estimated Time**: 1 hour

**Update `frontend/src/services/api.js`**:

```javascript
import { useNotification } from '../contexts/NotificationContext';

// In axios interceptor:
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      // ... existing refresh logic
    }

    // Show notification for client errors
    if (error.response?.status >= 400 && error.response?.status < 500) {
      const message = error.response?.data?.message || 'Request failed';
      // Could trigger notification here if context is available
    }

    // Show notification for server errors
    if (error.response?.status >= 500) {
      const message = 'Server error. Please try again later.';
      // Could trigger notification here if context is available
    }

    return Promise.reject(error);
  }
);
```

---

### Task 12.8: Loading Component
**Priority**: Medium | **Estimated Time**: 1 hour

**File: `frontend/src/components/common/LoadingSpinner.jsx`**:

```jsx
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', fullScreen = false }) => {
  return (
    <div className={`loading-spinner loading-${size} ${fullScreen ? 'loading-fullscreen' : ''}`}>
      <div className="spinner"></div>
    </div>
  );
};

export default LoadingSpinner;
```

**CSS** (`LoadingSpinner.css`**):

```css
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-small .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.loading-large .spinner {
  width: 60px;
  height: 60px;
}

.loading-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  z-index: 9999;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

---

## Acceptance Criteria

### Backend
- [ ] All errors return proper JSON
- [ ] HTTP status codes are correct
- [ ] Validation errors are formatted
- [ ] Stack traces hidden in production
- [ ] Errors logged for debugging

### Frontend
- [ ] Error boundary catches render errors
- [ ] API errors handled gracefully
- [ ] Loading states show properly
- [ ] Error notifications display
- [ ] Users can recover from errors

---

## Testing Checklist

1. Test with invalid input data
2. Test with expired tokens
3. Test with network issues
4. Test with server errors
5. Test error boundary (trigger error in component)

---

## Deliverables

✅ Enhanced error middleware  
✅ Custom error classes  
✅ React error boundary  
✅ Error hook  
✅ Notification system  
✅ Loading component  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Errors handled gracefully
- [ ] User-friendly messages
- [ ] Loading states work
- [ ] Code formatted
- [ ] Ready for Sprint 13 (Performance)

---

## Next Sprint

After completing Sprint 12, proceed to [Sprint 13: Performance Optimization](./13-Sprint-13-Performance-Optimization.md).
