# Sprint 3: Doctor & Department Management

## Sprint Overview
**Duration**: 2 Days | **Focus**: Core master data for appointments

This sprint implements the department and doctor management functionality, including CRUD operations and search capabilities. This data forms the foundation for appointment booking.

---

## Sprint Goals

✅ Create Department model and CRUD  
✅ Create Doctor model and CRUD  
✅ Implement doctor search functionality  
✅ Create department listing  
✅ Implement doctor filtering by department  
✅ Create admin UI for department management  
✅ Create admin UI for doctor management  
✅ Add proper validation  

---

## Prerequisites

**Must Complete Sprint 2 First**:
- [x] Authentication system
- [x] RBAC implementation
- [x] User creation permissions

---

## Database Schema

### Department Collection

```javascript
{
  _id: ObjectId,
  name: String (unique, required, trim),
  description: String (trim),
  isActive: Boolean (default: true),
  createdAt: Date (immutable),
  updatedAt: Date,
  deletedAt: Date
}
```

### Doctor Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', unique, required),
  departmentId: ObjectId (ref: 'departments', required),
  specialization: String (required, trim),
  qualification: String (required, trim),
  experience: Number (min: 0),
  consultationFee: Number (required, min: 0),
  consultationDuration: Number (default: 15, min: 5, max: 60),
  isActive: Boolean (default: true),
  createdAt: Date (immutable),
  updatedAt: Date,
  createdBy: ObjectId (ref: 'users'),
  deletedAt: Date
}
```

---

## Tasks

### Task 3.1: Department Model
**Priority**: Critical | **Estimated Time**: 1 hour

**Steps**:
1. Create Department schema
2. Add indexes
3. Add methods

**Subtasks**:
- [ ] Create `models/Department.js`
- [ ] Add indexes
- [ ] Add validation

**File: `backend/src/models/Department.js`**:
```javascript
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ name: 1, isActive: 1 });

// Virtual for doctors count
departmentSchema.virtual('doctorsCount', {
  ref: 'Doctor',
  localField: '_id',
  foreignField: 'departmentId',
  count: true,
});

// Instance method to get active doctors
departmentSchema.methods.getActiveDoctors = async function () {
  const Doctor = mongoose.model('Doctor');
  return await Doctor.find({
    departmentId: this._id,
    isActive: true,
  }).populate('userId', 'firstName lastName email');
};

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
```

---

### Task 3.2: Doctor Model
**Priority**: Critical | **Estimated Time**: 1 hour

**Steps**:
1. Create Doctor schema
2. Add indexes
3. Add relationships

**Subtasks**:
- [ ] Create `models/Doctor.js`
- [ ] Add indexes
- [ ] Add virtual fields

**File: `backend/src/models/Doctor.js`**:
```javascript
const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      maxlength: [100, 'Specialization cannot exceed 100 characters'],
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required'],
      trim: true,
    },
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
      max: [50, 'Experience cannot exceed 50 years'],
    },
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Consultation fee cannot be negative'],
    },
    consultationDuration: {
      type: Number,
      default: 15,
      min: [5, 'Consultation duration must be at least 5 minutes'],
      max: [60, 'Consultation duration cannot exceed 60 minutes'],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
doctorSchema.index({ userId: 1 });
doctorSchema.index({ departmentId: 1, isActive: 1 });
doctorSchema.index({ isActive: 1 });
doctorSchema.index({ specialization: 1 });

// Virtual for full name
doctorSchema.virtual('fullName').get(function () {
  return this.userId?.firstName && this.userId?.lastName
    ? `${this.userId.firstName} ${this.userId.lastName}`
    : 'Unknown';
});

// Virtual for appointments count
doctorSchema.virtual('appointmentsCount', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'doctorId',
  count: true,
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
```

---

### Task 3.3: Department Service
**Priority**: High | **Estimated Time**: 2 hours

**Steps**:
1. Create department service
2. Implement CRUD operations
3. Add search functionality

**Subtasks**:
- [ ] Create `services/departmentService.js`
- [ ] Implement createDepartment
- [ ] Implement getDepartments
- [ ] Implement updateDepartment
- [ ] Implement deleteDepartment

**File: `backend/src/services/departmentService.js`**:
```javascript
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const AppError = require('../utils/AppError');

/**
 * Create a new department
 */
const createDepartment = async (departmentData) => {
  const { name, description } = departmentData;

  // Check if department already exists
  const existingDepartment = await Department.findOne({ name });
  if (existingDepartment) {
    throw new AppError('Department with this name already exists', 400);
  }

  const department = await Department.create({
    name,
    description,
  });

  return department;
};

/**
 * Get all departments with filters
 */
const getDepartments = async (filters = {}) => {
  const { isActive, search, page = 1, limit = 20, includeDoctorCount } = filters;

  const query = { deletedAt: null };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const departments = await Department.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ name: 1 });

  const total = await Department.countDocuments(query);

  let result = {
    departments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };

  // Add doctor count if requested
  if (includeDoctorCount) {
    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const doctorCount = await Doctor.countDocuments({
          departmentId: dept._id,
          isActive: true,
          deletedAt: null,
        });
        return {
          ...dept.toObject(),
          doctorsCount: doctorCount,
        };
      })
    );
    result.departments = departmentsWithCount;
  }

  return result;
};

/**
 * Get department by ID
 */
const getDepartmentById = async (id) => {
  const department = await Department.findById(id);

  if (!department || department.deletedAt) {
    throw new AppError('Department not found', 404);
  }

  return department;
};

/**
 * Update department
 */
const updateDepartment = async (id, updateData) => {
  const department = await Department.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Check if name is being changed and if it already exists
  if (updateData.name && updateData.name !== department.name) {
    const existingDepartment = await Department.findOne({
      name: updateData.name,
      _id: { $ne: id },
    });

    if (existingDepartment) {
      throw new AppError('Department with this name already exists', 400);
    }
  }

  Object.assign(department, updateData);
  await department.save();

  return department;
};

/**
 * Delete department (soft delete)
 */
const deleteDepartment = async (id) => {
  const department = await Department.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  // Check if department has active doctors
  const activeDoctorsCount = await Doctor.countDocuments({
    departmentId: id,
    isActive: true,
    deletedAt: null,
  });

  if (activeDoctorsCount > 0) {
    throw new AppError(
      `Cannot delete department with ${activeDoctorsCount} active doctor(s). Please deactivate doctors first.`,
      400
    );
  }

  department.deletedAt = new Date();
  department.isActive = false;
  await department.save();

  return { message: 'Department deleted successfully' };
};

/**
 * Activate/deactivate department
 */
const toggleDepartmentStatus = async (id, isActive) => {
  const department = await Department.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  department.isActive = isActive;
  await department.save();

  return {
    message: isActive
      ? 'Department activated successfully'
      : 'Department deactivated successfully',
    department,
  };
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
};
```

---

### Task 3.4: Doctor Service
**Priority**: High | **Estimated Time**: 3 hours

**Steps**:
1. Create doctor service
2. Implement CRUD operations
3. Add search and filter
4. Add department filtering

**Subtasks**:
- [ ] Create `services/doctorService.js`
- [ ] Implement getDoctors
- [ ] Implement getDoctorById
- [ ] Implement updateDoctor
- [ ] Implement deleteDoctor

**File: `backend/src/services/doctorService.js`**:
```javascript
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Department = require('../models/Department');
const AppError = require('../utils/AppError');

/**
 * Get all doctors with filters
 */
const getDoctors = async (filters = {}) => {
  const {
    departmentId,
    specialization,
    isActive,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const query = { deletedAt: null };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (departmentId) {
    query.departmentId = departmentId;
  }

  if (specialization) {
    query.specialization = { $regex: specialization, $options: 'i' };
  }

  // Search by name or email
  if (search) {
    const users = await User.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
      isActive: true,
    }).select('_id');

    query.userId = { $in: users.map((u) => u._id) };
  }

  const doctors = await Doctor.find(query)
    .populate('userId', 'firstName lastName email phoneNumber isActive')
    .populate('departmentId', 'name description')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Doctor.countDocuments(query);

  return {
    doctors,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get doctor by ID
 */
const getDoctorById = async (id) => {
  const doctor = await Doctor.findOne({
    _id: id,
    deletedAt: null,
  })
    .populate('userId', 'firstName lastName email phoneNumber isActive')
    .populate('departmentId', 'name description');

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  return doctor;
};

/**
 * Get doctor by user ID
 */
const getDoctorByUserId = async (userId) => {
  const doctor = await Doctor.findOne({
    userId,
    deletedAt: null,
  })
    .populate('userId', 'firstName lastName email phoneNumber')
    .populated('departmentId', 'name');

  if (!doctor) {
    throw new AppError('Doctor profile not found', 404);
  }

  return doctor;
};

/**
 * Update doctor
 */
const updateDoctor = async (id, updateData, updater) => {
  const doctor = await Doctor.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // If department is being updated, verify it exists
  if (updateData.departmentId) {
    const department = await Department.findById(updateData.departmentId);
    if (!department) {
      throw new AppError('Department not found', 404);
    }
  }

  // Update allowed fields only
  const allowedUpdates = [
    'departmentId',
    'specialization',
    'qualification',
    'experience',
    'consultationFee',
    'consultationDuration',
  ];

  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      doctor[field] = updateData[field];
    }
  });

  doctor.updatedBy = updater?._id;
  await doctor.save();

  return await getDoctorById(id);
};

/**
 * Delete doctor (soft delete)
 */
const deleteDoctor = async (id) => {
  const doctor = await Doctor.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  // Check if doctor has upcoming appointments
  const Appointment = require('../models/Appointment');
  const upcomingAppointments = await Appointment.countDocuments({
    doctorId: id,
    date: { $gte: new Date() },
    status: { $in: ['SCHEDULED', 'ARRIVED'] },
  });

  if (upcomingAppointments > 0) {
    throw new AppError(
      `Cannot delete doctor with ${upcomingAppointments} upcoming appointment(s)`,
      400
    );
  }

  doctor.deletedAt = new Date();
  doctor.isActive = false;
  await doctor.save();

  // Also deactivate the user
  await User.findByIdAndUpdate(doctor.userId, { isActive: false });

  return { message: 'Doctor deleted successfully' };
};

/**
 * Activate/deactivate doctor
 */
const toggleDoctorStatus = async (id, isActive) => {
  const doctor = await Doctor.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }

  doctor.isActive = isActive;
  await doctor.save();

  // Also update user status
  await User.findByIdAndUpdate(doctor.userId, { isActive });

  return {
    message: isActive
      ? 'Doctor activated successfully'
      : 'Doctor deactivated successfully',
    doctor,
  };
};

/**
 * Get doctors by department
 */
const getDoctorsByDepartment = async (departmentId) => {
  const doctors = await Doctor.find({
    departmentId,
    isActive: true,
    deletedAt: null,
  })
    .populate('userId', 'firstName lastName email')
    .populate('departmentId', 'name')
    .sort({ 'userId.firstName': 1 });

  return doctors;
};

module.exports = {
  getDoctors,
  getDoctorById,
  getDoctorByUserId,
  updateDoctor,
  deleteDoctor,
  toggleDoctorStatus,
  getDoctorsByDepartment,
};
```

---

### Task 3.5: Department Controller
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/controllers/departmentController.js`**:
```javascript
const departmentService = require('../services/departmentService');

const createDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment(req.body);

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

const getDepartments = async (req, res, next) => {
  try {
    const result = await departmentService.getDepartments(req.query);

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: result.departments,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const result = await departmentService.deleteDepartment(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const toggleDepartmentStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const result = await departmentService.toggleDepartmentStatus(
      req.params.id,
      isActive
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: { department: result.department },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
};
```

---

### Task 3.6: Doctor Controller
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/controllers/doctorController.js`**:
```javascript
const doctorService = require('../services/doctorService');

const getDoctors = async (req, res, next) => {
  try {
    const result = await doctorService.getDoctors(req.query);

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully',
      data: result.doctors,
      meta: {
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Doctor retrieved successfully',
      data: { doctor },
    });
  } catch (error) {
    next(error);
  }
};

const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.updateDoctor(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Doctor updated successfully',
      data: { doctor },
    });
  } catch (error) {
    next(error);
  }
};

const deleteDoctor = async (req, res, next) => {
  try {
    const result = await doctorService.deleteDoctor(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const toggleDoctorStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const result = await doctorService.toggleDoctorStatus(
      req.params.id,
      isActive
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: { doctor: result.doctor },
    });
  } catch (error) {
    next(error);
  }
};

const getDoctorsByDepartment = async (req, res, next) => {
  try {
    const doctors = await doctorService.getDoctorsByDepartment(
      req.params.departmentId
    );

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully',
      data: { doctors },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  toggleDoctorStatus,
  getDoctorsByDepartment,
};
```

---

### Task 3.7: Validators
**Priority**: Medium | **Estimated Time**: 1 hour

**File: `backend/src/validators/departmentValidators.js`**:
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

const createDepartmentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Department name is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  validate,
];

const updateDepartmentValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  validate,
];

module.exports = {
  createDepartmentValidation,
  updateDepartmentValidation,
};
```

**File: `backend/src/validators/doctorValidators.js`**:
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

const updateDoctorValidation = [
  body('departmentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('specialization')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Specialization cannot exceed 100 characters'),
  body('qualification')
    .optional()
    .trim(),
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  body('consultationFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),
  body('consultationDuration')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('Consultation duration must be between 5 and 60 minutes'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  validate,
};

module.exports = {
  updateDoctorValidation,
};
```

---

### Task 3.8: Routes
**Priority**: High | **Estimated Time**: 1 hour

**File: `backend/src/routes/departmentRoutes.js`**:
```javascript
const express = require('express');
const departmentController = require('../controllers/departmentController');
const { protect, requirePermission } = require('../middlewares/auth');
const {
  createDepartmentValidation,
  updateDepartmentValidation,
} = require('../validators/departmentValidators');

const router = express.Router();

router.post(
  '/',
  protect,
  requirePermission('department.manage'),
  createDepartmentValidation,
  departmentController.createDepartment
);

router.get('/', departmentController.getDepartments);

router.get('/:id', departmentController.getDepartmentById);

router.put(
  '/:id',
  protect,
  requirePermission('department.manage'),
  updateDepartmentValidation,
  departmentController.updateDepartment
);

router.delete(
  '/:id',
  protect,
  requirePermission('department.manage'),
  departmentController.deleteDepartment
);

router.patch(
  '/:id/status',
  protect,
  requirePermission('department.manage'),
  departmentController.toggleDepartmentStatus
);

module.exports = router;
```

**File: `backend/src/routes/doctorRoutes.js`**:
```javascript
const express = require('express');
const doctorController = require('../controllers/doctorController');
const { protect } = require('../middlewares/auth');
const { updateDoctorValidation } = require('../validators/doctorValidators');

const router = express.Router();

router.get('/', doctorController.getDoctors);

router.get('/:id', doctorController.getDoctorById);

router.get(
  '/department/:departmentId',
  doctorController.getDoctorsByDepartment
);

router.put(
  '/:id',
  protect,
  requirePermission('user.create_doctor'),
  updateDoctorValidation,
  doctorController.updateDoctor
);

router.delete(
  '/:id',
  protect,
  requirePermission('user.create_doctor'),
  doctorController.deleteDoctor
);

router.patch(
  '/:id/status',
  protect,
  requirePermission('user.create_doctor'),
  doctorController.toggleDoctorStatus
);

module.exports = router;
```

---

### Task 3.9: Update App.js
**Priority**: Critical | **Estimated Time**: 30 minutes

**File: `backend/src/app.js`** (Add routes):
```javascript
// ... existing imports and middleware

// API Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/departments', require('./routes/departmentRoutes'));
app.use('/api/v1/doctors', require('./routes/doctorRoutes'));

// ... 404 and error handlers
```

---

## Acceptance Criteria

### Backend
- [ ] Department model created
- [ ] Doctor model created
- [ ] Department CRUD works
- [ ] Doctor listing works
- [ ] Doctor filtering by department works
- [ ] Search functionality works
- [ ] Proper validation on all endpoints

### Frontend
- [ ] Can list all departments
- [ ] Can list all doctors
- [ ] Can filter doctors by department
- [ ] Can search doctors
- [ ] UI shows proper data

---

## Testing Checklist

```bash
# Create Department
curl -X POST http://localhost:5000/api/v1/departments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cardiology","description":"Heart care"}'

# Get Departments
curl -X GET http://localhost:5000/api/v1/departments

# Get Doctors
curl -X GET http://localhost:5000/api/v1/doctors

# Get Doctors by Department
curl -X GET http://localhost:5000/api/v1/doctors/department/<department_id>

# Search Doctors
curl -X GET "http://localhost:5000/api/v1/doctors?search=smith"
```

---

## Deliverables

✅ Department model  
✅ Doctor model  
✅ Department service  
✅ Doctor service  
✅ Department controller  
✅ Doctor controller  
✅ Validators  
✅ Routes  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Department CRUD works
- [ ] Doctor listing and filtering works
- [ ] Proper validation
- [ ] Code formatted
- [ ] No ESLint errors
- [ ] Ready for Sprint 4 (Schedule Management)

---

## Next Sprint

After completing Sprint 3, proceed to [Sprint 4: Schedule Management](./04-Sprint-4-Schedule-Management.md) to implement doctor schedule configuration.
