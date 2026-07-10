# Sprint 4: Doctor Schedule Management

## Sprint Overview
**Duration**: 3 Days | **Focus**: Complex time-based configuration (Super Admin feature)

This sprint implements the doctor schedule configuration system including working days, multiple sessions per day, break timings, and slot duration settings. This is critical for appointment slot generation.

---

## Sprint Goals

✅ Create Schedule model with complex time structure  
✅ Implement schedule CRUD operations  
✅ Support multiple sessions per day  
✅ Support configurable break timings  
✅ Implement slot duration configuration  
✅ Create schedule configuration UI  
✅ Add time validation  
✅ Implement schedule effectiveness periods  

---

## Prerequisites

**Must Complete Sprint 3 First**:
- [x] Department management
- [x] Doctor management
- [x] Doctor-user relationships

---

## Database Schema

### Schedule Collection

```javascript
{
  _id: ObjectId,
  doctorId: ObjectId (ref: 'doctors', required),
  workingDays: [String] (enum: weekdays, required),
  sessions: [{
    name: String (required),           // "Morning", "Evening"
    startTime: String (required, "HH:mm"),
    endTime: String (required, "HH:mm")
  }],
  breaks: [{
    name: String (required),           // "Lunch", "Tea Break"
    startTime: String (required, "HH:mm"),
    endTime: String (required, "HH:mm")
  }],
  slotDuration: Number (default: 15, min: 5, max: 120),
  effectiveFrom: Date (required, default: now),
  effectiveTo: Date (default: null),   // null = indefinite
  isActive: Boolean (default: true),
  createdAt: Date (immutable),
  updatedAt: Date,
  createdBy: ObjectId (ref: 'users'),
  deletedAt: Date
}
```

---

## Tasks

### Task 4.1: Schedule Model
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create Schedule schema
2. Add time validation
3. Add indexes
4. Add methods for time calculations

**Subtasks**:
- [ ] Create `models/Schedule.js`
- [ ] Add time validation methods
- [ ] Add helper methods
- [ ] Add indexes

**File: `backend/src/models/Schedule.js`**:
```javascript
const mongoose = require('mongoose');

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const scheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
      index: true,
    },
    workingDays: {
      type: [String],
      required: [true, 'Working days are required'],
      enum: {
        values: WEEKDAYS,
        message: 'Invalid weekday value',
      },
    },
    sessions: {
      type: [
        {
          name: {
            type: String,
            required: [true, 'Session name is required'],
            trim: true,
          },
          startTime: {
            type: String,
            required: [true, 'Session start time is required'],
            validate: {
              validator: function (v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
              },
              message: 'Invalid time format. Use HH:mm',
            },
          },
          endTime: {
            type: String,
            required: [true, 'Session end time is required'],
            validate: {
              validator: function (v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
              },
              message: 'Invalid time format. Use HH:mm',
            },
          },
        },
      ],
      required: [true, 'At least one session is required'],
      validate: {
        validator: function (sessions) {
          // Check if sessions have valid time ranges
          return sessions.every((session) => {
            return session.startTime < session.endTime;
          });
        },
        message: 'Session start time must be before end time',
      },
    },
    breaks: {
      type: [
        {
          name: {
            type: String,
            required: [true, 'Break name is required'],
            trim: true,
          },
          startTime: {
            type: String,
            required: [true, 'Break start time is required'],
            validate: {
              validator: function (v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
              },
              message: 'Invalid time format. Use HH:mm',
            },
          },
          endTime: {
            type: String,
            required: [true, 'Break end time is required'],
            validate: {
              validator: function (v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
              },
              message: 'Invalid time format. Use HH:mm',
            },
          },
        },
      ],
      default: [],
      validate: {
        validator: function (breaks) {
          // Check if breaks have valid time ranges
          return breaks.every((breakItem) => {
            return breakItem.startTime < breakItem.endTime;
          });
        },
        message: 'Break start time must be before end time',
      },
    },
    slotDuration: {
      type: Number,
      required: [true, 'Slot duration is required'],
      default: 15,
      min: [5, 'Slot duration must be at least 5 minutes'],
      max: [120, 'Slot duration cannot exceed 120 minutes'],
    },
    effectiveFrom: {
      type: Date,
      required: [true, 'Effective from date is required'],
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          // If effectiveTo is set, it must be after effectiveFrom
          if (v === null) return true;
          return v > this.effectiveFrom;
        },
        message: 'Effective to date must be after effective from date',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
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
scheduleSchema.index({ doctorId: 1, isActive: 1, effectiveFrom: -1 });
scheduleSchema.index({ doctorId: 1, effectiveFrom: -1 });
scheduleSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

/**
 * Convert time string (HH:mm) to minutes from midnight
 */
scheduleSchema.statics.timeToMinutes = function (timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes from midnight to time string (HH:mm)
 */
scheduleSchema.statics.minutesToTime = function (minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Check if a time falls within a break period
 */
scheduleSchema.methods.isBreakTime = function (timeStr) {
  const time = this.constructor.timeToMinutes(timeStr);

  return this.breaks.some((breakItem) => {
    const startTime = this.constructor.timeToMinutes(breakItem.startTime);
    const endTime = this.constructor.timeToMinutes(breakItem.endTime);
    return time >= startTime && time < endTime;
  });
};

/**
 * Check if a time falls within any session
 */
scheduleSchema.methods.isSessionTime = function (timeStr) {
  const time = this.constructor.timeToMinutes(timeStr);

  return this.sessions.some((session) => {
    const startTime = this.constructor.timeToMinutes(session.startTime);
    const endTime = this.constructor.timeToMinutes(session.endTime);
    return time >= startTime && time < endTime;
  });
};

/**
 * Get total working minutes for a day
 */
scheduleSchema.methods.getTotalWorkingMinutes = function () {
  let total = 0;

  this.sessions.forEach((session) => {
    const startTime = this.constructor.timeToMinutes(session.startTime);
    const endTime = this.constructor.timeToMinutes(session.endTime);
    total += endTime - startTime;
  });

  // Subtract break times
  this.breaks.forEach((breakItem) => {
    const startTime = this.constructor.timeToMinutes(breakItem.startTime);
    const endTime = this.constructor.timeToMinutes(breakItem.endTime);
    total -= endTime - startTime;
  });

  return Math.max(0, total);
};

/**
 * Check if schedule is valid for a given date
 */
scheduleSchema.methods.isValidForDate = function (date) {
  const checkDate = new Date(date);
  const effectiveFromDate = new Date(this.effectiveFrom);
  effectiveFromDate.setHours(0, 0, 0, 0);

  checkDate.setHours(0, 0, 0, 0);

  // Check if date is before effective from
  if (checkDate < effectiveFromDate) {
    return false;
  }

  // Check if effectiveTo is set and date is after
  if (this.effectiveTo) {
    const effectiveToDate = new Date(this.effectiveTo);
    effectiveToDate.setHours(23, 59, 59, 999);

    if (checkDate > effectiveToDate) {
      return false;
    }
  }

  // Check if it's a working day
  const dayName = WEEKDAYS[checkDate.getDay()];
  return this.workingDays.includes(dayName);
};

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
```

---

### Task 4.2: Schedule Service
**Priority**: Critical | **Estimated Time**: 4 hours

**Steps**:
1. Create schedule service
2. Implement CRUD operations
3. Add validation for time overlaps
4. Add date-based queries

**Subtasks**:
- [ ] Create `services/scheduleService.js`
- [ ] Implement createSchedule
- [ ] Implement getSchedules
- [ ] Implement updateSchedule
- [ ] Implement deleteSchedule
- [ ] Add time overlap validation

**File: `backend/src/services/scheduleService.js`**:
```javascript
const Schedule = require('../models/Schedule');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');

/**
 * Create a new schedule
 */
const createSchedule = async (scheduleData, creator) => {
  const {
    doctorId,
    workingDays,
    sessions,
    breaks,
    slotDuration,
    effectiveFrom,
    effectiveTo,
  } = scheduleData;

  // Verify doctor exists
  const doctor = await Doctor.findOne({
    _id: doctorId,
    deletedAt: null,
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Validate sessions don't overlap
  if (hasOverlappingSessions(sessions)) {
    throw new AppError('Sessions cannot overlap each other', 400);
  }

  // Validate breaks are within sessions
  if (breaks && breaks.length > 0) {
    const breaksValidation = validateBreaks(sessions, breaks);
    if (!breaksValidation.valid) {
      throw new AppError(breaksValidation.message, 400);
    }
  }

  // Check if there's an active schedule for the same period
  const existingSchedule = await Schedule.findOne({
    doctorId,
    isActive: true,
    deletedAt: null,
    $or: [
      {
        effectiveFrom: { $lte: new Date(effectiveFrom) },
        effectiveTo: null,
      },
      {
        effectiveFrom: { $lte: new Date(effectiveFrom) },
        effectiveTo: { $gte: new Date(effectiveFrom) },
      },
    ],
  });

  if (existingSchedule) {
    throw new AppError(
      'An active schedule already exists for this period. Please end the current schedule before creating a new one.',
      400
    );
  }

  const schedule = await Schedule.create({
    doctorId,
    workingDays,
    sessions,
    breaks: breaks || [],
    slotDuration: slotDuration || 15,
    effectiveFrom: effectiveFrom || new Date(),
    effectiveTo: effectiveTo || null,
    createdBy: creator?._id,
  });

  return await getScheduleById(schedule._id);
};

/**
 * Get all schedules with filters
 */
const getSchedules = async (filters = {}) => {
  const {
    doctorId,
    isActive,
    date,
    page = 1,
    limit = 20,
  } = filters;

  const query = { deletedAt: null };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (doctorId) {
    query.doctorId = doctorId;
  }

  // If date is provided, find schedules valid for that date
  if (date) {
    const checkDate = new Date(date);
    query.$and = [
      {
        $or: [
          { effectiveFrom: { $lte: checkDate } },
          { effectiveFrom: { $lte: new Date() } },
        ],
      },
      {
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: checkDate } },
        ],
      },
    ];
  }

  const schedules = await Schedule.find(query)
    .populate('doctorId')
    .populate('createdBy', 'firstName lastName')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ effectiveFrom: -1 });

  const total = await Schedule.countDocuments(query);

  return {
    schedules,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get schedule by ID
 */
const getScheduleById = async (id) => {
  const schedule = await Schedule.findOne({
    _id: id,
    deletedAt: null,
  })
    .populate('doctorId')
    .populate('createdBy', 'firstName lastName');

  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }

  return schedule;
};

/**
 * Get active schedule for a doctor on a specific date
 */
const getActiveScheduleForDoctor = async (doctorId, date) => {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const schedule = await Schedule.findOne({
    doctorId,
    isActive: true,
    deletedAt: null,
    effectiveFrom: { $lte: checkDate },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: checkDate } }],
  })
    .populate('doctorId')
    .sort({ effectiveFrom: -1 });

  return schedule;
};

/**
 * Update schedule
 */
const updateSchedule = async (id, updateData, updater) => {
  const schedule = await Schedule.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }

  // If updating sessions or breaks, validate them
  if (updateData.sessions) {
    if (hasOverlappingSessions(updateData.sessions)) {
      throw new AppError('Sessions cannot overlap each other', 400);
    }
  }

  if (updateData.breaks && updateData.sessions) {
    const breaksValidation = validateBreaks(
      updateData.sessions,
      updateData.breaks
    );
    if (!breaksValidation.valid) {
      throw new AppError(breaksValidation.message, 400);
    }
  }

  // Update allowed fields
  const allowedUpdates = [
    'workingDays',
    'sessions',
    'breaks',
    'slotDuration',
    'effectiveFrom',
    'effectiveTo',
    'isActive',
  ];

  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      schedule[field] = updateData[field];
    }
  });

  await schedule.save();

  return await getScheduleById(id);
};

/**
 * Delete schedule (soft delete)
 */
const deleteSchedule = async (id) => {
  const schedule = await Schedule.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!schedule) {
    throw new AppError('Schedule not found', 404);
  }

  // Check if there are future appointments
  const Appointment = require('../models/Appointment');
  const futureAppointments = await Appointment.countDocuments({
    doctorId: schedule.doctorId,
    date: { $gte: new Date() },
    status: { $in: ['SCHEDULED', 'ARRIVED'] },
  });

  if (futureAppointments > 0) {
    throw new AppError(
      `Cannot delete schedule with ${futureAppointments} future appointment(s)`,
      400
    );
  }

  schedule.deletedAt = new Date();
  schedule.isActive = false;
  await schedule.save();

  return { message: 'Schedule deleted successfully' };
};

/**
 * Helper: Check if sessions overlap
 */
const hasOverlappingSessions = (sessions) => {
  const sortedSessions = [...sessions].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  for (let i = 0; i < sortedSessions.length - 1; i++) {
    const current = sortedSessions[i];
    const next = sortedSessions[i + 1];

    if (current.endTime > next.startTime) {
      return true;
    }
  }

  return false;
};

/**
 * Helper: Validate breaks are within sessions
 */
const validateBreaks = (sessions, breaks) => {
  for (const breakItem of breaks) {
    const breakStart = Schedule.timeToMinutes(breakItem.startTime);
    const breakEnd = Schedule.timeToMinutes(breakItem.endTime);

    let isWithinSession = false;

    for (const session of sessions) {
      const sessionStart = Schedule.timeToMinutes(session.startTime);
      const sessionEnd = Schedule.timeToMinutes(session.endTime);

      // Break should be entirely within a session
      if (breakStart >= sessionStart && breakEnd <= sessionEnd) {
        isWithinSession = true;
        break;
      }
    }

    if (!isWithinSession) {
      return {
        valid: false,
        message: `Break "${breakItem.name}" must be entirely within a session`,
      };
    }
  }

  return { valid: true };
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  getActiveScheduleForDoctor,
  updateSchedule,
  deleteSchedule,
};
```

---

### Task 4.3: Schedule Controller
**Priority**: High | **Estimated Time**: 2 hours

**File: `backend/src/controllers/scheduleController.js`**:
```javascript
const scheduleService = require('../services/scheduleService');

const createSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body, req.user);

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const result = await scheduleService.getSchedules(req.query);

    res.status(200).json({
      success: true,
      message: 'Schedules retrieved successfully',
      data: result.schedules,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Schedule retrieved successfully',
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
};

const getActiveScheduleForDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const schedule = await scheduleService.getActiveScheduleForDoctor(
      doctorId,
      date || new Date()
    );

    if (!schedule) {
      return res.status(200).json({
        success: true,
        message: 'No active schedule found',
        data: { schedule: null },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Schedule retrieved successfully',
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.updateSchedule(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.deleteSchedule(req.params.id);

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
  createSchedule,
  getSchedules,
  getScheduleById,
  getActiveScheduleForDoctor,
  updateSchedule,
  deleteSchedule,
};
```

---

### Task 4.4: Schedule Validators
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/validators/scheduleValidators.js`**:
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

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const createScheduleValidation = [
  body('doctorId')
    .notEmpty()
    .withMessage('Doctor is required')
    .isMongoId()
    .withMessage('Invalid doctor ID'),

  body('workingDays')
    .notEmpty()
    .withMessage('Working days are required')
    .isArray({ min: 1 })
    .withMessage('At least one working day is required')
    .custom((days) => {
      const invalidDays = days.filter((day) => !WEEKDAYS.includes(day));
      if (invalidDays.length > 0) {
        throw new Error(`Invalid weekdays: ${invalidDays.join(', ')}`);
      }
      return true;
    }),

  body('sessions')
    .notEmpty()
    .withMessage('Sessions are required')
    .isArray({ min: 1 })
    .withMessage('At least one session is required'),

  body('sessions.*.name')
    .notEmpty()
    .withMessage('Session name is required')
    .trim(),

  body('sessions.*.startTime')
    .notEmpty()
    .withMessage('Session start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:mm'),

  body('sessions.*.endTime')
    .notEmpty()
    .withMessage('Session end time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:mm'),

  body('breaks')
    .optional()
    .isArray()
    .withMessage('Breaks must be an array'),

  body('breaks.*.name')
    .if(body('breaks').exists())
    .notEmpty()
    .withMessage('Break name is required')
    .trim(),

  body('breaks.*.startTime')
    .if(body('breaks').exists())
    .notEmpty()
    .withMessage('Break start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:mm'),

  body('breaks.*.endTime')
    .if(body('breaks').exists())
    .notEmpty()
    .withMessage('Break end time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format. Use HH:mm'),

  body('slotDuration')
    .optional()
    .isInt({ min: 5, max: 120 })
    .withMessage('Slot duration must be between 5 and 120 minutes'),

  body('effectiveFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for effective from'),

  body('effectiveTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for effective to'),

  validate,
];

const updateScheduleValidation = [
  body('workingDays')
    .optional()
    .isArray()
    .custom((days) => {
      if (!days) return true;
      const invalidDays = days.filter((day) => !WEEKDAYS.includes(day));
      if (invalidDays.length > 0) {
        throw new Error(`Invalid weekdays: ${invalidDays.join(', ')}`);
      }
      return true;
    }),

  body('sessions')
    .optional()
    .isArray(),

  body('breaks')
    .optional()
    .isArray(),

  body('slotDuration')
    .optional()
    .isInt({ min: 5, max: 120 })
    .withMessage('Slot duration must be between 5 and 120 minutes'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  validate,
];

module.exports = {
  createScheduleValidation,
  updateScheduleValidation,
};
```

---

### Task 4.5: Schedule Routes
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/routes/scheduleRoutes.js`**:
```javascript
const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { protect, requirePermission } = require('../middlewares/auth');
const {
  createScheduleValidation,
  updateScheduleValidation,
} = require('../validators/scheduleValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/schedules
 * @desc    Create a new schedule
 * @access  Private (Super Admin only)
 */
router.post(
  '/',
  protect,
  requirePermission('schedule.manage'),
  createScheduleValidation,
  scheduleController.createSchedule
);

/**
 * @route   GET /api/v1/schedules
 * @desc    Get all schedules
 * @access  Private
 */
router.get('/', protect, scheduleController.getSchedules);

/**
 * @route   GET /api/v1/schedules/doctor/:doctorId
 * @desc    Get active schedule for a doctor
 * @access  Private
 */
router.get(
  '/doctor/:doctorId',
  protect,
  scheduleController.getActiveScheduleForDoctor
);

/**
 * @route   GET /api/v1/schedules/:id
 * @desc    Get schedule by ID
 * @access  Private
 */
router.get('/:id', protect, scheduleController.getScheduleById);

/**
 * @route   PUT /api/v1/schedules/:id
 * @desc    Update schedule
 * @access  Private (Super Admin only)
 */
router.put(
  '/:id',
  protect,
  requirePermission('schedule.manage'),
  updateScheduleValidation,
  scheduleController.updateSchedule
);

/**
 * @route   DELETE /api/v1/schedules/:id
 * @desc    Delete schedule
 * @access  Private (Super Admin only)
 */
router.delete(
  '/:id',
  protect,
  requirePermission('schedule.manage'),
  scheduleController.deleteSchedule
);

module.exports = router;
```

---

### Task 4.6: Update App.js
**Priority**: Critical | **Estimated Time**: 30 minutes

**File: `backend/src/app.js`** (Add route):
```javascript
// ... existing imports and middleware

// API Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/departments', require('./routes/departmentRoutes'));
app.use('/api/v1/doctors', require('./routes/doctorRoutes'));
app.use('/api/v1/schedules', require('./routes/scheduleRoutes'));

// ... 404 and error handlers
```

---

## Acceptance Criteria

### Backend
- [ ] Schedule model created with time validation
- [ ] Schedule creation works
- [ ] Multiple sessions can be added
- [ ] Break times can be configured
- [ ] Slot duration can be set
- [ ] Time overlap validation works
- [ ] Break times validated to be within sessions
- [ ] Schedule effectiveness periods work

### Frontend
- [ ] Can create schedule configuration
- [ ] Can view existing schedules
- [ ] Can add multiple sessions
- [ ] Can add break times
- [ ] Time picker works correctly

---

## Testing Checklist

```bash
# Create Schedule
curl -X POST http://localhost:5000/api/v1/schedules \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "<doctor_id>",
    "workingDays": ["MONDAY", "TUESDAY", "WEDNESDAY"],
    "sessions": [
      {"name": "Morning", "startTime": "09:00", "endTime": "13:00"},
      {"name": "Evening", "startTime": "14:00", "endTime": "17:00"}
    ],
    "breaks": [
      {"name": "Lunch", "startTime": "13:00", "endTime": "14:00"}
    ],
    "slotDuration": 15
  }'

# Get Schedules for Doctor
curl -X GET "http://localhost:5000/api/v1/schedules/doctor/<doctor_id>?date=2024-01-15"

# Get Schedule by ID
curl -X GET http://localhost:5000/api/v1/schedules/<schedule_id>
```

---

## Deliverables

✅ Schedule model  
✅ Schedule service  
✅ Schedule controller  
✅ Schedule validators  
✅ Schedule routes  
✅ Time validation  
✅ Break time validation  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Schedule CRUD works
- [ ] Time validation works
- [ ] Break validation works
- [ ] Code formatted
- [ ] No ESLint errors
- [ ] Ready for Sprint 5 (Patient Management)

---

## Next Sprint

After completing Sprint 4, proceed to [Sprint 5: Patient Management](./05-Sprint-5-Patient-Management.md) to implement patient data and search.
