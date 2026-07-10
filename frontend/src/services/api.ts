import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

/**
 * Axios Instance Configuration
 * Creates a pre-configured axios instance with base URL and timeout
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request Interceptor
 * Adds authentication token to requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor
 * Handles errors and token refresh logic
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        const { accessToken } = response.data.data
        localStorage.setItem('accessToken', accessToken)

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed - logout
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * API Service
 * Contains all API calls for the application
 */
export const apiService = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  // Doctors
  getDoctors: (params?: Record<string, unknown>) =>
    api.get('/doctors', { params }),

  // Appointments
  getAppointments: (params?: Record<string, unknown>) =>
    api.get('/appointments', { params }),
  createAppointment: (data: unknown) =>
    api.post('/appointments', data),
  updateAppointment: (id: string, data: unknown) =>
    api.put(`/appointments/${id}`, data),
  cancelAppointment: (id: string) =>
    api.delete(`/appointments/${id}`),
  markArrived: (id: string) =>
    api.post(`/appointments/${id}/arrive`),

  // Slots
  getSlots: (params?: Record<string, unknown>) =>
    api.get('/slots', { params }),

  // Patients
  searchPatients: (query: string) =>
    api.get('/patients/search', { params: { query } }),
  createPatient: (data: unknown) =>
    api.post('/patients', data),
}

export default api
