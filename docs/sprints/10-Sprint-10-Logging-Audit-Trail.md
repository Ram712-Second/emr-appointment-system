# Sprint 10: Logging & Audit Trail

## Sprint Overview
**Duration**: 2 Days | **Focus**: Compliance and accountability

This sprint implements comprehensive audit logging for all critical system actions to maintain compliance, accountability, and security monitoring.

---

## Sprint Goals

✅ Create Audit Log model  
✅ Implement logging for all critical actions  
✅ Create audit log service  
✅ Add async logging to avoid performance impact  
✅ Implement audit log viewer (admin only)  
✅ Add login/logout tracking  
✅ Add appointment action tracking  
✅ Implement log retention policy  

---

## Prerequisites

**Must Complete Sprint 9 First**:
- [x] Appointment search
- [x] Filtering and pagination
- [x] All core features

---

## Database Schema

### Audit Log Collection

```javascript
{
  _id: ObjectId,
  action: String (enum: actions, required, index),
  userId: ObjectId (ref: 'users', required, index),
  userRole: String (required),
  userName: String (required),
  entityType: String (enum: entities, required),
  entityId: ObjectId (required, index),
  entityDescription: String (required),
  changes: Object (default: null),
  ipAddress: String,
  userAgent: String,
  timestamp: Date (required, index)
}
```

---

## Tasks

### Task 10.1: Audit Log Model
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/models/AuditLog.js`**:

```javascript
const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_UPDATED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_ARRIVED',
  'APPOINTMENT_COMPLETED',
  'SCHEDULE_CREATED',
  'SCHEDULE_UPDATED',
  'DOCTOR_CREATED',
  'RECEPTIONIST_CREATED',
  'PATIENT_CREATED',
  'USER_DEACTIVATED',
  'USER_ACTIVATED',
];

const ENTITY_TYPES = [
  'Appointment',
  'Schedule',
  'Doctor',
  'Patient',
  'User',
  'Slot',
  'Department',
];

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: AUDIT_ACTIONS,
        message: 'Invalid action type',
      },
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    userRole: {
      type: String,
      required: [true, 'User role is required'],
      enum: ['SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: {
        values: ENTITY_TYPES,
        message: 'Invalid entity type',
      },
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true,
    },
    entityDescription: {
      type: String,
      required: [true, 'Entity description is required'],
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ entityType: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

// TTL index for automatic cleanup (1 year retention)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = { AuditLog, AUDIT_ACTIONS, ENTITY_TYPES };
```

---

### Task 10.2: Audit Service
**Priority**: High | **Estimated Time**: 3 hours

**File: `backend/src/services/auditService.js`**:

```javascript
const { AuditLog } = require('../models/AuditLog');

/**
 * Create an audit log entry
 * @param {Object} logData - Log entry data
 * @param {string} logData.action - Action performed
 * @param {Object} logData.user - User who performed the action
 * @param {string} logData.entityType - Type of entity affected
 * @param {ObjectId} logData.entityId - ID of entity affected
 * @param {string} logData.entityDescription - Description of entity
 * @param {Object} logData.changes - Changes made (before/after)
 * @param {Object} req - Express request object (for IP and user agent)
 */
const createAuditLog = async (logData, req = null) => {
  try {
    const {
      action,
      user,
      entityType,
      entityId,
      entityDescription,
      changes = null,
    } = logData;

    const logEntry = {
      action,
      userId: user._id,
      userRole: user.role,
      userName: `${user.firstName} ${user.lastName}`,
      entityType,
      entityId,
      entityDescription,
      changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get('user-agent') || null,
      timestamp: new Date(),
    };

    // Use insertOne for better performance
    await AuditLog.insertMany([logEntry], { ordered: false });
  } catch (error) {
    // Log audit errors to console but don't throw
    console.error('Failed to create audit log:', error);
  }
};

/**
 * Create audit log for login
 */
const logLogin = async (user, req) => {
  await createAuditLog(
    {
      action: 'LOGIN',
      user,
      entityType: 'User',
      entityId: user._id,
      entityDescription: `User ${user.email} logged in`,
    },
    req
  );
};

/**
 * Create audit log for logout
 */
const logLogout = async (user, req) => {
  await createAuditLog(
    {
      action: 'LOGOUT',
      user,
      entityType: 'User',
      entityId: user._id,
      entityDescription: `User ${user.email} logged out`,
    },
    req
  );
};

/**
 * Create audit log for appointment creation
 */
const logAppointmentCreated = async (appointment, user, req) => {
  await createAuditLog(
    {
      action: 'APPOINTMENT_CREATED',
      user,
      entityType: 'Appointment',
      entityId: appointment._id,
      entityDescription: `Appointment ${appointment.appointmentNumber} created for ${appointment.patientId?.firstName} ${appointment.patientId?.lastName} with Dr. ${appointment.doctorId?.userId?.firstName} ${appointment.doctorId?.userId?.lastName}`,
      changes: {
        appointment: appointment.appointmentNumber,
        patient: appointment.patientId?.firstName + ' ' + appointment.patientId?.lastName,
        doctor: appointment.doctorId?.userId?.firstName + ' ' + appointment.doctorId?.userId?.lastName,
        date: appointment.date,
        time: appointment.startTime,
      },
    },
    req
  );
};

/**
 * Create audit log for appointment update
 */
const logAppointmentUpdated = async (appointment, changes, user, req) => {
  await createAuditLog(
    {
      action: 'APPOINTMENT_UPDATED',
      user,
      entityType: 'Appointment',
      entityId: appointment._id,
      entityDescription: `Appointment ${appointment.appointmentNumber} updated`,
      changes,
    },
    req
  );
};

/**
 * Create audit log for appointment cancellation
 */
const logAppointmentCancelled = async (appointment, reason, user, req) => {
  await createAuditLog(
    {
      action: 'APPOINTMENT_CANCELLED',
      user,
      entityType: 'Appointment',
      entityId: appointment._id,
      entityDescription: `Appointment ${appointment.appointmentNumber} cancelled`,
      changes: {
        reason,
        cancelledAt: new Date(),
      },
    },
    req
  );
};

/**
 * Create audit log for appointment arrived
 */
const logAppointmentArrived = async (appointment, user, req) => {
  await createAuditLog(
    {
      action: 'APPOINTMENT_ARRIVED',
      user,
      entityType: 'Appointment',
      entityId: appointment._id,
      entityDescription: `Patient ${appointment.patientId?.firstName} ${appointment.patientId?.lastName} arrived for appointment ${appointment.appointmentNumber}`,
      changes: {
        arrivedAt: new Date(),
      },
    },
    req
  );
};

/**
 * Create audit log for appointment completed
 */
const logAppointmentCompleted = async (appointment, user, req) => {
  await createAuditLog(
    {
      action: 'APPOINTMENT_COMPLETED',
      user,
      entityType: 'Appointment',
      entityId: appointment._id,
      entityDescription: `Appointment ${appointment.appointmentNumber} completed`,
      changes: {
        completedAt: new Date(),
      },
    },
    req
  );
};

/**
 * Get audit logs with filters
 */
const getAuditLogs = async (filters = {}) => {
  const {
    userId,
    action,
    entityType,
    entityId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50,
  } = filters;

  const query = {};

  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (entityId) {
    query.entityId = entityId;
  }

  if (dateFrom || dateTo) {
    query.timestamp = {};
    if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
    if (dateTo) query.timestamp.$lte = new Date(dateTo);
  }

  const logs = await AuditLog.find(query)
    .populate('userId', 'email firstName lastName')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ timestamp: -1 });

  const total = await AuditLog.countDocuments(query);

  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get audit trail for a specific entity
 */
const getEntityAuditTrail = async (entityType, entityId) => {
  const logs = await AuditLog.find({
    entityType,
    entityId,
  })
    .populate('userId', 'firstName lastName email')
    .sort({ timestamp: -1 });

  return logs;
};

/**
 * Get user activity history
 */
const getUserActivity = async (userId, options = {}) => {
  const { limit = 50, skip = 0 } = options;

  const logs = await AuditLog.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);

  return logs;
};

/**
 * Clean up old audit logs (manual cleanup)
 */
const cleanupOldLogs = async (daysToKeep = 365) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await AuditLog.deleteMany({
    timestamp: { $lt: cutoffDate },
  });

  return { deletedCount: result.deletedCount };
};

module.exports = {
  createAuditLog,
  logLogin,
  logLogout,
  logAppointmentCreated,
  logAppointmentUpdated,
  logAppointmentCancelled,
  logAppointmentArrived,
  logAppointmentCompleted,
  getAuditLogs,
  getEntityAuditTrail,
  getUserActivity,
  cleanupOldLogs,
};
```

---

### Task 10.3: Integrate Audit Logging
**Priority**: High | **Estimated Time**: 2 hours

**Update existing services to include audit logging:**

**Update `backend/src/services/authService.js`** (Add login/logout logging):

```javascript
const auditService = require('./auditService');

// In login function:
const login = async (email, password, ipAddress, userAgent, req) => {
  // ... existing code ...

  // Log the login
  await auditService.logLogin(user, req);

  return { user, tokens };
};

// In logout function:
const logout = async (userId, refreshToken, req) => {
  // ... existing code ...

  // Get user for logging
  const user = await User.findById(userId);
  if (user) {
    await auditService.logLogout(user, req);
  }

  return { message: 'Logged out successfully' };
};
```

**Update `backend/src/services/appointmentService.js`** (Add appointment logging):

```javascript
const auditService = require('./auditService');

// In createAppointment:
const createAppointment = async (appointmentData, booker, req) => {
  // ... existing code ...

  // Log the appointment creation
  await auditService.logAppointmentCreated(completeAppointment, booker, req);

  return completeAppointment;
};

// In cancelAppointment:
const cancelAppointment = async (appointmentId, reason, canceller, req) => {
  // ... existing code ...

  // Log the cancellation
  await auditService.logAppointmentCancelled(appointment, reason, canceller, req);

  return appointment;
};

// In updateAppointment:
const updateAppointment = async (appointmentId, updateData, updater, req) => {
  // ... existing code ...

  // Log the update
  await auditService.logAppointmentUpdated(appointment, updateData, updater, req);

  return appointment;
};

// In markAppointmentAsArrived:
const markAppointmentAsArrived = async (appointmentId, updater, req) => {
  // ... existing code ...

  // Log arrival
  await auditService.logAppointmentArrived(appointment, updater, req);

  return appointment;
};

// In markAppointmentAsCompleted:
const markAppointmentAsCompleted = async (appointmentId, consultationNotes, completer, req) => {
  // ... existing code ...

  // Log completion
  await auditService.logAppointmentCompleted(appointment, completer, req);

  return appointment;
};
```

**Note**: Update all service function signatures to accept `req` parameter for audit logging.

---

### Task 10.4: Audit Log Controller
**Priority**: Medium | **Estimated Time**: 1 hour

**File: `backend/src/controllers/auditController.js`**:

```javascript
const auditService = require('../services/auditService');
const AppError = require('../utils/AppError');

const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);

    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result.logs,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEntityAuditTrail = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await auditService.getEntityAuditTrail(entityType, entityId);

    res.status(200).json({
      success: true,
      message: 'Entity audit trail retrieved successfully',
      data: { logs, count: logs.length },
    });
  } catch (error) {
    next(error);
  }
};

const getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const logs = await auditService.getUserActivity(userId, req.query);

    res.status(200).json({
      success: true,
      message: 'User activity retrieved successfully',
      data: { logs, count: logs.length },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getEntityAuditTrail,
  getUserActivity,
};
```

---

### Task 10.5: Audit Routes
**Priority**: Medium | **Estimated Time**: 1 hour

**File: `backend/src/routes/auditRoutes.js`**:

```javascript
const express = require('express');
const auditController = require('../controllers/auditController');
const { protect, requirePermission } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route   GET /api/v1/audit/logs
 * @desc    Get audit logs with filters
 * @access  Private (Super Admin only)
 */
router.get(
  '/logs',
  protect,
  requirePermission('user.view_all'),
  auditController.getAuditLogs
);

/**
 * @route   GET /api/v1/audit/entity/:entityType/:entityId
 * @desc    Get audit trail for a specific entity
 * @access  Private (Super Admin only)
 */
router.get(
  '/entity/:entityType/:entityId',
  protect,
  requirePermission('user.view_all'),
  auditController.getEntityAuditTrail
);

/**
 * @route   GET /api/v1/audit/user/:userId/activity
 * @desc    Get user activity history
 * @access  Private (Super Admin only)
 */
router.get(
  '/user/:userId/activity',
  protect,
  requirePermission('user.view_all'),
  auditController.getUserActivity
);

module.exports = router;
```

---

### Task 10.6: Update App.js
**Priority**: High | **Estimated Time**: 30 minutes

**File: `backend/src/app.js`** (Add route):

```javascript
// ... existing routes
app.use('/api/v1/audit', require('./routes/auditRoutes'));
```

---

## Acceptance Criteria

### Backend
- [ ] Audit model created with TTL index
- [ ] Login/logout logging works
- [ ] Appointment actions logged
- [ ] Audit log viewer works (admin only)
- [ ] Entity audit trail works
- [ ] User activity tracking works
- [ ] Async logging doesn't impact performance
- [ ] Log retention policy works (TTL index)

### Coverage
- [ ] All critical actions logged
- [ ] All changes captured
- [ ] IP addresses captured
- [ ] User agents captured

---

## Testing Checklist

```bash
# Get Audit Logs
curl -X GET "http://localhost:5000/api/v1/audit/logs?action=APPOINTMENT_CREATED&page=1&limit=10"

# Get Entity Audit Trail
curl -X GET "http://localhost:5000/api/v1/audit/entity/Appointment/<appointment_id>"

# Get User Activity
curl -X GET "http://localhost:5000/api/v1/audit/user/<user_id>/activity"
```

---

## Deliverables

✅ Audit Log model  
✅ Audit service  
✅ Integrated logging  
✅ Audit controller  
✅ Audit routes  
✅ Log retention (TTL)  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All critical actions logged
- [ ] Audit viewer works
- [ ] Performance not impacted
- [ ] Code formatted
- [ ] Ready for Sprint 11 (Real-Time Updates)

---

## Next Sprint

After completing Sprint 10, proceed to [Sprint 11: Real-Time Appointment Updates](./11-Sprint-11-Real-Time-Updates.md) to implement WebSocket functionality.
