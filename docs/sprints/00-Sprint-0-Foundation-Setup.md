# Sprint 0: Foundation & Project Setup

## Sprint Overview
**Duration**: 2-3 Days | **Focus**: Architecture scaffolding, not features

This sprint establishes the technical foundation for the entire EMR Appointment Management System. No business features are implemented—only the infrastructure, tooling, and architectural patterns that will support all future development.

---

## Sprint Goals

✅ Initialize MERN project with proper folder structure  
✅ Configure development environment and tooling  
✅ Set up MongoDB connection with proper error handling  
✅ Create Express server with middleware pipeline  
✅ Configure security middleware and CORS  
✅ Set up React application with routing  
✅ Create reusable UI component library skeleton  
✅ Establish code quality tools and conventions  

---

## Architecture Decisions

### Backend Structure
```
backend/
├── src/
│   ├── config/           # Environment variables, MongoDB, constants
│   ├── controllers/      # HTTP request handlers (lightweight)
│   ├── middlewares/      # Auth, validation, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic (core layer)
│   ├── validators/      # Request validation schemas
│   ├── utils/           # Helper functions
│   ├── types/           # TypeScript types (if using TS)
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── tests/                # Test files
├── .env.example          # Environment template
├── .env.development      # Development config
├── .env.production       # Production config
└── package.json
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── common/      # Generic components (Button, Input, Modal)
│   │   ├── layout/      # Layout components (Header, Sidebar)
│   │   └── forms/       # Form components
│   ├── pages/          # Page-level components
│   ├── contexts/       # React Context providers
│   ├── hooks/          # Custom hooks
│   ├── services/       # API service layer
│   ├── utils/          # Helper functions
│   ├── constants/      # App constants
│   ├── styles/         # Global styles
│   ├── App.jsx         # Root component
│   └── main.jsx        # Entry point
├── public/
└── package.json
```

---

## Tasks

### Task 0.1: Repository Initialization
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Initialize Git repository
2. Create `.gitignore` with proper exclusions
3. Create LICENSE file
4. Set up branch protection rules (future)

**Subtasks**:
- [ ] Create `.gitignore`
- [ ] Create LICENSE
- [ ] Initialize git

**Gitignore Content**:
```gitignore
# Dependencies
node_modules/
.pnp/
.pnp.js

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory
coverage/
*.lcov

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/
*.tgz

# Temporary
tmp/
temp/
```

---

### Task 0.2: Backend Project Setup
**Priority**: Critical | **Estimated Time**: 3 hours

**Steps**:
1. Create backend directory structure
2. Initialize Node.js project
3. Install core dependencies
4. Create folder structure

**Subtasks**:
- [ ] Create backend directory
- [ ] Run `npm init -y`
- [ ] Install dependencies
- [ ] Create folder structure

**Dependencies to Install**:
```bash
# Core
npm install express mongoose dotenv cors

# Security
npm install helmet express-rate-limit

# Validation
npm install express-validator

# Utils
npm install bcrypt jsonwebtoken date-fns

# Dev
npm install --save-dev nodemon eslint prettier
```

**Commands**:
```bash
mkdir -p backend/src/{config,controllers,middlewares,models,routes,services,validators,utils}
cd backend
npm init -y
npm install express mongoose dotenv cors helmet express-rate-limit express-validator bcrypt jsonwebtoken date-fns
npm install --save-dev nodemon eslint prettier eslint-config-prettier eslint-plugin-prettier
```

---

### Task 0.3: Frontend Project Setup
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create React application
2. Install additional dependencies
3. Create folder structure

**Subtasks**:
- [ ] Create React app (Vite recommended)
- [ ] Install dependencies
- [ ] Create folder structure

**Commands**:
```bash
# Using Vite (recommended)
npm create vite@latest frontend -- --template react

cd frontend
npm install

# Dependencies
npm install react-router-dom axios

# UI & Styling
npm install tailwindcss  # or your preferred CSS framework

# Form handling
npm install react-hook-form

# Utils
npm install date-fns

# Dev
npm install --save-dev eslint prettier
```

**Alternative: Create React App**
```bash
npx create-react-app frontend
cd frontend
npm install react-router-dom axios react-hook-form date-fns
```

---

### Task 0.4: Environment Configuration
**Priority**: Critical | **Estimated Time**: 1 hour

**Steps**:
1. Create environment variable templates
2. Configure dotenv
3. Document all variables

**Subtasks**:
- [ ] Create `.env.example`
- [ ] Create `.env.development`
- [ ] Create environment config service

**Backend `.env.example`**:
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/emr-appointment-system

# JWT
JWT_ACCESS_SECRET=your-access-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

**Frontend `.env.example`**:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_APP_NAME=EMR Appointment System
```

---

### Task 0.5: MongoDB Connection Setup
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create database configuration
2. Implement connection with retry logic
3. Add connection event handlers
4. Create database utility functions

**Subtasks**:
- [ ] Create `config/database.js`
- [ ] Implement connection logic
- [ ] Add error handling
- [ ] Test connection

**File: `backend/src/config/database.js`**:
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection options
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
```

---

### Task 0.6: Express Server Configuration
**Priority**: Critical | **Estimated Time**: 3 hours

**Steps**:
1. Create Express application
2. Configure middleware pipeline
3. Set up security middleware
4. Configure CORS
5. Add error handling middleware

**Subtasks**:
- [ ] Create `app.js`
- [ ] Create `server.js`
- [ ] Configure middleware
- [ ] Test server startup

**File: `backend/src/app.js`**:
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Middleware imports
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes (will be added in future sprints)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
```

**File: `backend/src/server.js`**:
```javascript
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   EMR Appointment Management System                  ║
║                                                       ║
║   Server running on port ${PORT}                       ║
║   Environment: ${process.env.NODE_ENV}                    ║
║   Time: ${new Date().toLocaleString()}                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        await require('./config/database').disconnectDB();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

---

### Task 0.7: Error Handling Middleware
**Priority**: High | **Estimated Time**: 2 hours

**Steps**:
1. Create error handler middleware
2. Create not-found middleware
3. Create custom error classes
4. Create error response formatter

**Subtasks**:
- [ ] Create `middlewares/errorHandler.js`
- [ ] Create `middlewares/notFound.js`
- [ ] Create `utils/AppError.js`
- [ ] Test error responses

**File: `backend/src/utils/AppError.js`**:
```javascript
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

module.exports = AppError;
```

**File: `backend/src/middlewares/errorHandler.js`**:
```javascript
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = new AppError('Validation Error', 400, messages);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error = new AppError(`${field} already exists`, 400);
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

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    errors: error.errors || null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

**File: `backend/src/middlewares/notFound.js`**:
```javascript
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    data: null
  });
};

module.exports = notFound;
```

---

### Task 0.8: Code Quality Tools
**Priority**: Medium | **Estimated Time**: 2 hours

**Steps**:
1. Configure ESLint
2. Configure Prettier
3. Create npm scripts
4. Set up Git hooks (optional)

**Subtasks**:
- [ ] Configure ESLint
- [ ] Configure Prettier
- [ ] Add npm scripts
- [ ] Test linting

**File: `backend/.eslintrc.json`**:
```json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": ["eslint:recommended"],
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "warn",
    "prefer-const": "error",
    "var-required": "off"
  }
}
```

**File: `backend/.prettierrc`**:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

**Add to `package.json` scripts**:
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "format": "prettier --write \"src/**/*.js\"",
    "format:check": "prettier --check \"src/**/*.js\""
  }
}
```

---

### Task 0.9: Frontend Routing Setup
**Priority**: High | **Estimated Time**: 2 hours

**Steps**:
1. Set up React Router
2. Create route structure
3. Create layout components
4. Create page placeholders

**Subtasks**:
- [ ] Install react-router-dom
- [ ] Create App.jsx with routing
- [ ] Create layout components
- [ ] Create page placeholders

**File: `frontend/src/App.jsx`**:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentSchedulerPage } from './pages/AppointmentSchedulerPage';
import { AppointmentBookingPage } from './pages/AppointmentBookingPage';
import { AppointmentListPage } from './pages/AppointmentListPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<MainLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduler"
            element={
              <ProtectedRoute>
                <AppointmentSchedulerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/book"
            element={
              <ProtectedRoute>
                <AppointmentBookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <AppointmentListPage />
              </ProtectedRoute>
            }
          />
        </Route>
        
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### Task 0.10: Reusable Component Library
**Priority**: Medium | **Estimated Time**: 3 hours

**Steps**:
1. Create common UI components
2. Create layout components
3. Create form components
4. Create loading/error components

**Subtasks**:
- [ ] Create Button component
- [ ] Create Input component
- [ ] Create Modal component
- [ ] Create Card component
- [ ] Create LoadingSpinner component
- [ ] Create ErrorMessage component
- [ ] Create SuccessMessage component

**Component Structure**:
```
components/
├── common/
│   ├── Button/
│   │   ├── Button.jsx
│   │   └── Button.module.css
│   ├── Input/
│   ├── Select/
│   ├── Modal/
│   ├── Card/
│   ├── LoadingSpinner/
│   └── Notification/
├── layout/
│   ├── MainLayout/
│   ├── Header/
│   └── Sidebar/
└── forms/
    ├── FormField/
    └── FormSection/
```

**Example: Button Component** (`components/common/Button/Button.jsx`):
```jsx
import PropTypes from 'prop-types';
import './Button.css';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'btn';
  const variantClasses = `btn-${variant}`;
  const sizeClasses = `btn-${size}`;
  const classes = [baseClasses, variantClasses, sizeClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Button;
```

---

### Task 0.11: API Service Layer Setup
**Priority**: High | **Estimated Time**: 2 hours

**Steps**:
1. Create axios instance
2. Set up interceptors
3. Create API service functions
4. Create error handling

**Subtasks**:
- [ ] Create axios instance
- [ ] Add request interceptor
- [ ] Add response interceptor
- [ ] Create base API service

**File: `frontend/src/services/api.js`**:
```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Service
export const apiService = {
  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),

  // Doctors
  getDoctors: (params) => api.get('/doctors', { params }),

  // Appointments
  getAppointments: (params) => api.get('/appointments', { params }),
  createAppointment: (data) => api.post('/appointments', data),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  cancelAppointment: (id) => api.delete(`/appointments/${id}`),
  markArrived: (id) => api.post(`/appointments/${id}/arrive`),

  // Slots
  getSlots: (params) => api.get('/slots', { params }),

  // Patients
  searchPatients: (query) => api.get('/patients/search', { params: { query } }),
  createPatient: (data) => api.post('/patients', data),
};

export default api;
```

---

## Acceptance Criteria

### Server Health Check
- [ ] Server starts without errors
- [ ] `/api/health` endpoint returns 200 status
- [ ] Response includes correct JSON structure
- [ ] CORS headers are properly configured
- [ ] Environment variables are loaded correctly

### MongoDB Connection
- [ ] Database connects successfully
- [ ] Connection errors are logged
- [ ] Reconnection logic works on disconnect
- [ ] Graceful shutdown closes connection

### Error Handling
- [ ] 404 errors return proper JSON response
- [ ] 500 errors return proper JSON response
- [ ] Validation errors return proper format
- [ ] Stack traces only shown in development

### Frontend Setup
- [ ] React app renders without errors
- [ ] Routing works correctly
- [ ] API service configured
- [ ] Components render in browser

### Code Quality
- [ ] ESLint runs without errors
- [ ] Prettier formats code correctly
- [ ] NPM scripts work as expected
- [ ] .gitignore properly excludes files

---

## Testing Checklist

### Backend Tests
```bash
# Test server startup
npm run dev

# Test health endpoint
curl http://localhost:5000/api/health

# Test CORS
curl -H "Origin: http://localhost:5173" http://localhost:5000/api/health

# Test error handling
curl http://localhost:5000/api/nonexistent
```

### Frontend Tests
```bash
# Start frontend
npm run dev

# Test routing
# Navigate to each route and verify no errors

# Test API service
# Check browser console for any errors
```

---

## Deliverables

✅ Working Express server with middleware  
✅ MongoDB connection with retry logic  
✅ Error handling middleware  
✅ React app with routing  
✅ API service layer  
✅ Reusable UI components  
✅ Code quality tools configured  
✅ Environment configuration  
✅ Git repository initialized  
✅ Project documentation structure  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code formatted with Prettier
- [ ] No ESLint errors
- [ ] Server starts without errors
- [ ] Frontend renders without errors
- [ ] Git committed with meaningful message
- [ ] Ready for Sprint 1 (Authentication)

---

## Notes

1. **Do not proceed to Sprint 1 until all acceptance criteria are met**
2. All future sprints depend on this foundation being solid
3. Focus on architecture and patterns, not features
4. Keep code clean and well-documented
5. Test thoroughly before moving on

---

## Next Sprint

After completing Sprint 0, proceed to [Sprint 1: Authentication & User Management](./01-Sprint-1-Authentication.md) to implement the security foundation for the application.
