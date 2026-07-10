# API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication

All endpoints except `/auth/*` require authentication via JWT bearer token:

```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /auth/login

Login user and receive tokens.

**Request Body**:
```json
{
  "email": "user@hospital.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "email": "user@hospital.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "DOCTOR"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "15m"
    }
  }
}
```

### POST /auth/logout

Logout user and invalidate refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

### GET /auth/me

Get current authenticated user.

**Response** (200):
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "_id": "...",
      "email": "user@hospital.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "DOCTOR"
    }
  }
}
```

---

## User Management Endpoints

### POST /users/doctors

Create a new doctor (Super Admin only).

**Request Body**:
```json
{
  "email": "doctor@hospital.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1234567890",
  "departmentId": "...",
  "specialization": "Cardiology",
  "qualification": "MBBS, MD",
  "experience": 15,
  "consultationFee": 500,
  "consultationDuration": 15
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Doctor created successfully",
  "data": {
    "user": {...},
    "doctor": {...}
  }
}
```

### GET /users

Get all users with pagination (Super Admin only).

**Query Parameters**:
- `role` (optional): Filter by role
- `isActive` (optional): Filter by active status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response** (200):
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

## Department Endpoints

### GET /departments

Get all departments.

**Response** (200):
```json
{
  "success": true,
  "message": "Departments retrieved successfully",
  "data": [
    {
      "_id": "...",
      "name": "Cardiology",
      "description": "Heart care",
      "isActive": true
    }
  ]
}
```

---

## Doctor Endpoints

### GET /doctors

Get all doctors with filters.

**Query Parameters**:
- `departmentId` (optional): Filter by department
- `specialization` (optional): Filter by specialization
- `isActive` (optional): Filter by active status
- `search` (optional): Search by name or email
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response** (200):
```json
{
  "success": true,
  "message": "Doctors retrieved successfully",
  "data": [...],
  "meta": {
    "pagination": {...}
  }
}
```

### GET /doctors/:id

Get doctor by ID.

**Response** (200):
```json
{
  "success": true,
  "message": "Doctor retrieved successfully",
  "data": {
    "doctor": {
      "_id": "...",
      "specialization": "Cardiology",
      "qualification": "MBBS, MD",
      "consultationFee": 500,
      ...
    }
  }
}
```

---

## Schedule Endpoints

### POST /schedules

Create a new schedule (Super Admin only).

**Request Body**:
```json
{
  "doctorId": "...",
  "workingDays": ["MONDAY", "TUESDAY", "WEDNESDAY"],
  "sessions": [
    {
      "name": "Morning",
      "startTime": "09:00",
      "endTime": "13:00"
    },
    {
      "name": "Evening",
      "startTime": "14:00",
      "endTime": "17:00"
    }
  ],
  "breaks": [
    {
      "name": "Lunch",
      "startTime": "13:00",
      "endTime": "14:00"
    }
  ],
  "slotDuration": 15,
  "effectiveFrom": "2024-01-15T00:00:00.000Z"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Schedule created successfully",
  "data": {
    "schedule": {...}
  }
}
```

### GET /schedules/doctor/:doctorId

Get active schedule for a doctor.

**Query Parameters**:
- `date` (optional): Date to check schedule for (default: today)

**Response** (200):
```json
{
  "success": true,
  "message": "Schedule retrieved successfully",
  "data": {
    "schedule": {...}
  }
}
```

---

## Patient Endpoints

### POST /patients

Create a new patient.

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1985-05-15",
  "gender": "MALE",
  "mobileNumber": "+1234567890",
  "email": "john.doe@example.com",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001"
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Patient created successfully",
  "data": {
    "patient": {
      "_id": "...",
      "patientId": "PAT000001",
      ...
    }
  }
}
```

### GET /patients/search

Search patients by ID, mobile, or name.

**Query Parameters**:
- `q` (required): Search query

**Response** (200):
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": {
    "patients": [...]
  }
}
```

---

## Slot Endpoints

### POST /slots/generate

Generate slots for a specific day (Super Admin only).

**Request Body**:
```json
{
  "doctorId": "...",
  "date": "2024-01-15"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "15 slots generated successfully",
  "data": {
    "slots": [...],
    "count": 15
  }
}
```

### GET /slots/available

Get available slots for a doctor on a specific date.

**Query Parameters**:
- `doctorId` (required): Doctor ID
- `date` (required): Date to check

**Response** (200):
```json
{
  "success": true,
  "message": "Slots retrieved successfully",
  "data": {
    "slots": [
      {
        "_id": "...",
        "startTime": "09:00",
        "endTime": "09:15",
        "isAvailable": true,
        "sessionName": "Morning"
      }
    ],
    "count": 15
  }
}
```

---

## Appointment Endpoints

### POST /appointments

Book a new appointment.

**Request Body** (Existing Patient):
```json
{
  "patientId": "...",
  "slotId": "...",
  "purpose": "General Checkup",
  "notes": "Patient has chest pain"
}
```

**Request Body** (New Patient):
```json
{
  "slotId": "...",
  "purpose": "General Checkup",
  "createPatient": {
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "gender": "FEMALE",
    "mobileNumber": "+1234567890"
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "appointment": {
      "_id": "...",
      "appointmentNumber": "APP-20240115-0001",
      "date": "2024-01-15T00:00:00.000Z",
      "startTime": "09:00",
      "status": "SCHEDULED",
      "patient": {...},
      "doctor": {...}
    }
  }
}
```

**Error Responses**:

409 Conflict (Slot just booked):
```json
{
  "success": false,
  "message": "This slot has just been booked. Please select another slot.",
  "errors": null
}
```

### GET /appointments

Get appointments with filters.

**Query Parameters**:
- `patientId` (optional): Filter by patient
- `doctorId` (optional): Filter by doctor
- `departmentId` (optional): Filter by department
- `status` (optional): Filter by status (SCHEDULED, ARRIVED, COMPLETED, CANCELLED)
- `date` (optional): Specific date
- `dateFrom` (optional): Date range start
- `dateTo` (optional): Date range end
- `search` (optional): General search
- `sortBy` (optional): Sort field (default: date)
- `sortOrder` (optional): asc or desc (default: desc)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response** (200):
```json
{
  "success": true,
  "message": "Appointments retrieved successfully",
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    },
    "search": {
      "hasMore": true,
      "sortBy": "date",
      "sortOrder": "desc"
    }
  }
}
```

### GET /appointments/:id

Get appointment by ID.

**Response** (200):
```json
{
  "success": true,
  "message": "Appointment retrieved successfully",
  "data": {
    "appointment": {...}
  }
}
```

### PUT /appointments/:id

Update appointment details.

**Request Body**:
```json
{
  "purpose": "Updated purpose",
  "notes": "Updated notes"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Appointment updated successfully",
  "data": {
    "appointment": {...}
  }
}
```

### DELETE /appointments/:id

Cancel an appointment.

**Request Body**:
```json
{
  "reason": "Patient requested cancellation"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "data": {
    "appointment": {...}
  }
}
```

### POST /appointments/:id/arrive

Mark patient as arrived.

**Response** (200):
```json
{
  "success": true,
  "message": "Patient marked as arrived",
  "data": {
    "appointment": {...}
  }
}
```

### POST /appointments/:id/complete

Mark appointment as completed.

**Request Body**:
```json
{
  "consultationNotes": "Patient prescribed medication for hypertension"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Appointment marked as completed",
  "data": {
    "appointment": {...}
  }
}
```

---

## Audit Endpoints

### GET /audit/logs

Get audit logs (Super Admin only).

**Query Parameters**:
- `userId` (optional): Filter by user
- `action` (optional): Filter by action
- `entityType` (optional): Filter by entity type
- `dateFrom` (optional): Date range start
- `dateTo` (optional): Date range end
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response** (200):
```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": [
    {
      "_id": "...",
      "action": "APPOINTMENT_CREATED",
      "userId": "...",
      "userRole": "RECEPTIONIST",
      "userName": "John Doe",
      "entityType": "Appointment",
      "entityId": "...",
      "entityDescription": "Appointment APP-20240115-0001 created",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized / Invalid Token |
| 403 | Forbidden / Insufficient Permissions |
| 404 | Not Found |
| 409 | Conflict / Duplicate Resource |
| 500 | Internal Server Error |

---

## Rate Limiting

All API endpoints are rate-limited:
- 100 requests per 15 minutes per IP
- Responses include rate limit headers

---

## WebSocket Events

### Connection

```javascript
const socket = io('http://localhost:5000');

// Authenticate
socket.emit('authenticate', accessToken);
```

### Subscribe to Updates

```javascript
// Subscribe to doctor updates
socket.emit('subscribe:doctor', doctorId);

// Subscribe to department updates
socket.emit('subscribe:department', departmentId);

// Subscribe to scheduler updates
socket.emit('subscribe:scheduler', { doctorId, date });
```

### Events Received

**appointment:created**
```javascript
{
  appointment: {
    id: "...",
    appointmentNumber: "APP-20240115-0001",
    patientName: "John Doe",
    doctorId: "...",
    date: "2024-01-15T00:00:00.000Z",
    startTime: "09:00",
    status: "SCHEDULED"
  }
}
```

**appointment:updated**
```javascript
{
  appointment: {
    id: "...",
    status: "ARRIVED",
    notes: "Updated notes"
  }
}
```

**appointment:cancelled**
```javascript
{
  appointment: {
    id: "...",
    status: "CANCELLED",
    cancellationReason: "Patient requested"
  }
}
```

**slot:availability_changed**
```javascript
{
  slot: {
    id: "...",
    doctorId: "...",
    date: "2024-01-15T00:00:00.000Z",
    startTime: "09:00",
    isAvailable: false
  }
}
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"admin123"}'
```

### Get Available Slots
```bash
curl -X GET "http://localhost:5000/api/v1/slots/available?doctorId=<doctor_id>&date=2024-01-15" \
  -H "Authorization: Bearer <access_token>"
```

### Book Appointment
```bash
curl -X POST http://localhost:5000/api/v1/appointments \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "<slot_id>",
    "purpose": "General Checkup"
  }'
```

---

## Postman Collection

A Postman collection is available at:
[Postman Collection Link](./postman/EMR-Appointment-System.postman_collection.json)

---

**Last Updated**: 2024-01-15
