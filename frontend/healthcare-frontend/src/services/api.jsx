import axios from 'axios';
const API_URL = 'http://localhost:8000/api/';
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Token management
const getAuthToken = () => localStorage.getItem('auth_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');
const setAuthTokens = (authToken, refreshToken) => {
  localStorage.setItem('auth_token', authToken);
  localStorage.setItem('refresh_token', refreshToken);
};
const removeAuthTokens = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
};
// Helper function to handle paginated responses
const getPaginatedData = async (endpoint, params = {}) => {
  const response = await apiClient.get(endpoint, { params });
  return {
    data: response.data.results || response.data,
    count: response.data.count || response.data.length,
    next: response.data.next,
    previous: response.data.previous,
  };
};
// Authentication service
export const authService = {
  login: async (email, password) => {
    try {
      const response = await apiClient.post('auth/login/', { email, password });
      const { access, refresh, ...userData } = response.data;
      // Store tokens
      setAuthTokens(access, refresh);
      // Set auth header for future requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return { 
        success: true, 
        user: userData 
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  },
  refreshToken: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      const response = await apiClient.post('auth/refresh/', { 
        refresh: refreshToken 
      });
      const { access } = response.data;
      // Update access token only
      localStorage.setItem('auth_token', access);
      // Update auth header
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return true;
    } catch (error) {
      // If refresh fails, log the user out
      removeAuthTokens();
      return false;
    }
  },
  register: async (userData) => {
    try {
      const response = await apiClient.post('auth/register/', userData);
      return { 
        success: true, 
        user: response.data 
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || 'Registration failed',
      };
    }
  },
  logout: () => {
    removeAuthTokens();
    delete apiClient.defaults.headers.common['Authorization'];
  },
  getProfile: () => apiClient.get('auth/profile/'),
  updateProfile: (data) => apiClient.patch('auth/profile/', data),
  changePassword: (currentPassword, newPassword) => apiClient.post('auth/change-password/', {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_new_password: newPassword,
  }),
  isAuthenticated: () => !!getAuthToken(),
};
// Initialize auth header from storage
const authToken = getAuthToken();
if (authToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
}
export const patientService = {
  getAll: (params = {}) => getPaginatedData('patients/', params),
  get: id => apiClient.get(`patients/${id}/`),
  create: data => apiClient.post('patients/', data),
  update: (id, data) => apiClient.put(`patients/${id}/`, data),
  delete: id => apiClient.delete(`patients/${id}/`),
  getRecent: () => apiClient.get('patients/recent/'),
};
export const doctorService = {
  getAll: (params = {}) => getPaginatedData('doctors/', params),
  get: id => apiClient.get(`doctors/${id}/`),
  create: data => apiClient.post('doctors/', data),
  update: (id, data) => apiClient.put(`doctors/${id}/`, data),
  delete: id => apiClient.delete(`doctors/${id}/`),
  getBySpecialization: (specialization) => apiClient.get(`doctors/by_specialization/?specialization=${specialization}`),
};
export const appointmentService = {
  getAll: (params = {}) => getPaginatedData('appointments/', params),
  get: id => apiClient.get(`appointments/${id}/`),
  create: data => apiClient.post('appointments/', data),
  update: (id, data) => apiClient.put(`appointments/${id}/`, data),
  delete: id => apiClient.delete(`appointments/${id}/`),
  getUpcoming: (params = {}) => getPaginatedData('appointments/upcoming/', params),
};
// Analytics service
export const analyticsService = {
  getDashboard: () => apiClient.get('analytics/dashboard/'),
  getAppointmentAnalytics: (params = {}) => apiClient.get('analytics/appointments/', { params }),
  getDoctorAnalytics: (doctorId = null) => {
    const params = doctorId ? { doctor_id: doctorId } : {};
    return apiClient.get('analytics/doctors/', { params });
  },
  getPatientAnalytics: (patientId = null) => {
    const params = patientId ? { patient_id: patientId } : {};
    return apiClient.get('analytics/patients/', { params });
  },
  getRevenueAnalytics: (params = {}) => apiClient.get('analytics/revenue/', { params }),
};
// Interceptor for handling errors
apiClient.interceptors.response.use(
  response => response,
  async error => {
    // Handle 401 Unauthorized errors by attempting to refresh the token
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config;
      // Avoid infinite retry loops
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        // Try to refresh the token
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          // If successful, retry the original request
          return apiClient(originalRequest);
        }
      }
    }
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);
export default apiClient;
