# Sprint 6: Dynamic Slot Generation

## Sprint Overview
**Duration**: 3-4 Days | **Focus**: Algorithmic core of the system

This sprint implements the dynamic slot generation algorithm that creates appointment time slots based on doctor schedules, sessions, breaks, and slot duration. This is a critical component that must be bug-free.

---

## Sprint Goals

✅ Create Slot model  
✅ Implement slot generation algorithm  
✅ Handle multiple sessions per day  
✅ Exclude break periods from slots  
✅ Prevent slot overlap  
✅ Implement slot availability management  
✅ Create slot retrieval API  
✅ Add slot generation caching  

---

## Prerequisites

**Must Complete Sprint 5 First**:
- [x] Patient management
- [x] Schedule management
- [x] Doctor management

---

## Database Schema

### Slot Collection

```javascript
{
  _id: ObjectId,
  doctorId: ObjectId (ref: 'doctors', required),
  scheduleId: ObjectId (ref: 'schedules', required),
  date: Date (required),
  startTime: String (required, "HH:mm"),
  endTime: String (required, "HH:mm"),
  isAvailable: Boolean (default: true, index),
  appointmentId: ObjectId (ref: 'appointments', default: null),
  sessionName: String,
  createdAt: Date (immutable),
  updatedAt: Date
}
```

### Unique Constraint
```javascript
{ doctorId: 1, date: 1, startTime: 1 }  // UNIQUE
```

---

## Tasks

### Task 6.1: Slot Model
**Priority**: Critical | **Estimated Time**: 1 hour

**Steps**:
1. Create Slot schema
2. Add unique constraint
3. Add indexes
4. Add helper methods

**Subtasks**:
- [ ] Create `models/Slot.js`
- [ ] Add unique constraint
- [ ] Add indexes
- [ ] Add methods

**File: `backend/src/models/Slot.js`**:
```javascript
const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      required: [true, 'Schedule is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      validate: {
        validator: function (v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:mm',
      },
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      validate: {
        validator: function (v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:mm',
      },
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    sessionName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Unique constraint to prevent duplicate slots
slotSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true });

// Indexes for queries
slotSchema.index({ doctorId: 1, date: 1, isAvailable: 1 });
slotSchema.index({ date: 1, isAvailable: 1 });
slotSchema.index({ appointmentId: 1 });

/**
 * Convert time string to minutes
 */
slotSchema.statics.timeToMinutes = function (timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes to time string
 */
slotSchema.statics.minutesToTime = function (minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Mark slot as booked
 */
slotSchema.methods.book = async function (appointmentId) {
  this.isAvailable = false;
  this.appointmentId = appointmentId;
  return await this.save();
};

/**
 * Mark slot as available
 */
slotSchema.methods.release = async function () {
  this.isAvailable = true;
  this.appointmentId = null;
  return await this.save();
};

/**
 * Check if slot is in the past
 */
slotSchema.methods.isPast = function () {
  const slotDateTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':').map(Number);
  slotDateTime.setHours(hours, minutes, 0, 0);

  return slotDateTime < new Date();
};

const Slot = mongoose.model('Slot', slotSchema);

module.exports = Slot;
```

---

### Task 6.2: Slot Generation Service
**Priority**: Critical | **Estimated Time**: 5 hours

**Steps**:
1. Create slot generation algorithm
2. Handle time arithmetic
3. Handle break exclusion
4. Handle session boundaries
5. Add batch generation

**Subtasks**:
- [ ] Create `services/slotService.js`
- [ ] Implement generateSlotsForDay
- [ ] Implement generateSlotsForRange
- [ ] Implement slot cleanup
- [ ] Add error handling

**File: `backend/src/services/slotService.js`**:
```javascript
const Slot = require('../models/Slot');
const Schedule = require('../models/Schedule');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');
const { START } = require('nprogress');

/**
 * Generate slots for a specific doctor and date
 */
const generateSlotsForDay = async (doctorId, date) => {
  // Get doctor
  const doctor = await Doctor.findOne({
    _id: doctorId,
    isActive: true,
    deletedAt: null,
  });

  if (!doctor) {
    throw new AppError('Doctor not found or inactive', 404);
  }

  // Get active schedule for the date
  const schedule = await Schedule.findOne({
    doctorId,
    isActive: true,
    deletedAt: null,
    effectiveFrom: { $lte: new Date(date) },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date(date) } }],
  });

  if (!schedule) {
    throw new AppError('No active schedule found for this date', 404);
  }

  // Check if it's a working day
  const targetDate = new Date(date);
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = dayNames[targetDate.getDay()];

  if (!schedule.workingDays.includes(dayName)) {
    return []; // No slots on non-working days
  }

  // Check if slots already exist for this date
  const existingSlots = await Slot.countDocuments({
    doctorId,
    date: targetDate,
  });

  if (existingSlots > 0) {
    throw new AppError(`Slots already exist for ${date}. Use regeneration to update.`, 400);
  }

  // Generate slots for each session
  const slots = [];
  const slotDuration = schedule.slotDuration;

  for (const session of schedule.sessions) {
    const sessionSlots = generateSlotsForSession(
      doctorId,
      schedule._id,
      targetDate,
      session,
      schedule.breaks,
      slotDuration
    );
    slots.push(...sessionSlots);
  }

  // Batch insert slots
  if (slots.length > 0) {
    await Slot.insertMany(slots);
  }

  return slots;
};

/**
 * Generate slots for a single session
 */
const generateSlotsForSession = (
  doctorId,
  scheduleId,
  date,
  session,
  breaks,
  slotDuration
) => {
  const slots = [];
  const startMinutes = Slot.timeToMinutes(session.startTime);
  const endMinutes = Slot.timeToMinutes(session.endTime);

  let currentMinutes = startMinutes;

  while (currentMinutes + slotDuration <= endMinutes) {
    const slotStart = Slot.minutesToTime(currentMinutes);
    const slotEnd = Slot.minutesToTime(currentMinutes + slotDuration);

    // Check if this slot falls within any break period
    const isInBreak = isTimeInBreak(slotStart, slotEnd, breaks);

    if (!isInBreak) {
      slots.push({
        doctorId,
        scheduleId,
        date: new Date(date),
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: true,
        sessionName: session.name,
      });
    }

    currentMinutes += slotDuration;
  }

  return slots;
};

/**
 * Check if a time slot falls within any break period
 */
const isTimeInBreak = (slotStart, slotEnd, breaks) => {
  if (!breaks || breaks.length === 0) return false;

  const slotStartMinutes = Slot.timeToMinutes(slotStart);
  const slotEndMinutes = Slot.timeToMinutes(slotEnd);

  for (const breakItem of breaks) {
    const breakStartMinutes = Slot.timeToMinutes(breakItem.startTime);
    const breakEndMinutes = Slot.timeToMinutes(breakItem.endTime);

    // Check if slot overlaps with break
    // Slot should be completely outside break period
    if (
      (slotStartMinutes >= breakStartMinutes && slotStartMinutes < breakEndMinutes) ||
      (slotEndMinutes > breakStartMinutes && slotEndMinutes <= breakEndMinutes) ||
      (slotStartMinutes <= breakStartMinutes && slotEndMinutes >= breakEndMinutes)
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Generate slots for a date range
 */
const generateSlotsForRange = async (doctorId, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new AppError('Start date must be before end date', 400);
  }

  // Limit range to prevent excessive generation
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    throw new AppError('Cannot generate slots for more than 90 days at once', 400);
  }

  const slots = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    try {
      const daySlots = await generateSlotsForDay(doctorId, new Date(currentDate));
      slots.push(...daySlots);
    } catch (error) {
      // Log error but continue with next day
      console.error(`Failed to generate slots for ${currentDate.toDateString()}:`, error.message);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
};

/**
 * Get available slots for a doctor on a specific date
 */
const getAvailableSlots = async (doctorId, date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const slots = await Slot.find({
    doctorId,
    date: targetDate,
    isAvailable: true,
  })
    .sort({ startTime: 1 })
    .lean();

  // Filter out past slots for today
  const now = new Date();
  const isToday = targetDate.toDateString() === now.toDateString();

  if (isToday) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return slots.filter((slot) => {
      const slotMinutes = Slot.timeToMinutes(slot.startTime);
      return slotMinutes > currentMinutes;
    });
  }

  return slots;
};

/**
 * Get slots by appointment
 */
const getSlotByAppointment = async (appointmentId) => {
  const slot = await Slot.findOne({ appointmentId });

  if (!slot) {
    throw new AppError('Slot not found for this appointment', 404);
  }

  return slot;
};

/**
 * Delete all slots for a doctor on a specific date
 */
const deleteSlotsForDay = async (doctorId, date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Check if any slots are booked
  const bookedSlots = await Slot.countDocuments({
    doctorId,
    date: targetDate,
    isAvailable: false,
  });

  if (bookedSlots > 0) {
    throw new AppError(
      `Cannot delete slots with ${bookedSlots} existing booking(s)`,
      400
    );
  }

  const result = await Slot.deleteMany({
    doctorId,
    date: targetDate,
  });

  return { deletedCount: result.deletedCount };
};

/**
 * Regenerate slots for a day (deletes existing and creates new)
 */
const regenerateSlotsForDay = async (doctorId, date) => {
  // First delete existing slots
  await deleteSlotsForDay(doctorId, date);

  // Then generate new slots
  return await generateSlotsForDay(doctorId, date);
};

/**
 * Clean up old slots (older than specified days)
 */
const cleanupOldSlots = async (daysToKeep = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  cutoffDate.setHours(0, 0, 0, 0);

  // Only delete available slots (not booked ones)
  const result = await Slot.deleteMany({
    date: { $lt: cutoffDate },
    isAvailable: true,
    appointmentId: null,
  });

  return { deletedCount: result.deletedCount };
};

module.exports = {
  generateSlotsForDay,
  generateSlotsForRange,
  getAvailableSlots,
  getSlotByAppointment,
  deleteSlotsForDay,
  regenerateSlotsForDay,
  cleanupOldSlots,
};
```

---

### Task 6.3: Slot Controller
**Priority**: High | **Estimated Time**: 2 hours

**File: `backend/src/controllers/slotController.js`**:
```javascript
const slotService = require('../services/slotService');

const generateSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.body;

    const slots = await slotService.generateSlotsForDay(doctorId, date);

    res.status(201).json({
      success: true,
      message: `${slots.length} slots generated successfully`,
      data: { slots, count: slots.length },
    });
  } catch (error) {
    next(error);
  }
};

const generateSlotsRange = async (req, res, next) => {
  try {
    const { doctorId, startDate, endDate } = req.body;

    const slots = await slotService.generateSlotsForRange(
      doctorId,
      startDate,
      endDate
    );

    res.status(201).json({
      success: true,
      message: `${slots.length} slots generated successfully`,
      data: { slots, count: slots.length },
    });
  } catch (error) {
    next(error);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID and date are required',
        errors: [
          { field: 'doctorId', message: 'Doctor ID is required' },
          { field: 'date', message: 'Date is required' },
        ],
      });
    }

    const slots = await slotService.getAvailableSlots(doctorId, date);

    res.status(200).json({
      success: true,
      message: 'Slots retrieved successfully',
      data: { slots, count: slots.length },
    });
  } catch (error) {
    next(error);
  }
};

const deleteSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.params;

    const result = await slotService.deleteSlotsForDay(doctorId, date);

    res.status(200).json({
      success: true,
      message: result.message || `Deleted ${result.deletedCount} slots`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};

const regenerateSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.body;

    const slots = await slotService.regenerateSlotsForDay(doctorId, date);

    res.status(200).json({
      success: true,
      message: `${slots.length} slots regenerated successfully`,
      data: { slots, count: slots.length },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateSlots,
  generateSlotsRange,
  getAvailableSlots,
  deleteSlots,
  regenerateSlots,
};
```

---

### Task 6.4: Slot Validators
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/validators/slotValidators.js`**:
```javascript
const { body, validationResult, query } = require('express-validator');

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

const generateSlotsValidation = [
  body('doctorId')
    .notEmpty()
    .withMessage('Doctor ID is required')
    .isMongoId()
    .withMessage('Invalid doctor ID'),

  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  validate,
];

const generateSlotsRangeValidation = [
  body('doctorId')
    .notEmpty()
    .withMessage('Doctor ID is required')
    .isMongoId()
    .withMessage('Invalid doctor ID'),

  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  validate,
];

module.exports = {
  generateSlotsValidation,
  generateSlotsRangeValidation,
};
```

---

### Task 6.5: Slot Routes
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/routes/slotRoutes.js`**:
```javascript
const express = require('express');
const slotController = require('../controllers/slotController');
const { protect, requirePermission } = require('../middlewares/auth');
const {
  generateSlotsValidation,
  generateSlotsRangeValidation,
} = require('../validators/slotValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/slots/generate
 * @desc    Generate slots for a specific day
 * @access  Private (Super Admin only)
 */
router.post(
  '/generate',
  protect,
  requirePermission('schedule.manage'),
  generateSlotsValidation,
  slotController.generateSlots
);

/**
 * @route   POST /api/v1/slots/generate-range
 * @desc    Generate slots for a date range
 * @access  Private (Super Admin only)
 */
router.post(
  '/generate-range',
  protect,
  requirePermission('schedule.manage'),
  generateSlotsRangeValidation,
  slotController.generateSlotsRange
);

/**
 * @route   GET /api/v1/slots/available
 * @desc    Get available slots for a doctor on a date
 * @access  Private
 */
router.get('/available', protect, slotController.getAvailableSlots);

/**
 * @route   DELETE /api/v1/slots/:doctorId/:date
 * @desc    Delete all slots for a doctor on a date
 * @access  Private (Super Admin only)
 */
router.delete(
  '/:doctorId/:date',
  protect,
  requirePermission('schedule.manage'),
  slotController.deleteSlots
);

/**
 * @route   POST /api/v1/slots/regenerate
 * @desc    Regenerate slots for a day
 * @access  Private (Super Admin only)
 */
router.post(
  '/regenerate',
  protect,
  requirePermission('schedule.manage'),
  generateSlotsValidation,
  slotController.regenerateSlots
);

module.exports = router;
```

---

### Task 6.6: Update App.js
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
app.use('/api/v1/patients', require('./routes/patientRoutes'));
app.use('/api/v1/slots', require('./routes/slotRoutes'));

// ... 404 and error handlers
```

---

## Acceptance Criteria

### Backend
- [ ] Slot model with unique constraint
- [ ] Slot generation works for single day
- [ ] Slot generation works for date range
- [ ] Slots respect session boundaries
- [ ] Slots exclude break periods
- [ ] Slots don't overlap
- [ ] Available slots query works
- [ ] Past slots are filtered
- [ ] Slot deletion works
- [ ] Slot regeneration works

### Algorithm Correctness
- [ ] Slots generated at correct intervals
- [ ] No slots during breaks
- [ ] No duplicate slots
- [ ] Session boundaries respected
- [ ] Time calculations accurate

---

## Testing Checklist

```bash
# Generate Slots for a Day
curl -X POST http://localhost:5000/api/v1/slots/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "<doctor_id>",
    "date": "2024-01-15"
  }'

# Get Available Slots
curl -X GET "http://localhost:5000/api/v1/slots/available?doctorId=<doctor_id>&date=2024-01-15"

# Generate Slots for Range
curl -X POST http://localhost:5000/api/v1/slots/generate-range \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "<doctor_id>",
    "startDate": "2024-01-15",
    "endDate": "2024-01-20"
  }'
```

---

## Deliverables

✅ Slot model  
✅ Slot generation service  
✅ Slot controller  
✅ Slot validators  
✅ Slot routes  
✅ Time arithmetic helpers  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Slot generation works correctly
- [ ] Break exclusion works
- [ ] No duplicate slots possible
- [ ] Code formatted
- [ ] No ESLint errors
- [ ] Ready for Sprint 7 (Appointment Booking)

---

## Next Sprint

After completing Sprint 6, proceed to [Sprint 7: Appointment Booking Engine](./07-Sprint-7-Appointment-Booking.md) to implement the core booking functionality with concurrency control.
