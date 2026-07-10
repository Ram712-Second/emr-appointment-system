# Sprint 8: Appointment Management

## Sprint Overview
**Duration**: 2-3 Days | **Focus**: Post-booking operations

This sprint implements appointment management features including viewing, updating, cancelling, and status workflow management. All role-based access rules are enforced.

---

## Sprint Goals

✅ Implement appointment listing with filters  
✅ Implement appointment update (purpose/notes)  
✅ Implement appointment cancellation  
✅ Implement "Mark as Arrived" functionality  
✅ Implement "Mark as Completed" functionality  
✅ Enforce status workflow rules  
✅ Create appointment management UI  
✅ Add role-based visibility  

---

## Prerequisites

**Must Complete Sprint 7 First**:
- [x] Appointment booking
- [x] Concurrency control
- [x] Status workflow

---

## Status Workflow

```
     SCHEDULED
         │
         ├─────────► CANCELLED
         │
         ▼
      ARRIVED
         │
         ▼
     COMPLETED
```

### Rules:
- **SCHEDULED → ARRIVED**: Any receptionist or admin
- **SCHEDULED → CANCELLED**: Patient, receptionist, doctor, or admin
- **ARRIVED → COMPLETED**: Doctor or admin only
- **COMPLETED/CANCELLED**: Final state, no transitions allowed

---

## Tasks

### Task 8.1: Enhanced Appointment Query Service
**Priority**: High | **Estimated Time**: 2 hours

**Steps**:
1. Add advanced filtering
2. Add search functionality
3. Add date range queries
4. Add role-based filtering

**Subtasks**:
- [ ] Update `services/appointmentService.js`
- [ ] Add search by appointment number
- [ ] Add advanced filters
- [ ] Optimize queries

**Add to `backend/src/services/appointmentService.js`**:

```javascript
/**
 * Search appointments by appointment number
 */
const searchByAppointmentNumber = async (appointmentNumber) => {
  const appointment = await Appointment.findOne({
    appointmentNumber: appointmentNumber.toUpperCase(),
    deletedAt: null,
  })
    .populate('patientId')
    .populate('doctorId')
    .populate('departmentId')
    .populate('slotId')
    .populate('bookedBy', 'firstName lastName');

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  return appointment;
};

/**
 * Get appointments by patient
 */
const getAppointmentsByPatient = async (patientId, filters = {}) => {
  const { status, dateFrom, dateTo, limit = 20 } = filters;

  const query = {
    patientId,
    deletedAt: null,
  };

  if (status) query.status = status;

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = new Date(dateFrom);
    if (dateTo) query.date.$lte = new Date(dateTo);
  }

  const appointments = await Appointment.find(query)
    .populate('doctorId')
    .populate('departmentId', 'name')
    .populate('slotId')
    .sort({ date: -1, startTime: -1 })
    .limit(parseInt(limit));

  return appointments;
};

/**
 * Get today's appointments for a doctor
 */
const getTodayAppointmentsForDoctor = async (doctorId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const appointments = await Appointment.find({
    doctorId,
    date: { $gte: today, $lt: tomorrow },
    deletedAt: null,
  })
    .populate('patientId', 'firstName lastName patientId mobileNumber')
    .populate('slotId')
    .sort({ startTime: 1 });

  return appointments;
};

/**
 * Get upcoming appointments for a patient
 */
const getUpcomingAppointmentsForPatient = async (patientId) => {
  const now = new Date();

  const appointments = await Appointment.find({
    patientId,
    date: { $gte: now },
    status: { $in: ['SCHEDULED', 'ARRIVED'] },
    deletedAt: null,
  })
    .populate('doctorId')
    .populate('departmentId', 'name')
    .populate('slotId')
    .sort({ date: 1, startTime: 1 });

  return appointments;
};

/**
 * Get appointment statistics
 */
const getAppointmentStats = async (filters = {}) => {
  const { doctorId, departmentId, dateFrom, dateTo } = filters;

  const matchQuery = { deletedAt: null };

  if (doctorId) matchQuery.doctorId = doctorId;
  if (departmentId) matchQuery.departmentId = departmentId;

  if (dateFrom || dateTo) {
    matchQuery.date = {};
    if (dateFrom) matchQuery.date.$gte = new Date(dateFrom);
    if (dateTo) matchQuery.date.$lte = new Date(dateTo);
  }

  const stats = await Appointment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    SCHEDULED: 0,
    ARRIVED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    total: 0,
  };

  stats.forEach((stat) => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Add to module exports
module.exports = {
  // ... existing exports
  searchByAppointmentNumber,
  getAppointmentsByPatient,
  getTodayAppointmentsForDoctor,
  getUpcomingAppointmentsForPatient,
  getAppointmentStats,
};
```

---

### Task 8.2: Enhanced Appointment Controller
**Priority**: High | **Estimated Time**: 2 hours

**Add to `backend/src/controllers/appointmentController.js`**:

```javascript
const searchByNumber = async (req, res, next) => {
  try {
    const { appointmentNumber } = req.params;

    const appointment = await appointmentService.searchByAppointmentNumber(
      appointmentNumber
    );

    res.status(200).json({
      success: true,
      message: 'Appointment retrieved successfully',
      data: { appointment },
    });
  } catch (error) {
    next(error);
  }
};

const getPatientAppointments = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const appointments = await appointmentService.getAppointmentsByPatient(
      patientId,
      req.query
    );

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: { appointments, count: appointments.length },
    });
  } catch (error) {
    next(error);
  }
};

const getTodayDoctorAppointments = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const appointments = await appointmentService.getTodayAppointmentsForDoctor(
      doctorId
    );

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: { appointments, count: appointments.length },
    });
  } catch (error) {
    next(error);
  }
};

const getPatientUpcoming = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const appointments = await appointmentService.getUpcomingAppointmentsForPatient(
      patientId
    );

    res.status(200).json({
      success: true,
      message: 'Upcoming appointments retrieved successfully',
      data: { appointments, count: appointments.length },
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await appointmentService.getAppointmentStats(req.query);

    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

// Add to module exports
module.exports = {
  // ... existing exports
  searchByNumber,
  getPatientAppointments,
  getTodayDoctorAppointments,
  getPatientUpcoming,
  getStats,
};
```

---

### Task 8.3: Update Appointment Routes
**Priority**: High | **Estimated Time**: 1 hour

**Add to `backend/src/routes/appointmentRoutes.js`**:

```javascript
/**
 * @route   GET /api/v1/appointments/search/:appointmentNumber
 * @desc    Search appointment by number
 * @access  Private
 */
router.get(
  '/search/:appointmentNumber',
  protect,
  appointmentController.searchByNumber
);

/**
 * @route   GET /api/v1/appointments/patient/:patientId
 * @desc    Get appointments for a patient
 * @access  Private
 */
router.get(
  '/patient/:patientId',
  protect,
  requirePermission('patient.view'),
  appointmentController.getPatientAppointments
);

/**
 * @route   GET /api/v1/appointments/patient/:patientId/upcoming
 * @desc    Get upcoming appointments for a patient
 * @access  Private
 */
router.get(
  '/patient/:patientId/upcoming',
  protect,
  appointmentController.getPatientUpcoming
);

/**
 * @route   GET /api/v1/appointments/doctor/:doctorId/today
 * @desc    Get today's appointments for a doctor
 * @access  Private
 */
router.get(
  '/doctor/:doctorId/today',
  protect,
  appointmentController.getTodayDoctorAppointments
);

/**
 * @route   GET /api/v1/appointments/stats
 * @desc    Get appointment statistics
 * @access  Private
 */
router.get(
  '/stats',
  protect,
  requirePermission('appointment.view_all'),
  appointmentController.getStats
);
```

---

## Acceptance Criteria

### Backend
- [ ] Can search appointments by number
- [ ] Can filter appointments by multiple criteria
- [ ] Can get patient appointment history
- [ ] Can get doctor's daily appointments
- [ ] Can get upcoming appointments for patient
- [ ] Can get appointment statistics
- [ ] Role-based filtering works correctly

### Status Workflow
- [ ] SCHEDULED → ARRIVED works
- [ ] SCHEDULED → CANCELLED works
- [ ] ARRIVED → COMPLETED works
- [ ] COMPLETED/CANCELLED are final
- [ ] Invalid transitions are rejected

---

## Testing Checklist

```bash
# Search by Appointment Number
curl -X GET http://localhost:5000/api/v1/appointments/search/APP-20240115-0001

# Get Patient Appointments
curl -X GET "http://localhost:5000/api/v1/appointments/patient/<patient_id>"

# Get Doctor's Today Appointments
curl -X GET "http://localhost:5000/api/v1/appointments/doctor/<doctor_id>/today"

# Get Appointment Statistics
curl -X GET "http://localhost:5000/api/v1/appointments/stats?doctorId=<doctor_id>&dateFrom=2024-01-01&dateTo=2024-01-31"
```

---

## Deliverables

✅ Enhanced appointment queries  
✅ Search functionality  
✅ Statistics endpoint  
✅ Role-based filtering  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Appointment management works
- [ ] Status workflow enforced
- [ ] Role-based access enforced
- [ ] Code formatted
- [ ] Ready for Sprint 9 (Search & Pagination)

---

## Next Sprint

After completing Sprint 8, proceed to [Sprint 9: Search, Filtering & Pagination](./09-Sprint-9-Search-Filtering-Pagination.md).
