# Sprint 2: Role-Based Access Control (RBAC)

## Sprint Overview
**Duration**: 2-3 Days | **Focus**: Authorization layer and role management

This sprint implements the complete RBAC system including role-based permissions, middleware, and UI components. This ensures that users can only access features appropriate to their role.

---

## Sprint Goals

✅ Implement permission system  
✅ Create role-based authorization middleware  
✅ Implement Super Admin user creation  
✅ Create Doctor user creation  
✅ Create Receptionist user creation  
✅ Add role-based UI components  
✅ Implement role-based navigation  
✅ Test permission enforcement  

---

## Prerequisites

**Must Complete Sprint 1 First**:
- [x] Authentication system
- [x] User model with roles
- [x] JWT tokens
- [x] Protected routes

---

## Role Definitions

### Super Admin
- Create Doctor accounts
- Create Receptionist accounts
- Manage Doctor Schedules
- View all appointments
- Access all dashboards
- Full system access

### Receptionist
- Search Patients
- Book Appointments
- Update Appointments
- Mark Patient as Arrived
- View assigned appointments

### Doctor
- View only their own appointments
- View patient information
- Update consultation notes
- Mark appointment as completed

---

## Database Schema Updates

### No New Collections Required
The User model already includes the `role` field. This sprint focuses on implementing the authorization logic.

---

## Tasks

### Task 2.1: Permission Service
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Define permission constants
2. Create permission checker
3. Create role-permission mapper
4. Create authorization service

**Subtasks**:
- [ ] Create `constants/permissions.js`
- [ ] Create `services/permissionService.js`
- [ ] Define role-permission mapping
- [ ] Create permission checker functions

**File: `backend/src/constants/permissions.js`**:
```javascript
/**
 * Permission Constants
 * Defines all possible permissions in the system
 */

// User Management
const CREATE_DOCTOR = 'user.create_doctor';
const CREATE_RECEPTIONIST = 'user.create_receptionist';
const VIEW_ALL_USERS = 'user.view_all';

// Schedule Management
const MANAGE_SCHEDULES = 'schedule.manage';
const VIEW_ALL_SCHEDULES = 'schedule.view_all';

// Appointment Management
const BOOK_APPOINTMENT = 'appointment.book';
const UPDATE_APPOINTMENT = 'appointment.update';
const CANCEL_APPOINTMENT = 'appointment.cancel';
const VIEW_ALL_APPOINTMENTS = 'appointment.view_all';
const VIEW_OWN_APPOINTMENTS = 'appointment.view_own';
const MARK_ARRIVED = 'appointment.mark_arrived';
const MARK_COMPLETED = 'appointment.mark_completed';

// Patient Management
const VIEW_PATIENT_INFO = 'patient.view';
const SEARCH_PATIENTS = 'patient.search';
const CREATE_PATIENT = 'patient.create';

// Department Management
const MANAGE_DEPARTMENTS = 'department.manage';

// Dashboard Access
const VIEW_ADMIN_DASHBOARD = 'dashboard.view_admin';
const VIEW_DOCTOR_DASHBOARD = 'dashboard.view_doctor';
const VIEW_RECEPTIONIST_DASHBOARD = 'dashboard.view_receptionist';

module.exports = {
  CREATE_DOCTOR,
  CREATE_RECEPTIONIST,
  VIEW_ALL_USERS,
  MANAGE_SCHEDULES,
  VIEW_ALL_SCHEDULES,
  BOOK_APPOINTMENT,
  UPDATE_APPOINTMENT,
  CANCEL_APPOINTMENT,
  VIEW_ALL_APPOINTMENTS,
  VIEW_OWN_APPOINTMENTS,
  MARK_ARRIVED,
  MARK_COMPLETED,
  VIEW_PATIENT_INFO,
  SEARCH_PATIENTS,
  CREATE_PATIENT,
  MANAGE_DEPARTMENTS,
  VIEW_ADMIN_DASHBOARD,
  VIEW_DOCTOR_DASHBOARD,
  VIEW_RECEPTIONIST_DASHBOARD,
};
```

**File: `backend/src/services/permissionService.js`**:
```javascript
const AppError = require('../utils/AppError');

/**
 * Role to Permissions Mapping
 */
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'user.create_doctor',
    'user.create_receptionist',
    'user.view_all',
    'schedule.manage',
    'schedule.view_all',
    'appointment.view_all',
    'appointment.book',
    'appointment.update',
    'appointment.cancel',
    'appointment.mark_arrived',
    'patient.view',
    'patient.search',
    'patient.create',
    'department.manage',
    'dashboard.view_admin',
  ],
  DOCTOR: [
    'appointment.view_own',
    'appointment.mark_completed',
    'patient.view',
    'dashboard.view_doctor',
  ],
  RECEPTIONIST: [
    'appointment.book',
    'appointment.update',
    'appointment.cancel',
    'appointment.mark_arrived',
    'patient.view',
    'patient.search',
    'patient.create',
    'dashboard.view_receptionist',
  ],
};

/**
 * Check if user has permission
 * @param {Object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const hasPermission = (user, permission) => {
  if (!user || !user.role) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return rolePermissions?.includes(permission) || false;
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object with role
 * @param {Array<string>} permissions - Permissions to check
 * @returns {boolean}
 */
const hasAnyPermission = (user, permissions) => {
  if (!user || !user.role) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return permissions.some((permission) => rolePermissions?.includes(permission));
};

/**
 * Check if user has all specified permissions
 * @param {Object} user - User object with role
 * @param {Array<string>} permissions - Permissions to check
 * @returns {boolean}
 */
const hasAllPermissions = (user, permissions) => {
  if (!user || !user.role) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return permissions.every((permission) => rolePermissions?.includes(permission));
};

/**
 * Get all permissions for a role
 * @param {string} role - Role name
 * @returns {Array<string>}
 */
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Require user to have permission (throws error if not)
 * @param {Object} user - User object with role
 * @param {string} permission - Required permission
 * @throws {AppError}
 */
const requirePermission = (user, permission) => {
  if (!hasPermission(user, permission)) {
    throw new AppError(
      'You do not have permission to perform this action',
      403
    );
  }
};

/**
 * Require user to have any of the specified permissions
 * @param {Object} user - User object with role
 * @param {Array<string>} permissions - Required permissions
 * @throws {AppError}
 */
const requireAnyPermission = (user, permissions) => {
  if (!hasAnyPermission(user, permissions)) {
    throw new AppError(
      'You do not have permission to perform this action',
      403
    );
  }
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  requirePermission,
  requireAnyPermission,
};
```

---

### Task 2.2: Enhanced Authorization Middleware
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create permission-based middleware
2. Create resource ownership checker
3. Create role-based UI data filter

**Subtasks**:
- [ ] Update `middlewares/auth.js`
- [ ] Add permission middleware
- [ ] Add ownership checker

**File: `backend/src/middlewares/auth.js`** (Add to existing file):
```javascript
const permissionService = require('../services/permissionService');

/**
 * Require specific permission
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      permissionService.requirePermission(req.user, permission);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require any of the specified permissions
 * @param {...string} permissions - Required permissions
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    try {
      permissionService.requireAnyPermission(req.user, permissions);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check resource ownership for doctors
 * Ensures doctors can only access their own resources
 */
const checkDoctorOwnership = (resourceIdField = 'doctorId') => {
  return async (req, res, next) => {
    try {
      // Only applies to doctors
      if (req.user.role === 'DOCTOR') {
        const Doctor = require('../models/Doctor');

        // Find doctor profile for this user
        const doctor = await Doctor.findOne({ userId: req.user._id });

        if (!doctor) {
          throw new AppError('Doctor profile not found', 404);
        }

        // For creation, allow it
        if (req.method === 'POST') {
          req.body.doctorId = doctor._id;
          return next();
        }

        // For other methods, check ownership
        const resourceId = req.params.id || req.params.appointmentId;
        const Model = req.Model || require('../models/Appointment');

        const resource = await Model.findById(resourceId);

        if (!resource) {
          throw new AppError('Resource not found', 404);
        }

        if (resource[resourceIdField].toString() !== doctor._id.toString()) {
          throw new AppError('You can only access your own resources', 403);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Export all auth middleware
module.exports = {
  protect,
  authorize,
  optional,
  requirePermission,
  requireAnyPermission,
  checkDoctorOwnership,
};
```

---

### Task 2.3: User Creation Service
**Priority**: Critical | **Estimated Time**: 3 hours

**Steps**:
1. Create user creation service
2. Implement doctor creation
3. Implement receptionist creation
4. Add validation and checks

**Subtasks**:
- [ ] Create `services/userService.js`
- [ ] Implement createDoctor
- [ ] Implement createReceptionist
- [ ] Add input validation

**File: `backend/src/services/userService.js`**:
```javascript
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Receptionist = require('../models/Receptionist');
const Department = require('../models/Department');
const AppError = require('../utils/AppError');
const { generateTokens } = require('./jwtService');

/**
 * Create a new doctor user
 * @param {Object} doctorData - Doctor information
 * @param {Object} creator - User creating the doctor
 */
const createDoctor = async (doctorData, creator) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    departmentId,
    specialization,
    qualification,
    experience,
    consultationFee,
    consultationDuration,
  } = doctorData;

  // Check if department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role: 'DOCTOR',
  });

  // Create doctor profile
  const doctor = await Doctor.create({
    userId: user._id,
    departmentId,
    specialization,
    qualification,
    experience: experience || 0,
    consultationFee: consultationFee || 0,
    consultationDuration: consultationDuration || 15,
    createdBy: creator._id,
  });

  // Update user with profile reference
  user.profileId = doctor._id;
  user.profileType = 'Doctor';
  await user.save();

  // Return complete doctor data
  const populatedDoctor = await Doctor.findById(doctor._id)
    .populate('userId', 'email firstName lastName phoneNumber')
    .populate('departmentId', 'name');

  return {
    user: populatedDoctor.userId.toPublic(),
    doctor: populatedDoctor,
  };
};

/**
 * Create a new receptionist user
 * @param {Object} receptionistData - Receptionist information
 * @param {Object} creator - User creating the receptionist
 */
const createReceptionist = async (receptionistData, creator) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    departmentId,
    employeeId,
  } = receptionistData;

  // Check if department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Check if employee ID already exists
  const existingReceptionist = await Receptionist.findOne({ employeeId });
  if (existingReceptionist) {
    throw new AppError('Employee ID already exists', 400);
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role: 'RECEPTIONIST',
  });

  // Generate employee ID if not provided
  const finalEmployeeId = employeeId || `REC${Date.now()}`;

  // Create receptionist profile
  const receptionist = await Receptionist.create({
    userId: user._id,
    departmentId,
    employeeId: finalEmployeeId,
    createdBy: creator._id,
  });

  // Update user with profile reference
  user.profileId = receptionist._id;
  user.profileType = 'Receptionist';
  await user.save();

  // Return complete receptionist data
  const populatedReceptionist = await Receptionist.findById(receptionist._id)
    .populate('userId', 'email firstName lastName phoneNumber')
    .populate('departmentId', 'name');

  return {
    user: populatedReceptionist.userId.toPublic(),
    receptionist: populatedReceptionist,
  };
};

/**
 * Get all users (Super Admin only)
 * @param {Object} filters - Filter options
 */
const getAllUsers = async (filters = {}) => {
  const { role, isActive, page = 1, limit = 20 } = filters;

  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive;

  const users = await User.find(query)
    .select('-password')
    .populate('profileId')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  return {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Deactivate user
 * @param {string} userId - User ID
 */
const deactivateUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isActive = false;
  user.deletedAt = new Date();
  await user.save();

  // Revoke all refresh tokens
  const RefreshToken = require('../models/RefreshToken');
  await RefreshToken.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );

  return { message: 'User deactivated successfully' };
};

/**
 * Activate user
 * @param {string} userId - User ID
 */
const activateUser = async (userId) => {
  const user = await User.findOne({ _id: userId, deletedAt: { $ne: null } });

  if (!user) {
    throw new AppError('User not found or already active', 404);
  }

  user.isActive = true;
  user.deletedAt = null;
  await user.save();

  return { message: 'User activated successfully' };
};

module.exports = {
  createDoctor,
  createReceptionist,
  getAllUsers,
  deactivateUser,
  activateUser,
};
```

---

### Task 2.4: User Management Controller
**Priority**: High | **Estimated Time**: 2 hours

**Steps**:
1. Create user management controller
2. Implement doctor creation endpoint
3. Implement receptionist creation endpoint
4. Implement user listing endpoint

**Subtasks**:
- [ ] Create `controllers/userController.js`
- [ ] Add createDoctor
- [ ] Add createReceptionist
- [ ] Add listUsers

**File: `backend/src/controllers/userController.js`**:
```javascript
const userService = require('../services/userService');
const AppError = require('../utils/AppError');

/**
 * Create new doctor
 */
const createDoctor = async (req, res, next) => {
  try {
    const result = await userService.createDoctor(req.body, req.user);

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new receptionist
 */
const createReceptionist = async (req, res, next) => {
  try {
    const result = await userService.createReceptionist(req.body, req.user);

    res.status(201).json({
      success: true,
      message: 'Receptionist created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.query);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.users,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate user
 */
const deactivateUser = async (req, res, next) => {
  try {
    const result = await userService.deactivateUser(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate user
 */
const activateUser = async (req, res, next) => {
  try {
    const result = await userService.activateUser(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDoctor,
  createReceptionist,
  getUsers,
  deactivateUser,
  activateUser,
};
```

---

### Task 2.5: User Management Validators
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/validators/userValidators.js`**:
```javascript
const { body, validationResult } = require('express-validator');

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
 * Doctor creation validation
 */
const createDoctorValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim(),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim(),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim(),
  body('departmentId')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('specialization')
    .notEmpty()
    .withMessage('Specialization is required')
    .trim(),
  body('qualification')
    .notEmpty()
    .withMessage('Qualification is required')
    .trim(),
  body('consultationFee')
    .optional()
    .isNumeric()
    .withMessage('Consultation fee must be a number')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be positive'),
  body('consultationDuration')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('Consultation duration must be between 5 and 60 minutes'),
  validate,
];

/**
 * Receptionist creation validation
 */
const createReceptionistValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim(),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim(),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim(),
  body('departmentId')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('employeeId')
    .optional()
    .trim(),
  validate,
];

module.exports = {
  createDoctorValidation,
  createReceptionistValidation,
};
```

---

### Task 2.6: User Management Routes
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/routes/userRoutes.js`**:
```javascript
const express = require('express');
const userController = require('../controllers/userController');
const { protect, requirePermission } = require('../middlewares/auth');
const { createDoctorValidation, createReceptionistValidation } = require('../validators/userValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/users/doctors
 * @desc    Create a new doctor
 * @access  Private (Super Admin only)
 */
router.post(
  '/doctors',
  protect,
  requirePermission('user.create_doctor'),
  createDoctorValidation,
  userController.createDoctor
);

/**
 * @route   POST /api/v1/users/receptionists
 * @desc    Create a new receptionist
 * @access  Private (Super Admin only)
 */
router.post(
  '/receptionists',
  protect,
  requirePermission('user.create_receptionist'),
  createReceptionistValidation,
  userController.createReceptionist
);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private (Super Admin only)
 */
router.get(
  '/',
  protect,
  requirePermission('user.view_all'),
  userController.getUsers
);

/**
 * @route   PATCH /api/v1/users/:id/deactivate
 * @desc    Deactivate a user
 * @access  Private (Super Admin only)
 */
router.patch(
  '/:id/deactivate',
  protect,
  requirePermission('user.create_doctor'),
  userController.deactivateUser
);

/**
 * @route   PATCH /api/v1/users/:id/activate
 * @desc    Activate a user
 * @access  Private (Super Admin only)
 */
router.patch(
  '/:id/activate',
  protect,
  requirePermission('user.create_doctor'),
  userController.activateUser
);

module.exports = router;
```

---

### Task 2.7: Update App.js with User Routes
**Priority**: Critical | **Estimated Time**: 30 minutes

**File: `backend/src/app.js`** (Add this route):
```javascript
// ... existing imports and middleware

// API Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));

// ... 404 and error handlers
```

---

### Task 2.8: Frontend Permission Hook
**Priority**: High | **Estimated Time**: 1 hour

**File: `frontend/src/hooks/usePermissions.js`**:
```javascript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Permission mapping based on roles
 * This should match the backend permission service
 */
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'user.create_doctor',
    'user.create_receptionist',
    'user.view_all',
    'schedule.manage',
    'schedule.view_all',
    'appointment.view_all',
    'appointment.book',
    'appointment.update',
    'appointment.cancel',
    'appointment.mark_arrived',
    'patient.view',
    'patient.search',
    'patient.create',
    'department.manage',
    'dashboard.view_admin',
  ],
  DOCTOR: [
    'appointment.view_own',
    'appointment.mark_completed',
    'patient.view',
    'dashboard.view_doctor',
  ],
  RECEPTIONIST: [
    'appointment.book',
    'appointment.update',
    'appointment.cancel',
    'appointment.mark_arrived',
    'patient.view',
    'patient.search',
    'patient.create',
    'dashboard.view_receptionist',
  ],
};

/**
 * Custom hook for checking permissions
 */
export const usePermissions = () => {
  const { user } = useContext(AuthContext);

  /**
   * Check if user has permission
   */
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;

    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return rolePermissions?.includes(permission) || false;
  };

  /**
   * Check if user has any of the permissions
   */
  const hasAnyPermission = (permissions) => {
    if (!user || !user.role) return false;

    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return permissions.some((permission) => rolePermissions?.includes(permission));
  };

  /**
   * Check if user has all permissions
   */
  const hasAllPermissions = (permissions) => {
    if (!user || !user.role) return false;

    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return permissions.every((permission) => rolePermissions?.includes(permission));
  };

  /**
   * Get all permissions for current user
   */
  const getPermissions = () => {
    if (!user || !user.role) return [];
    return ROLE_PERMISSIONS[user.role] || [];
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissions,
    user,
  };
};
```

---

### Task 2.9: Role-Based Navigation Component
**Priority**: Medium | **Estimated Time**: 2 hours

**File: `frontend/src/components/layout/RoleBasedNav.jsx`**:
```jsx
import { usePermissions } from '../../hooks/usePermissions';

const RoleBasedNav = () => {
  const { hasPermission, user } = usePermissions();

  const navItems = [
    // Dashboard
    {
      label: 'Dashboard',
      path: '/dashboard',
      permission: 'dashboard.view_admin',
    },

    // Schedule Management (Super Admin only)
    {
      label: 'Manage Schedules',
      path: '/schedules',
      permission: 'schedule.manage',
    },

    // User Management (Super Admin only)
    {
      label: 'Manage Users',
      path: '/users',
      permission: 'user.create_doctor',
    },

    // Appointments
    {
      label: 'Appointments',
      path: '/appointments',
      permission: 'appointment.view_all',
    },

    // Book Appointment
    {
      label: 'Book Appointment',
      path: '/appointments/book',
      permission: 'appointment.book',
    },

    // My Appointments (Doctor)
    {
      label: 'My Appointments',
      path: '/my-appointments',
      permission: 'appointment.view_own',
    },
  ];

  return (
    <nav className="role-based-nav">
      <ul>
        {navItems.map((item) => {
          // Check if user has permission
          if (!hasPermission(item.permission)) return null;

          return (
            <li key={item.path}>
              <a href={item.path}>{item.label}</a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default RoleBasedNav;
```

---

### Task 2.10: Protected Component Wrapper
**Priority**: Medium | **Estimated Time**: 1 hour

**File: `frontend/src/components/common/ProtectedComponent.jsx`**:
```jsx
import { usePermissions } from '../../hooks/usePermissions';

/**
 * Component that renders children only if user has permission
 */
const ProtectedComponent = ({ permission, fallback = null, children }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
};

/**
 * Component that renders children only if user has any of the permissions
 */
const ProtectedAnyComponent = ({ permissions, fallback = null, children }) => {
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission(permissions)) {
    return fallback;
  }

  return children;
};

export { ProtectedComponent, ProtectedAnyComponent };
```

---

## Acceptance Criteria

### Backend RBAC
- [ ] Permission service with role-permission mapping
- [ ] Doctor creation works (Super Admin only)
- [ ] Receptionist creation works (Super Admin only)
- [ ] User listing works (Super Admin only)
- [ ] Permission middleware enforces access
- [ ] Doctors cannot access other doctors' data
- [ ] Receptionists cannot access admin features

### Frontend RBAC
- [ ] Navigation shows only permitted items
- [ ] Permission hook works correctly
- [ ] Protected components hide/show correctly
- [ ] Role-based UI elements display properly

### Security
- [ ] All protected routes enforce permissions
- [ ] Ownership checks prevent unauthorized access
- [ ] Permission checks are server-side (not just UI)

---

## Testing Checklist

### Manual Testing
```bash
# Test Doctor Creation (Super Admin only)
curl -X POST http://localhost:5000/api/v1/users/doctors \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "doctor123",
    "firstName": "Test",
    "lastName": "Doctor",
    "phoneNumber": "1234567890",
    "departmentId": "<department_id>",
    "specialization": "Cardiology",
    "qualification": "MBBS, MD",
    "consultationFee": 500
  }'

# Test as Doctor - Should fail
curl -X POST http://localhost:5000/api/v1/users/doctors \
  -H "Authorization: Bearer <doctor_token>" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Test User Listing
curl -X GET http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer <super_admin_token>"
```

---

## Deliverables

✅ Permission service  
✅ Enhanced authorization middleware  
✅ User creation service  
✅ User management controller  
✅ User management routes  
✅ Frontend permission hook  
✅ Role-based navigation  
✅ Protected component wrapper  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] RBAC works correctly for all roles
- [ ] Permission checks are server-side
- [ ] UI respects permissions
- [ ] No unauthorized access possible
- [ ] Code formatted with Prettier
- [ ] No ESLint errors
- [ ] Git committed with meaningful message
- [ ] Ready for Sprint 3 (Doctor & Department Data)

---

## Notes

1. **Defense in Depth**: Both server and client should check permissions
2. **Ownership Checks**: Doctors should only access their own data
3. **Default Deny**: If permission is unclear, deny access
4. **Audit Trail**: Log permission denials for security monitoring

---

## Next Sprint

After completing Sprint 2, proceed to [Sprint 3: Doctor & Department Management](./03-Sprint-3-Doctor-Department-Data.md) to implement core master data.
