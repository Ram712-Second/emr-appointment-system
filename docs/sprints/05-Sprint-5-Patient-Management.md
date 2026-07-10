# Sprint 5: Patient Management

## Sprint Overview
**Duration**: 2 Days | **Focus**: Patient data for appointment linkage

This sprint implements patient management including patient creation, search functionality (by ID, mobile, name), and patient data management. This data is essential for appointment booking.

---

## Sprint Goals

✅ Create Patient model with comprehensive fields  
✅ Implement patient CRUD operations  
✅ Implement multi-criteria patient search  
✅ Create patient auto-generation for new patients  
✅ Create patient search UI  
✅ Implement patient creation form  
✅ Add proper validation  

---

## Prerequisites

**Must Complete Sprint 4 First**:
- [x] Schedule management
- [x] Doctor management
- [x] Department management

---

## Database Schema

### Patient Collection

```javascript
{
  _id: ObjectId,
  patientId: String (unique, required, generated),
  firstName: String (required, trim),
  lastName: String (required, trim),
  dateOfBirth: Date (required),
  gender: String (enum: ['MALE','FEMALE','OTHER'], required),
  mobileNumber: String (unique, required, trim),
  email: String (trim, lowercase, optional),
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String (default: 'India')
  },
  emergencyContact: {
    name: String,
    mobileNumber: String,
    relationship: String
  },
  bloodGroup: String (enum: blood types),
  allergies: [String],
  chronicConditions: [String],
  isActive: Boolean (default: true),
  createdAt: Date (immutable),
  updatedAt: Date,
  deletedAt: Date
}
```

---

## Tasks

### Task 5.1: Patient Model
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Create Patient schema
2. Add patient ID generation
3. Add indexes for search
4. Add validation

**Subtasks**:
- [ ] Create `models/Patient.js`
- [ ] Add patient ID generation
- [ ] Add search indexes
- [ ] Add validation methods

**File: `backend/src/models/Patient.js`**:
```javascript
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function (v) {
          // DOB should not be in future
          return v <= new Date();
        },
        message: 'Date of birth cannot be in the future',
      },
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['MALE', 'FEMALE', 'OTHER'],
        message: 'Invalid gender value',
      },
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          // Basic phone validation (10+ digits)
          return /^[+]?[0-9]{10,15}$/.test(v.replace(/\s/g, ''));
        },
        message: 'Invalid mobile number format',
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Email is optional
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: 'Invalid email format',
      },
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      postalCode: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        default: 'India',
        trim: true,
      },
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      mobileNumber: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            if (!v) return true;
            return /^[+]?[0-9]{10,15}$/.test(v.replace(/\s/g, ''));
          },
          message: 'Invalid mobile number format',
        },
      },
      relationship: {
        type: String,
        trim: true,
      },
    },
    bloodGroup: {
      type: String,
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        message: 'Invalid blood group',
      },
    },
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
    chronicConditions: [
      {
        type: String,
        trim: true,
      },
    ],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for search
patientSchema.index({ patientId: 1 });
patientSchema.index({ mobileNumber: 1 });
patientSchema.index({ firstName: 1, lastName: 1 });
patientSchema.index({ isActive: 1 });
patientSchema.index({ mobileNumber: 1, isActive: 1 });
patientSchema.index({ firstName: 1, lastName: 1, isActive: 1 });

// Virtual for full name
patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
patientSchema.virtual('age').get(function () {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Generate patient ID before saving
patientSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Generate patient ID: PAT + 6 digit number
    const count = await this.constructor.countDocuments();
    const sequenceNumber = count + 1;
    this.patientId = `PAT${String(sequenceNumber).padStart(6, '0')}`;
  }
  next();
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
```

---

### Task 5.2: Patient Service
**Priority**: Critical | **Estimated Time**: 3 hours

**Steps**:
1. Create patient service
2. Implement CRUD operations
3. Implement multi-criteria search
4. Add appointment linkage check

**Subtasks**:
- [ ] Create `services/patientService.js`
- [ ] Implement createPatient
- [ ] Implement searchPatients
- [ ] Implement getPatientById
- [ ] Implement updatePatient

**File: `backend/src/services/patientService.js`**:
```javascript
const Patient = require('../models/Patient');
const AppError = require('../utils/AppError');

/**
 * Create a new patient
 */
const createPatient = async (patientData) => {
  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    mobileNumber,
    email,
    address,
    emergencyContact,
    bloodGroup,
    allergies,
    chronicConditions,
  } = patientData;

  // Check if mobile number already exists
  const existingPatient = await Patient.findOne({ mobileNumber });
  if (existingPatient) {
    throw new AppError('Patient with this mobile number already exists', 400);
  }

  // Check if email exists (if provided)
  if (email) {
    const existingEmail = await Patient.findOne({ email });
    if (existingEmail) {
      throw new AppError('Patient with this email already exists', 400);
    }
  }

  const patient = await Patient.create({
    firstName,
    lastName,
    dateOfBirth,
    gender,
    mobileNumber,
    email,
    address,
    emergencyContact,
    bloodGroup,
    allergies: allergies || [],
    chronicConditions: chronicConditions || [],
  });

  return patient;
};

/**
 * Search patients by multiple criteria
 */
const searchPatients = async (searchQuery, filters = {}) => {
  const { limit = 20 } = filters;

  const query = {
    isActive: true,
    deletedAt: null,
  };

  // Search by patient ID (exact match)
  if (searchQuery.match(/^PAT\d{6}$/)) {
    query.patientId = searchQuery;
  }
  // Search by mobile number (partial match)
  else if (/^[0-9+\s]{3,15}$/.test(searchQuery)) {
    query.mobileNumber = { $regex: searchQuery.replace(/\s/g, ''), $options: 'i' };
  }
  // Search by name (first or last)
  else {
    query.$or = [
      { firstName: { $regex: searchQuery, $options: 'i' } },
      { lastName: { $regex: searchQuery, $options: 'i' } },
    ];
  }

  const patients = await Patient.find(query)
    .limit(limit)
    .sort({ firstName: 1, lastName: 1 });

  return patients;
};

/**
 * Get patient by ID
 */
const getPatientById = async (id) => {
  const patient = await Patient.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  return patient;
};

/**
 * Get patient by patient ID
 */
const getPatientByPatientId = async (patientId) => {
  const patient = await Patient.findOne({
    patientId,
    deletedAt: null,
  });

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  return patient;
};

/**
 * Get patient by mobile number
 */
const getPatientByMobileNumber = async (mobileNumber) => {
  const patient = await Patient.findOne({
    mobileNumber,
    isActive: true,
    deletedAt: null,
  });

  return patient; // Returns null if not found
};

/**
 * Get all patients with filters
 */
const getPatients = async (filters = {}) => {
  const {
    search,
    bloodGroup,
    gender,
    isActive,
    page = 1,
    limit = 20,
  } = filters;

  const query = { deletedAt: null };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (bloodGroup) {
    query.bloodGroup = bloodGroup;
  }

  if (gender) {
    query.gender = gender;
  }

  // General search
  if (search) {
    query.$or = [
      { patientId: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { mobileNumber: { $regex: search.replace(/\s/g, ''), $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const patients = await Patient.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Patient.countDocuments(query);

  return {
    patients,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update patient
 */
const updatePatient = async (id, updateData) => {
  const patient = await Patient.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  // Check if mobile number is being changed and if it already exists
  if (updateData.mobileNumber && updateData.mobileNumber !== patient.mobileNumber) {
    const existingPatient = await Patient.findOne({
      mobileNumber: updateData.mobileNumber,
      _id: { $ne: id },
    });

    if (existingPatient) {
      throw new AppError('Patient with this mobile number already exists', 400);
    }
  }

  // Check if email is being changed and if it already exists
  if (updateData.email && updateData.email !== patient.email) {
    const existingPatient = await Patient.findOne({
      email: updateData.email,
      _id: { $ne: id },
    });

    if (existingPatient) {
      throw new AppError('Patient with this email already exists', 400);
    }
  }

  // Update allowed fields
  const allowedUpdates = [
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'mobileNumber',
    'email',
    'address',
    'emergencyContact',
    'bloodGroup',
    'allergies',
    'chronicConditions',
    'isActive',
  ];

  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      patient[field] = updateData[field];
    }
  });

  await patient.save();

  return await getPatientById(id);
};

/**
 * Delete patient (soft delete)
 */
const deletePatient = async (id) => {
  const patient = await Patient.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  // Check if patient has upcoming appointments
  const Appointment = require('../models/Appointment');
  const upcomingAppointments = await Appointment.countDocuments({
    patientId: id,
    date: { $gte: new Date() },
    status: { $in: ['SCHEDULED', 'ARRIVED'] },
  });

  if (upcomingAppointments > 0) {
    throw new AppError(
      `Cannot delete patient with ${upcomingAppointments} upcoming appointment(s)`,
      400
    );
  }

  patient.deletedAt = new Date();
  patient.isActive = false;
  await patient.save();

  return { message: 'Patient deleted successfully' };
};

module.exports = {
  createPatient,
  searchPatients,
  getPatientById,
  getPatientByPatientId,
  getPatientByMobileNumber,
  getPatients,
  updatePatient,
  deletePatient,
};
```

---

### Task 5.3: Patient Controller
**Priority**: High | **Estimated Time**: 2 hours

**File: `backend/src/controllers/patientController.js`**:
```javascript
const patientService = require('../services/patientService');

const createPatient = async (req, res, next) => {
  try {
    const patient = await patientService.createPatient(req.body);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
};

const searchPatients = async (req, res, next) => {
  try {
    const { q } = req.query; // Search query

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        errors: [{ field: 'q', message: 'Search query is required' }],
      });
    }

    const patients = await patientService.searchPatients(q, req.query);

    res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully',
      data: { patients },
    });
  } catch (error) {
    next(error);
  }
};

const getPatients = async (req, res, next) => {
  try {
    const result = await patientService.getPatients(req.query);

    res.status(200).json({
      success: true,
      message: 'Patients retrieved successfully',
      data: result.patients,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Patient retrieved successfully',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const patient = await patientService.updatePatient(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
};

const deletePatient = async (req, res, next) => {
  try {
    const result = await patientService.deletePatient(req.params.id);

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
  createPatient,
  searchPatients,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
};
```

---

### Task 5.4: Patient Validators
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/validators/patientValidators.js`**:
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

const createPatientValidation = [
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),

  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const dob = new Date(value);
      const now = new Date();
      if (dob > now) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),

  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Invalid gender value'),

  body('mobileNumber')
    .notEmpty()
    .withMessage('Mobile number is required')
    .trim()
    .custom((value) => {
      if (!/^[+]?[0-9]{10,15}$/.test(value.replace(/\s/g, ''))) {
        throw new Error('Invalid mobile number format');
      }
      return true;
    }),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format'),

  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),

  validate,
];

const updatePatientValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Invalid gender value'),

  body('mobileNumber')
    .optional()
    .trim()
    .custom((value) => {
      if (!/^[+]?[0-9]{10,15}$/.test(value.replace(/\s/g, ''))) {
        throw new Error('Invalid mobile number format');
      }
      return true;
    }),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format'),

  validate,
];

module.exports = {
  createPatientValidation,
  updatePatientValidation,
};
```

---

### Task 5.5: Patient Routes
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/routes/patientRoutes.js`**:
```javascript
const express = require('express');
const patientController = require('../controllers/patientController');
const { protect, requirePermission } = require('../middlewares/auth');
const {
  createPatientValidation,
  updatePatientValidation,
} = require('../validators/patientValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/patients
 * @desc    Create a new patient
 * @access  Private (Receptionist, Doctor, Super Admin)
 */
router.post(
  '/',
  protect,
  requirePermission('patient.create'),
  createPatientValidation,
  patientController.createPatient
);

/**
 * @route   GET /api/v1/patients/search
 * @desc    Search patients by ID, mobile, or name
 * @access  Private
 */
router.get(
  '/search',
  protect,
  requirePermission('patient.search'),
  patientController.searchPatients
);

/**
 * @route   GET /api/v1/patients
 * @desc    Get all patients with filters
 * @access  Private
 */
router.get(
  '/',
  protect,
  requirePermission('patient.view'),
  patientController.getPatients
);

/**
 * @route   GET /api/v1/patients/:id
 * @desc    Get patient by ID
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  requirePermission('patient.view'),
  patientController.getPatientById
);

/**
 * @route   PUT /api/v1/patients/:id
 * @desc    Update patient
 * @access  Private (Receptionist, Super Admin)
 */
router.put(
  '/:id',
  protect,
  requirePermission('patient.create'),
  updatePatientValidation,
  patientController.updatePatient
);

/**
 * @route   DELETE /api/v1/patients/:id
 * @desc    Delete patient
 * @access  Private (Super Admin only)
 */
router.delete(
  '/:id',
  protect,
  requirePermission('user.create_doctor'),
  patientController.deletePatient
);

module.exports = router;
```

---

### Task 5.6: Update App.js
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

// ... 404 and error handlers
```

---

## Acceptance Criteria

### Backend
- [ ] Patient model with auto-generated ID
- [ ] Patient creation works
- [ ] Patient search by ID works
- [ ] Patient search by mobile works
- [ ] Patient search by name works
- [ ] Patient update works
- [ ] Proper validation on all fields

### Frontend
- [ ] Can search patients
- [ ] Can create new patient
- [ ] Can view patient details
- [ ] Can update patient information

---

## Testing Checklist

```bash
# Create Patient
curl -X POST http://localhost:5000/api/v1/patients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-05-15",
    "gender": "MALE",
    "mobileNumber": "+919876543210",
    "email": "john.doe@example.com"
  }'

# Search Patient by ID
curl -X GET "http://localhost:5000/api/v1/patients/search?q=PAT000001"

# Search Patient by Mobile
curl -X GET "http://localhost:5000/api/v1/patients/search?q=9876543210"

# Search Patient by Name
curl -X GET "http://localhost:5000/api/v1/patients/search?q=John"

# Get Patient by ID
curl -X GET http://localhost:5000/api/v1/patients/<patient_id>
```

---

## Deliverables

✅ Patient model  
✅ Patient service  
✅ Patient controller  
✅ Patient validators  
✅ Patient routes  
✅ Search functionality  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Patient CRUD works
- [ ] Search works by all criteria
- [ ] Auto-generated patient IDs work
- [ ] Code formatted
- [ ] No ESLint errors
- [ ] Ready for Sprint 6 (Dynamic Slot Generation)

---

## Next Sprint

After completing Sprint 5, proceed to [Sprint 6: Dynamic Slot Generation](./06-Sprint-6-Dynamic-Slot-Generation.md) to implement the core slot generation algorithm.
