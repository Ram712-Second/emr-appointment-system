# Sprint 9: Search, Filtering & Pagination

## Sprint Overview
**Duration**: 2-3 Days | **Focus**: Performance and UX

This sprint implements comprehensive search, filtering, and pagination features for appointments with server-side processing to optimize performance and user experience.

---

## Sprint Goals

✅ Implement multi-criteria patient search  
✅ Implement doctor search with filters  
✅ Implement department filtering  
✅ Implement status filtering  
✅ Implement date range queries  
✅ Add server-side pagination  
✅ Add server-side sorting  
✅ Optimize database queries  
✅ Create search UI  

---

## Prerequisites

**Must Complete Sprint 8 First**:
- [x] Appointment management
- [x] Basic filtering
- [x] Status workflow

---

## Performance Requirements

- Server-side processing (no client-side filtering of large datasets)
- Maximum 100 items per page
- Indexed queries only
- Response time < 500ms for filtered queries
- No N+1 queries

---

## Tasks

### Task 9.1: Appointment Search Service
**Priority**: High | **Estimated Time**: 3 hours

**Steps**:
1. Create comprehensive search function
2. Add multiple filter support
3. Add date range support
4. Optimize with proper indexes

**Subtasks**:
- [ ] Update `services/appointmentService.js`
- [ ] Add advanced search
- [ ] Add filter combination logic
- [ ] Add performance monitoring

**Add to `backend/src/services/appointmentService.js`**:

```javascript
/**
 * Advanced search appointments
 */
const searchAppointments = async (filters = {}) => {
  const {
    // Search criteria
    search,
    patientId,
    doctorId,
    departmentId,
    mobileNumber,
    appointmentNumber,
    
    // Filters
    status,
    date,
    dateFrom,
    dateTo,
    
    // Sorting
    sortBy = 'date',
    sortOrder = 'desc',
    
    // Pagination
    page = 1,
    limit = 20,
  } = filters;

  // Build query
  const query = { deletedAt: null };

  // Search by appointment number (exact match)
  if (appointmentNumber) {
    query.appointmentNumber = appointmentNumber.toUpperCase();
  }

  // Search by mobile number (needs patient lookup)
  if (mobileNumber) {
    const patients = await Patient.find({
      mobileNumber: { $regex: mobileNumber.replace(/\s/g, ''), $options: 'i' },
      isActive: true,
    }).select('_id');

    if (patients.length === 0) {
      return { appointments: [], pagination: { page, limit, total: 0, pages: 0 } };
    }

    query.patientId = { $in: patients.map((p) => p._id) };
  }

  // Direct filters
  if (patientId) query.patientId = patientId;
  if (doctorId) query.doctorId = doctorId;
  if (departmentId) query.departmentId = departmentId;
  if (status) query.status = status;

  // General text search (patient name or doctor name)
  if (search) {
    const searchRegex = new RegExp(search, 'i');

    // Find matching patients
    const matchingPatients = await Patient.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
      ],
      isActive: true,
    }).select('_id');

    // Find matching doctors
    const matchingDoctors = await Doctor.find({
      userId: {
        $in: await User.find({
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
          ],
          isActive: true,
        }).select('_id'),
      },
    }).select('_id');

    query.$or = [];
    
    if (matchingPatients.length > 0) {
      query.$or.push({ patientId: { $in: matchingPatients.map((p) => p._id) } });
    }
    
    if (matchingDoctors.length > 0) {
      query.$or.push({ doctorId: { $in: matchingDoctors.map((d) => d._id) } });
    }
  }

  // Date filtering
  if (date) {
    const targetDate = new Date(date);
    query.date = {
      $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      $lte: new Date(targetDate.setHours(23, 59, 59, 999)),
    };
  }

  if (dateFrom || dateTo) {
    query.date = query.date || {};
    if (dateFrom) {
      query.date.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.date.$lte = new Date(dateTo);
    }
  }

  // Validate and sanitize pagination
  const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const sanitizedPage = Math.max(parseInt(page) || 1, 1);

  // Build sort object
  const validSortFields = ['date', 'createdAt', 'startTime', 'status', 'appointmentNumber'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('patientId', 'firstName lastName patientId mobileNumber')
      .populate('doctorId')
      .populate('departmentId', 'name')
      .populate('slotId')
      .sort({ [sortField]: sortDirection })
      .skip((sanitizedPage - 1) * sanitizedLimit)
      .limit(sanitizedLimit)
      .lean(),
    Appointment.countDocuments(query),
  ]);

  return {
    appointments,
    pagination: {
      page: sanitizedPage,
      limit: sanitizedLimit,
      total,
      pages: Math.ceil(total / sanitizedLimit),
    },
    meta: {
      hasMore: sanitizedPage * sanitizedLimit < total,
      sortBy: sortField,
      sortOrder: sortDirection === 1 ? 'asc' : 'desc',
    },
  };
};
```

---

### Task 9.2: Index Optimization
**Priority**: Critical | **Estimated Time**: 2 hours

**Steps**:
1. Review current indexes
2. Add missing composite indexes
3. Test query performance
4. Document index choices

**File: `backend/src/models/Appointment.js` (Update indexes)**:

```javascript
// Existing indexes...
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: -1 });
appointmentSchema.index({ departmentId: 1, date: -1 });
appointmentSchema.index({ date: -1, status: 1 });
appointmentSchema.index({ status: 1, date: -1 });
appointmentSchema.index({ bookedBy: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });
appointmentSchema.index({ departmentId: 1, date: 1, status: 1 });
appointmentSchema.index({ patientId: 1, status: 1, date: -1 });

// NEW: Composite indexes for common query patterns
appointmentSchema.index({ date: -1, doctorId: 1, status: 1 });
appointmentSchema.index({ date: -1, departmentId: 1, status: 1 });
appointmentSchema.index({ date: -1, patientId: 1, status: 1 });
appointmentSchema.index({ createdAt: -1, status: 1 });
appointmentSchema.index({ appointmentNumber: 1 });
```

**Index Documentation**:

Create `backend/docs/DATABASE_INDEXES.md`:

```markdown
# Database Indexes Documentation

## Appointments Collection

### Primary Indexes
| Index | Use Case | Query Pattern |
|-------|----------|---------------|
| `{ patientId: 1, date: -1 }` | Patient history | Find appointments for patient |
| `{ doctorId: 1, date: -1 }` | Doctor daily view | Find doctor's appointments |
| `{ departmentId: 1, date: -1 }` | Department stats | Filter by department and date |
| `{ date: -1, status: 1 }` | Daily status report | Find appointments by date and status |

### Composite Indexes
| Index | Use Case |
|-------|----------|
| `{ date: -1, doctorId: 1, status: 1 }` | Doctor's scheduled appointments |
| `{ date: -1, departmentId: 1, status: 1 }` | Department appointment count |
| `{ appointmentNumber: 1 }` | Quick appointment lookup |
| `{ slotId: 1 }` | Unique - prevents double booking |

## Query Patterns Covered

1. **Patient History**: `db.appointments.find({ patientId, date: { $gte: ... } })`
   - Uses: `{ patientId: 1, date: -1 }`

2. **Doctor Daily Appointments**: `db.appointments.find({ doctorId, date, status })`
   - Uses: `{ date: -1, doctorId: 1, status: 1 }`

3. **Department Statistics**: `db.appointments.find({ departmentId, date: { $gte, $lte } })`
   - Uses: `{ departmentId: 1, date: -1 }`

4. **Status Report**: `db.appointments.find({ date, status })`
   - Uses: `{ date: -1, status: 1 }`
```

---

### Task 9.3: Search Endpoint
**Priority**: High | **Estimated Time**: 1 hour

**Add to `backend/src/controllers/appointmentController.js`**:

```javascript
const searchAppointments = async (req, res, next) => {
  try {
    const result = await appointmentService.searchAppointments(req.query);

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: result.appointments,
      meta: {
        pagination: result.pagination,
        search: result.meta,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // ... existing
  searchAppointments,
};
```

**Add to `backend/src/routes/appointmentRoutes.js`**:

```javascript
/**
 * @route   GET /api/v1/appointments/search
 * @desc    Search appointments with filters
 * @access  Private
 */
router.get(
  '/search',
  protect,
  appointmentController.searchAppointments
);
```

---

### Task 9.4: Query Performance Monitoring
**Priority**: Medium | **Estimated Time**: 1 hour

**Create `backend/src/utils/queryLogger.js`**:

```javascript
/**
 * Log slow queries for monitoring
 */
const logSlowQuery = (query, time, threshold = 500) => {
  if (time > threshold) {
    console.warn(`[SLOW QUERY] ${time}ms:`, JSON.stringify(query));
  }
};

/**
 * Add query logging to mongoose
 */
const setupQueryLogging = () => {
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', (collectionName, method, query, doc) => {
      console.log(`[DB] ${collectionName}.${method}`, JSON.stringify(query));
    });
  }
};

module.exports = {
  logSlowQuery,
  setupQueryLogging,
};
```

---

## Acceptance Criteria

### Backend
- [ ] Multi-criteria search works
- [ ] All filter combinations work
- [ ] Pagination works correctly
- [ ] Sorting works on all fields
- [ ] Date range queries work
- [ ] Response time < 500ms
- [ ] No N+1 queries
- [ ] Proper indexes used

### Frontend
- [ ] Search UI works
- [ ] Filter UI works
- [ ] Pagination UI works
- [ ] Results update in real-time

---

## Testing Checklist

```bash
# Complex Search
curl -X GET "http://localhost:5000/api/v1/appointments/search?doctorId=<id>&status=SCHEDULED&dateFrom=2024-01-01&dateTo=2024-01-31&page=1&limit=10&sortBy=date&sortOrder=asc"

# Text Search
curl -X GET "http://localhost:5000/api/v1/appointments/search?search=john"

# Mobile Number Search
curl -X GET "http://localhost:5000/api/v1/appointments/search?mobileNumber=9876543210"

# Department Status Filter
curl -X GET "http://localhost:5000/api/v1/appointments/search?departmentId=<id>&status=COMPLETED"
```

---

## Deliverables

✅ Advanced search service  
✅ Optimized indexes  
✅ Query monitoring  
✅ Search endpoint  
✅ Index documentation  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Search performs efficiently
- [ ] All filters work
- [ ] Pagination correct
- [ ] Code formatted
- [ ] Ready for Sprint 10 (Audit Logging)

---

## Next Sprint

After completing Sprint 9, proceed to [Sprint 10: Logging & Audit Trail](./10-Sprint-10-Logging-Audit-Trail.md).
