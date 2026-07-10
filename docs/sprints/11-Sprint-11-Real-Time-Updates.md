# Sprint 11: Real-Time Appointment Updates (Engineering Challenge)

## Sprint Overview
**Duration**: 3 Days | **Focus**: Live updates using WebSockets

This sprint implements real-time appointment updates using Socket.IO so that when appointments are created, updated, or cancelled, all connected users viewing the scheduler receive live updates without refreshing the page.

---

## Sprint Goals

✅ Set up Socket.IO server  
✅ Implement appointment event broadcasting  
✅ Handle client connections  
✅ Implement room-based subscriptions  
✅ Add connection management  
✅ Create client-side Socket.IO integration  
✅ Add live scheduler UI updates  
✅ Handle disconnections gracefully  

---

## Prerequisites

**Must Complete Sprint 10 First**:
- [x] Audit logging
- [x] All core features
- [x] Appointment management

---

## Architecture

### Server-Side
- Socket.IO server integration
- Event broadcasting for appointment actions
- Room-based subscriptions (per doctor/department)

### Client-Side
- Socket.IO client integration
- Event listeners for updates
- UI updates without page refresh
- Automatic reconnection

---

## Tasks

### Task 11.1: Install Socket.IO
**Priority**: Critical | **Estimated Time**: 30 minutes

**Commands**:
```bash
# Backend
cd backend
npm install socket.io

# Frontend
cd frontend
npm install socket.io-client
```

---

### Task 11.2: Socket.IO Server Setup
**Priority**: Critical | **Estimated Time**: 2 hours

**File: `backend/src/config/socket.js`**:

```javascript
const { Server } = require('socket.io');

let io;

/**
 * Initialize Socket.IO server
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Authenticate socket connection
    socket.on('authenticate', (token) => {
      try {
        const { verifyAccessToken } = require('../services/jwtService');
        const decoded = verifyAccessToken(token);
        socket.userId = decoded.userId;
        socket.role = decoded.role;
        socket.join(`user:${decoded.userId}`);
        socket.emit('authenticated', { success: true, userId: decoded.userId });
      } catch (error) {
        socket.emit('authenticated', { success: false, error: error.message });
        socket.disconnect();
      }
    });

    // Subscribe to doctor updates
    socket.on('subscribe:doctor', (doctorId) => {
      if (socket.userId) {
        socket.join(`doctor:${doctorId}`);
        console.log(`Socket ${socket.id} subscribed to doctor ${doctorId}`);
      }
    });

    // Subscribe to department updates
    socket.on('subscribe:department', (departmentId) => {
      if (socket.userId) {
        socket.join(`department:${departmentId}`);
        console.log(`Socket ${socket.id} subscribed to department ${departmentId}`);
      }
    });

    // Subscribe to scheduler updates
    socket.on('subscribe:scheduler', (data) => {
      if (socket.userId) {
        const { doctorId, date } = data;
        socket.join(`scheduler:${doctorId}:${date}`);
        console.log(`Socket ${socket.id} subscribed to scheduler ${doctorId}:${date}`);
      }
    });

    // Unsubscribe from doctor
    socket.on('unsubscribe:doctor', (doctorId) => {
      socket.leave(`doctor:${doctorId}`);
      console.log(`Socket ${socket.id} unsubscribed from doctor ${doctorId}`);
    });

    // Unsubscribe from department
    socket.on('unsubscribe:department', (departmentId) => {
      socket.leave(`department:${departmentId}`);
      console.log(`Socket ${socket.id} unsubscribed from department ${departmentId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Broadcast appointment created event
 */
const broadcastAppointmentCreated = (appointment) => {
  const io = getIO();

  const eventData = {
    appointment: {
      id: appointment._id,
      appointmentNumber: appointment.appointmentNumber,
      patientId: appointment.patientId._id,
      patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
      doctorId: appointment.doctorId._id,
      departmentId: appointment.departmentId._id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
    },
  };

  // Broadcast to doctor subscribers
  io.to(`doctor:${appointment.doctorId._id}`).emit('appointment:created', eventData);

  // Broadcast to department subscribers
  io.to(`department:${appointment.departmentId._id}`).emit('appointment:created', eventData);

  // Broadcast to scheduler subscribers
  const dateKey = new Date(appointment.date).toISOString().split('T')[0];
  io.to(`scheduler:${appointment.doctorId._id}:${dateKey}`).emit('appointment:created', eventData);
};

/**
 * Broadcast appointment updated event
 */
const broadcastAppointmentUpdated = (appointment) => {
  const io = getIO();

  const eventData = {
    appointment: {
      id: appointment._id,
      appointmentNumber: appointment.appointmentNumber,
      status: appointment.status,
      notes: appointment.notes,
    },
  };

  io.to(`doctor:${appointment.doctorId._id}`).emit('appointment:updated', eventData);
  io.to(`department:${appointment.departmentId._id}`).emit('appointment:updated', eventData);
};

/**
 * Broadcast appointment cancelled event
 */
const broadcastAppointmentCancelled = (appointment) => {
  const io = getIO();

  const eventData = {
    appointment: {
      id: appointment._id,
      appointmentNumber: appointment.appointmentNumber,
      status: appointment.status,
      cancellationReason: appointment.cancellationReason,
    },
  };

  io.to(`doctor:${appointment.doctorId._id}`).emit('appointment:cancelled', eventData);
  io.to(`department:${appointment.departmentId._id}`).emit('appointment:cancelled', eventData);

  // Also update scheduler
  const dateKey = new Date(appointment.date).toISOString().split('T')[0];
  io.to(`scheduler:${appointment.doctorId._id}:${dateKey}`).emit('appointment:cancelled', eventData);
};

/**
 * Broadcast slot availability changed
 */
const broadcastSlotAvailabilityChanged = (slot) => {
  const io = getIO();

  const eventData = {
    slot: {
      id: slot._id,
      doctorId: slot.doctorId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
    },
  };

  const dateKey = new Date(slot.date).toISOString().split('T')[0];
  io.to(`scheduler:${slot.doctorId}:${dateKey}`).emit('slot:availability_changed', eventData);
};

module.exports = {
  initSocket,
  getIO,
  broadcastAppointmentCreated,
  broadcastAppointmentUpdated,
  broadcastAppointmentCancelled,
  broadcastSlotAvailabilityChanged,
};
```

---

### Task 11.3: Integrate Socket.IO with Server
**Priority**: Critical | **Estimated Time**: 1 hour

**Update `backend/src/server.js`**:

```javascript
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   EMR Appointment Management System                  ║
║                                                       ║
║   Server running on port ${PORT}                       ║
║   Environment: ${process.env.NODE_ENV}                    ║
║   Time: ${new Date().toLocaleString()}                  ║
║   WebSocket: Enabled                                   ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // Initialize Socket.IO
    initSocket(server);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        await require('./config/database').disconnectDB();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

---

### Task 11.4: Integrate Broadcasting in Appointment Service
**Priority**: High | **Estimated Time**: 1 hour

**Update `backend/src/services/appointmentService.js`**:

```javascript
const socket = require('../config/socket');

// In createAppointment:
const createAppointment = async (appointmentData, booker, req) => {
  // ... existing code ...

  await session.commitTransaction();

  // Broadcast to connected clients
  socket.broadcastAppointmentCreated(completeAppointment);

  return completeAppointment;
};

// In cancelAppointment:
const cancelAppointment = async (appointmentId, reason, canceller, req) => {
  // ... existing code ...

  await session.commitTransaction();

  // Broadcast to connected clients
  socket.broadcastAppointmentCancelled(appointment);

  return appointment;
};

// In updateAppointment:
const updateAppointment = async (appointmentId, updateData, updater, req) => {
  // ... existing code ...

  // Broadcast to connected clients
  socket.broadcastAppointmentUpdated(appointment);

  return appointment;
};
```

---

### Task 11.5: Client-Side Socket Service
**Priority**: High | **Estimated Time**: 2 hours

**File: `frontend/src/services/socket.js`**:

```javascript
import { io } from 'socket.io-client';
import { getAuthToken } from './auth';

let socket = null;
let isConnected = false;
let currentSubscriptions = new Set();

/**
 * Initialize socket connection
 */
const initSocket = () => {
  if (socket) {
    return socket;
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  socket = io(API_BASE_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    isConnected = true;

    // Authenticate
    const token = getAuthToken();
    if (token) {
      socket.emit('authenticate', token);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    isConnected = false;
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
    isConnected = true;

    // Re-authenticate and resubscribe
    const token = getAuthToken();
    if (token) {
      socket.emit('authenticate', token);
      resubscribeAll();
    }
  });

  socket.on('authenticated', (response) => {
    if (response.success) {
      console.log('Socket authenticated for user:', response.userId);
    } else {
      console.error('Socket authentication failed:', response.error);
    }
  });

  // Appointment events
  socket.on('appointment:created', (data) => {
    console.log('Appointment created:', data);
    window.dispatchEvent(new CustomEvent('appointment:created', { detail: data }));
  });

  socket.on('appointment:updated', (data) => {
    console.log('Appointment updated:', data);
    window.dispatchEvent(new CustomEvent('appointment:updated', { detail: data }));
  });

  socket.on('appointment:cancelled', (data) => {
    console.log('Appointment cancelled:', data);
    window.dispatchEvent(new CustomEvent('appointment:cancelled', { detail: data }));
  });

  // Slot events
  socket.on('slot:availability_changed', (data) => {
    console.log('Slot availability changed:', data);
    window.dispatchEvent(new CustomEvent('slot:availability_changed', { detail: data }));
  });

  return socket;
};

/**
 * Subscribe to doctor updates
 */
const subscribeToDoctor = (doctorId) => {
  if (!socket) initSocket();

  const key = `doctor:${doctorId}`;
  if (!currentSubscriptions.has(key)) {
    socket.emit('subscribe:doctor', doctorId);
    currentSubscriptions.add(key);
    console.log('Subscribed to doctor:', doctorId);
  }
};

/**
 * Unsubscribe from doctor updates
 */
const unsubscribeFromDoctor = (doctorId) => {
  if (!socket) return;

  const key = `doctor:${doctorId}`;
  socket.emit('unsubscribe:doctor', doctorId);
  currentSubscriptions.delete(key);
  console.log('Unsubscribed from doctor:', doctorId);
};

/**
 * Subscribe to department updates
 */
const subscribeToDepartment = (departmentId) => {
  if (!socket) initSocket();

  const key = `department:${departmentId}`;
  if (!currentSubscriptions.has(key)) {
    socket.emit('subscribe:department', departmentId);
    currentSubscriptions.add(key);
    console.log('Subscribed to department:', departmentId);
  }
};

/**
 * Unsubscribe from department updates
 */
const unsubscribeFromDepartment = (departmentId) => {
  if (!socket) return;

  const key = `department:${departmentId}`;
  socket.emit('unsubscribe:department', departmentId);
  currentSubscriptions.delete(key);
  console.log('Unsubscribed from department:', departmentId);
};

/**
 * Subscribe to scheduler updates
 */
const subscribeToScheduler = (doctorId, date) => {
  if (!socket) initSocket();

  const dateKey = new Date(date).toISOString().split('T')[0];
  const key = `scheduler:${doctorId}:${dateKey}`;
  if (!currentSubscriptions.has(key)) {
    socket.emit('subscribe:scheduler', { doctorId, date: dateKey });
    currentSubscriptions.add(key);
    console.log('Subscribed to scheduler:', doctorId, dateKey);
  }
};

/**
 * Unsubscribe from scheduler updates
 */
const unsubscribeFromScheduler = (doctorId, date) => {
  if (!socket) return;

  const dateKey = new Date(date).toISOString().split('T')[0];
  const key = `scheduler:${doctorId}:${dateKey}`;
  socket.emit('unsubscribe:scheduler', { doctorId, date: dateKey });
  currentSubscriptions.delete(key);
  console.log('Unsubscribed from scheduler:', doctorId, dateKey);
};

/**
 * Resubscribe to all current subscriptions
 */
const resubscribeAll = () => {
  currentSubscriptions.forEach((key) => {
    if (key.startsWith('doctor:')) {
      const doctorId = key.split(':')[1];
      socket.emit('subscribe:doctor', doctorId);
    } else if (key.startsWith('department:')) {
      const departmentId = key.split(':')[1];
      socket.emit('subscribe:department', departmentId);
    } else if (key.startsWith('scheduler:')) {
      const [, doctorId, date] = key.split(':');
      socket.emit('subscribe:scheduler', { doctorId, date });
    }
  });
};

/**
 * Clear all subscriptions
 */
const clearAllSubscriptions = () => {
  currentSubscriptions.forEach((key) => {
    if (key.startsWith('doctor:')) {
      const doctorId = key.split(':')[1];
      socket.emit('unsubscribe:doctor', doctorId);
    } else if (key.startsWith('department:')) {
      const departmentId = key.split(':')[1];
      socket.emit('unsubscribe:department', departmentId);
    }
  });
  currentSubscriptions.clear();
};

/**
 * Disconnect socket
 */
const disconnect = () => {
  if (socket) {
    clearAllSubscriptions();
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
};

/**
 * Check if socket is connected
 */
const isSocketConnected = () => isConnected;

module.exports = {
  initSocket,
  subscribeToDoctor,
  unsubscribeFromDoctor,
  subscribeToDepartment,
  unsubscribeFromDepartment,
  subscribeToScheduler,
  unsubscribeFromScheduler,
  clearAllSubscriptions,
  disconnect,
  isSocketConnected,
};
```

---

### Task 11.6: React Hook for Socket Events
**Priority**: Medium | **Estimated Time**: 1 hour

**File: `frontend/src/hooks/useSocketEvents.js`**:

```javascript
import { useEffect } from 'react';
import socket from '../services/socket';

/**
 * Custom hook to listen to socket events
 */
const useSocketEvents = (eventHandlers = {}) => {
  useEffect(() => {
    // Initialize socket
    socket.initSocket();

    // Set up event listeners
    const handlers = {
      'appointment:created': eventHandlers.onAppointmentCreated,
      'appointment:updated': eventHandlers.onAppointmentUpdated,
      'appointment:cancelled': eventHandlers.onAppointmentCancelled,
      'slot:availability_changed': eventHandlers.onSlotAvailabilityChanged,
    };

    // Add listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      if (handler) {
        window.addEventListener(event, handler);
      }
    });

    // Cleanup
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        if (handler) {
          window.removeEventListener(event, handler);
        }
      });
    };
  }, [eventHandlers]);

  return socket;
};

export default useSocketEvents;
```

---

### Task 11.7: Update Scheduler Component
**Priority**: Medium | **Estimated Time**: 1 hour

**Example usage in `frontend/src/pages/AppointmentSchedulerPage.jsx`**:

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useSocketEvents from '../hooks/useSocketEvents';
import socket from '../services/socket';

const AppointmentSchedulerPage = () => {
  const { doctorId } = useParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    // Subscribe to scheduler updates
    const dateKey = new Date(selectedDate).toISOString().split('T')[0];
    socket.subscribeToScheduler(doctorId, dateKey);

    return () => {
      socket.unsubscribeFromScheduler(doctorId, dateKey);
    };
  }, [doctorId, selectedDate]);

  // Handle real-time updates
  useSocketEvents({
    onAppointmentCreated: (event) => {
      setAppointments((prev) => [...prev, event.detail.appointment]);
    },
    onAppointmentUpdated: (event) => {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === event.detail.appointment.id
            ? { ...apt, ...event.detail.appointment }
            : apt
        )
      );
    },
    onAppointmentCancelled: (event) => {
      setAppointments((prev) =>
        prev.filter((apt) => apt.id !== event.detail.appointment.id)
      );
      // Release the slot
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === event.detail.appointment.slotId
            ? { ...slot, isAvailable: true }
            : slot
        )
      );
    },
    onSlotAvailabilityChanged: (event) => {
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === event.detail.slot.id
            ? { ...slot, ...event.detail.slot }
            : slot
        )
      );
    },
  });

  return (
    <div className="scheduler-page">
      {/* Your scheduler UI */}
    </div>
  );
};

export default AppointmentSchedulerPage;
```

---

## Acceptance Criteria

### Backend
- [ ] Socket.IO server initialized
- [ ] Connection management works
- [ ] Authentication for sockets works
- [ ] Room subscriptions work
- [ ] Event broadcasting works
- [ ] Disconnection handled gracefully

### Frontend
- [ ] Socket connection established
- [ ] Subscriptions work
- [ ] Real-time updates received
- [ ] UI updates without refresh
- [ ] Reconnection works automatically

---

## Testing Checklist

1. Open two browser tabs
2. Navigate to scheduler in both
3. Book appointment in one tab
4. Verify other tab updates immediately
5. Test with cancellation
6. Test reconnection on page reload

---

## Deliverables

✅ Socket.IO server setup  
✅ Event broadcasting  
✅ Client socket service  
✅ React hook for events  
✅ Integration with scheduler  

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Real-time updates work
- [ ] No page refresh needed
- [ ] Reconnection works
- [ ] Code formatted
- [ ] Ready for Sprint 12 (Error Handling)

---

## Next Sprint

After completing Sprint 11, proceed to [Sprint 12: Error Handling & Edge Cases](./12-Sprint-12-Error-Handling.md).
