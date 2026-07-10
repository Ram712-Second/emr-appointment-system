# Sprint 7: Appointment Booking Engine

## Sprint Overview
**Duration**: 4-5 Days | **Focus**: Core business logic with concurrency control

This sprint implements the appointment booking engine with **critical concurrency control** to prevent double booking. This is the most business-critical feature of the system.

---

## Sprint Goals

✅ Create Appointment model with status workflow  
✅ Implement atomic booking operations  
✅ Implement double-booking prevention  
✅ Support existing/new patient selection  
✅ Implement proper status transitions  
✅ Create booking UI with patient search  
✅ Add real-time slot availability  
✅ Implement transaction-based booking  

---

## Prerequisites

**Must Complete Sprint 6 First**:
- [x] Slot generation
- [x] Patient management
- [x] Doctor management
- [x] Schedule management

---

## Database Schema

### Appointment Collection

```javascript
{
  _id: ObjectId,
  appointmentNumber: String (unique, required, generated),
  patientId: ObjectId (ref: 'patients', required, index),
  doctorId: ObjectId (ref: 'doctors', required, index),
  departmentId: ObjectId (ref: 'departments', required, index),
  slotId: ObjectId (ref: 'slots', required, unique, index),
  date: Date (required, index),
  startTime: String (required, "HH:mm"),
  endTime: String (required, "HH:mm"),
  purpose: String (required, trim),
  notes: String (trim),
  consultationNotes: String (trim),
  status: String (enum: ['SCHEDULED','ARRIVED','COMPLETED','CANCELLED'], default: 'SCHEDULED', index),
  arrivedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  bookedBy: ObjectId (ref: 'users', required),
  bookedAt: Date (required),
  lastUpdatedBy: ObjectId (ref: 'users'),
  isActive: Boolean (default: true),
  createdAt: Date (immutable),
  updatedAt: Date,
  deletedAt: Date
}
```

---

## Concurrency Strategy

### Double Booking Prevention (CRITICAL)

We use **atomic operations with MongoDB transactions**:

1. **Find and Modify in One Atomic Operation**
2. **Unique Constraint on slotId in Appointments**
3. **Proper Error Handling for Race Conditions**

---

## Tasks

### Task 7.1: Appointment Model
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create Appointment schema
2. Add appointment number generation
3. Add status workflow validation
4. Add indexes

**Subtasks**:
- [ ] Create `models/Appointment.js`
- [ ] Add appointment number generation
- [ ] Add status validation
- [ ] Add indexes

**File: `backend/src/models/Appointment.js`**:
```javascript
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      required: [true, 'Appointment number is required'],
      unique: true,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient is required'],
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
      required: [true, 'Slot is required'],
      unique: true, // CRITICAL: Prevents double booking
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Appointment date is required'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
      maxlength: [500, 'Purpose cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    consultationNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Consultation notes cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'ARRIVED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      required: true,
      index: true,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booked by is required'],
    },
    bookedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Indexes for queries
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: -1 });
appointmentSchema.index({ departmentId: 1, date: -1 });
appointmentSchema.index({ date: -1, status: 1 });
appointmentSchema.index({ status: 1, date: -1 });
appointmentSchema.index({ bookedBy: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });
appointmentSchema.index({ departmentId: 1, date: 1, status: 1 });
appointmentSchema.index({ patientId: 1, status: 1, date: -1 });

// Generate appointment number before saving
appointmentSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Generate appointment number: APP-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // Count appointments today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await this.constructor.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequenceNumber = String(count + 1).padStart(4, '0');
    this.appointmentNumber = `APP-${dateStr}-${sequenceNumber}`;
  }
  next();
});

// Virtual for patient name
appointmentSchema.virtual('patientName').get(function () {
  return this.patientId ? `${this.patientId.firstName} ${this.patientId.lastName}` : 'Unknown';
});

// Virtual for doctor name
appointmentSchema.virtual('doctorName').get(function () {
  return this.doctorId ? `${this.doctorId.userId?.firstName} ${this.doctorId.userId?.lastName}` : 'Unknown';
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
```

---

### Task 7.2: Appointment Booking Service
**Priority**: Critical | **Estimated Time**: 5 hours

**Steps**:
1. Create booking service with atomic operations
2. Implement transaction-based booking
3. Handle race conditions
4. Add proper error handling

**Subtasks**:
- [ ] Create `services/appointmentService.js`
- [ ] Implement createAppointment with atomic operation
- [ ] Implement cancelAppointment
- [ ] Implement updateAppointment
- [ ] Implement status transitions

**File: `backend/src/services/appointmentService.js`**:
```javascript
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Slot = require('../models/Slot');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Create a new appointment with concurrency control
 * CRITICAL: Uses atomic operations to prevent double booking
 */
const createAppointment = async (appointmentData, booker) => {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {
    const {
      patientId,
      doctorId,
      slotId,
      purpose,
      notes,
      createPatient, // For new patient
    } = appointmentData;

    // Step 1: Get and lock the slot atomically
    const slot = await Slot.findOneAndUpdate(
      {
        _id: slotId,
        isAvailable: true,
      },
      {
        isAvailable: false,
      },
      { session, new: false }
    );

    if (!slot) {
      await session.abortTransaction();
      throw new AppError('Slot is not available or already booked', 400);
    }

    // Step 2: Handle patient (existing or new)
    let patient;
    if (createPatient) {
      // Create new patient
      patient = await Patient.create([createPatient], { session });
      patient = patient[0];
    } else {
      // Verify existing patient
      patient = await Patient.findById(patientId).session(session);
      if (!patient) {
        await session.abortTransaction();
        throw new AppError('Patient not found', 404);
      }
    }

    // Step 3: Verify doctor
    const doctor = await Doctor.findById(doctorId).session(session);
    if (!doctor) {
      await session.abortTransaction();
      throw new AppError('Doctor not found', 404);
    }

    // Step 4: Get department from doctor
    const department = await Department.findById(doctor.departmentId).session(session);
    if (!department) {
      await session.abortTransaction();
      throw new AppError('Department not found', 404);
    }

    // Step 5: Create appointment
    const appointment = await Appointment.create(
      [
        {
          patientId: patient._id,
          doctorId: doctor._id,
          departmentId: department._id,
          slotId: slot._id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          purpose,
          notes,
          bookedBy: booker._id,
          bookedAt: new Date(),
        },
      ],
      { session }
    );

    // Step 6: Update slot with appointment reference
    slot.appointmentId = appointment[0]._id;
    await slot.save({ session });

    await session.commitTransaction();

    // Fetch complete appointment with populated fields
    const completeAppointment = await Appointment.findById(appointment[0]._id)
      .populate('patientId')
      .populate('doctorId')
      .populate('departmentId')
      .populate('slotId')
      .populate('bookedBy', 'firstName lastName email')
      .populate('lastUpdatedBy', 'firstName lastName email');

    return completeAppointment;
  } catch (error) {
    await session.abortTransaction();

    // Handle duplicate key error (race condition)
    if (error.code === 11000 && error.keyPattern?.slotId) {
      throw new AppError('This slot has just been booked. Please select another slot.', 409);
    }

    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cancel an appointment
 */
const cancelAppointment = async (appointmentId, reason, canceller) => {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {
    const appointment = await Appointment.findById(appointmentId).session(session);

    if (!appointment) {
      await session.abortTransaction();
      throw new AppError('Appointment not found', 404);
    }

    // Check if can be cancelled
    if (appointment.status === 'COMPLETED') {
      await session.abortTransaction();
      throw new AppError('Cannot cancel a completed appointment', 400);
    }

    if (appointment.status === 'CANCELLED') {
      await session.abortTransaction();
      throw new AppError('Appointment is already cancelled', 400);
    }

    // Update appointment
    appointment.status = 'CANCELLED';
    appointment.cancelledAt = new Date();
    appointment.cancellationReason = reason;
    appointment.lastUpdatedBy = canceller._id;
    await appointment.save({ session });

    // Release the slot
    const slot = await Slot.findById(appointment.slotId).session(session);
    if (slot) {
      slot.isAvailable = true;
      slot.appointmentId = null;
      await slot.save({ session });
    }

    await session.commitTransaction();

    return await Appointment.findById(appointmentId)
      .populate('patientId')
      .populate('doctorId')
      .populate('slotId');
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Update appointment details (not status)
 */
const updateAppointment = async (appointmentId, updateData, updater) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Check if can be updated
  if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
    throw new AppError('Cannot update a completed or cancelled appointment', 400);
  }

  // Update allowed fields
  const allowedUpdates = ['purpose', 'notes'];

  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      appointment[field] = updateData[field];
    }
  });

  appointment.lastUpdatedBy = updater._id;
  await appointment.save();

  return await Appointment.findById(appointmentId)
    .populate('patientId')
    .populate('doctorId')
    .populate('departmentId')
    .populate('slotId');
};

/**
 * Mark appointment as arrived
 */
const markAppointmentAsArrived = async (appointmentId, updater) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.status !== 'SCHEDULED') {
    throw new AppError('Appointment is not in scheduled status', 400);
  }

  appointment.status = 'ARRIVED';
  appointment.arrivedAt = new Date();
  appointment.lastUpdatedBy = updater._id;
  await appointment.save();

  return await Appointment.findById(appointmentId)
    .populate('patientId')
    .populate('doctorId')
    .populate('slotId');
};

/**
 * Mark appointment as completed
 */
const markAppointmentAsCompleted = async (appointmentId, consultationNotes, completer) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.status !== 'ARRIVED') {
    throw new AppError('Patient must be marked as arrived first', 400);
  }

  appointment.status = 'COMPLETED';
  appointment.completedAt = new Date();
  appointment.consultationNotes = consultationNotes;
  appointment.lastUpdatedBy = completer._id;
  await appointment.save();

  return await Appointment.findById(appointmentId)
    .populate('patientId')
    .populate('doctorId')
    .populate('slotId');
};

/**
 * Get appointments with filters
 */
const getAppointments = async (filters = {}) => {
  const {
    patientId,
    doctorId,
    departmentId,
    status,
    date,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
  } = filters;

  const query = { deletedAt: null };

  // Role-based filtering
  if (filters.user && filters.user.role === 'DOCTOR') {
    const doctor = await Doctor.findOne({ userId: filters.user._id });
    if (doctor) {
      query.doctorId = doctor._id;
    }
  }

  if (patientId) query.patientId = patientId;
  if (doctorId) query.doctorId = doctorId;
  if (departmentId) query.departmentId = departmentId;
  if (status) query.status = status;

  // Date filtering
  if (date) {
    const targetDate = new Date(date);
    query.date = {
      $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      $lte: new Date(targetDate.setHours(23, 59, 59, 999)),
    };
  }

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) {
      query.date.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.date.$lte = new Date(dateTo);
    }
  }

  const appointments = await Appointment.find(query)
    .populate('patientId', 'firstName lastName patientId mobileNumber')
    .populate('doctorId')
    .populate('departmentId', 'name')
    .populate('slotId')
    .populate('bookedBy', 'firstName lastName')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ date: -1, startTime: -1 });

  const total = await Appointment.countDocuments(query);

  return {
    appointments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get appointment by ID
 */
const getAppointmentById = async (id) => {
  const appointment = await Appointment.findOne({
    _id: id,
    deletedAt: null,
  })
    .populate('patientId')
    .populate('doctorId')
    .populate('departmentId')
    .populate('slotId')
    .populate('bookedBy', 'firstName lastName email')
    .populate('lastUpdatedBy', 'firstName lastName email');

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  return appointment;
};

module.exports = {
  createAppointment,
  cancelAppointment,
  updateAppointment,
  markAppointmentAsArrived,
  markAppointmentAsCompleted,
  getAppointments,
  getAppointmentById,
};
```

---

### Task 7.3: Appointment Controller
**Priority**: High | **Estimated Time**: 2 hours

**File: `backend/src/controllers/appointmentController.js`**:
```javascript
const appointmentService = require('../services/appointmentService');

const createAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.createAppointment(req.body, req.user);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const result = await appointmentService.getAppointments({
      ...req.query,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: result.appointments,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Appointment retrieved successfully',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.updateAppointment(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const appointment = await appointmentService.cancelAppointment(
      req.params.id,
      reason,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

const markAsArrived = async (req, res, next) => {
  try {
    const appointment = await appointmentService.markAppointmentAsArrived(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Patient marked as arrived',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

const markAsCompleted = async (req, res, next) => {
  try {
    const { consultationNotes } = req.body;
    const appointment = await appointmentService.markAppointmentAsCompleted(
      req.params.id,
      consultationNotes,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Appointment marked as completed',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  markAsArrived,
  markAsCompleted,
};
```

---

### Task 7.4: Appointment Validators
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/validators/appointmentValidators.js`**:
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

const createAppointmentValidation = [
  body('slotId')
    .notEmpty()
    .withMessage('Slot is required')
    .isMongoId()
    .withMessage('Invalid slot ID'),

  body('purpose')
    .notEmpty()
    .withMessage('Purpose is required')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Purpose cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('patientId')
    .if(body('createPatient').not().exists())
    .notEmpty()
    .withMessage('Patient ID is required when not creating new patient')
    .isMongoId()
    .withMessage('Invalid patient ID'),

  body('createPatient')
    .if(body('patientId').not().exists())
    .notEmpty()
    .withMessage('Patient data is required when patient ID is not provided'),

  validate,
];

const updateAppointmentValidation = [
  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Purpose cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  validate,
];

module.exports = {
  createAppointmentValidation,
  updateAppointmentValidation,
};
```

---

### Task 7.5: Appointment Routes
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/routes/appointmentRoutes.js`**:
```javascript
const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { protect, requirePermission } = require('../middlewares/auth');
const { createAppointmentValidation, updateAppointmentValidation } = require('../validators/appointmentValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/appointments
 * @desc    Create a new appointment
 * @access  Private (Receptionist, Doctor, Super Admin)
 */
router.post(
  '/',
  protect,
  requirePermission('appointment.book'),
  createAppointmentValidation,
  appointmentController.createAppointment
);

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments with filters
 * @access  Private
 */
router.get('/', protect, appointmentController.getAppointments);

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
router.get('/:id', protect, appointmentController.getAppointmentById);

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Update appointment details
 * @access  Private (Receptionist, Doctor, Super Admin)
 */
router.put(
  '/:id',
  protect,
  requirePermission('appointment.update'),
  updateAppointmentValidation,
  appointmentController.updateAppointment
);

/**
 * @route   DELETE /api/v1/appointments/:id
 * @desc    Cancel appointment
 * @access  Private (Receptionist, Doctor, Super Admin)
 */
router.delete(
  '/:id',
  protect,
  requirePermission('appointment.cancel'),
  appointmentController.cancelAppointment
);

/**
 * @route   POST /api/v1/appointments/:id/arrive
 * @desc    Mark patient as arrived
 * @access  Private (Receptionist, Super Admin)
 */
router.post(
  '/:id/arrive',
  protect,
  requirePermission('appointment.mark_arrived'),
  appointmentController.markAsArrived
);

/**
 * @route   POST /api/v1/appointments/:id/complete
 * @desc    Mark appointment as completed
 * @access  Private (Doctor, Super Admin)
 */
router.post(
  '/:id/complete',
  protect,
  requirePermission('appointment.mark_completed'),
  appointmentController.markAsCompleted
);

module.exports = router;
```

---

### Task 7.6: Update App.js
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
app.use('/api/v1/appointments', require('./routes/appointmentRoutes'));

// ... 404 and error handlers
```

---

## Acceptance Criteria

### Backend
- [ ] Appointment model with unique slotId
- [ ] Atomic booking operation works
- [ ] Double booking is prevented
- [ ] Race conditions are handled
- [ ] Existing patient selection works
- [ ] New patient auto-creation works
- [ ] Status transitions work correctly
- [ ] Appointment cancellation releases slot
- [ ] Filtered appointments work correctly

### Concurrency
- [ ] Simultaneous booking requests handled
- [ ] Only one succeeds for same slot
- [ ] Proper error messages for conflicts
- [ ] Transaction integrity maintained

---

## Testing Checklist

```bash
# Create Appointment with Existing Patient
curl -X POST http://localhost:5000/api/v1/appointments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "<patient_id>",
    "slotId": "<slot_id>",
    "purpose": "General Checkup"
  }'

# Create Appointment with New Patient
curl -X POST http://localhost:5000/api/v1/appointments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "<slot_id>",
    "purpose": "General Checkup",
    "createPatient": {
      "firstName": "Jane",
      "lastName": "Smith",
      "dateOfBirth": "1990-01-01",
      "gender": "FEMALE",
      "mobileNumber": "+919876543211"
    }
  }'

# Test Concurrency (run simultaneously)
curl -X POST http://localhost:5000/api/v1/appointments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"slotId": "<same_slot_id>", "patientId": "<patient_id>", "purpose": "Test"}'

# Cancel Appointment
curl -X DELETE http://localhost:5000/api/v1/appointments/<appointment_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Patient requested cancellation"}'
```

---

## Deliverables

✅ Appointment model  
✅ Atomic booking service  
✅ Appointment controller  
✅ Appointment validators  
✅ Appointment routes  
✅ Concurrency control  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Booking works without double booking
- [ ] Concurrency is handled correctly
- [ ] Status workflow works
- [ ] Code formatted
- [ ] No ESLint errors
- [ ] Ready for Sprint 8 (Appointment Management)

---

## Next Sprint

After completing Sprint 7, proceed to [Sprint 8: Appointment Management](./08-Sprint-8-Appointment-Management.md) to implement appointment updates and management features.
