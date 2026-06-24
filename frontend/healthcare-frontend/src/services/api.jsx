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
  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('auth/forgot-password/', { email });
      return { success: true, message: response.data.detail };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.email?.[0] || error.response?.data?.detail || 'Request failed',
      };
    }
  },
  resetPassword: async (uid, token, newPassword, confirmNewPassword) => {
    try {
      const response = await apiClient.post('auth/reset-password/', {
        uid,
        token,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      return { success: true, message: response.data.detail };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.confirm_new_password?.[0] || 'Reset failed',
      };
    }
  },
  googleLogin: async (credential) => {
    try {
      const response = await apiClient.post('auth/google/', { credential });
      const { access, refresh, ...userData } = response.data;
      setAuthTokens(access, refresh);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Google login failed',
      };
    }
  },
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
  checkIn: (id) => apiClient.post(`appointments/${id}/check_in/`),
  checkOut: (id) => apiClient.post(`appointments/${id}/check_out/`),
  getAvailableSlots: (doctorId, date) => apiClient.get(`appointments/available_slots/?doctor_id=${doctorId}&date=${date}`),
  getToday: (params = {}) => getPaginatedData('appointments/today/', params),
  walkIn: (data) => apiClient.post('appointments/walk_in/', data),
  suggestDoctors: (symptoms) => apiClient.post('appointments/suggest_doctors/', { symptoms }),
  recordVitals: (id, data) => apiClient.post(`appointments/${id}/record_vitals/`, data),
  recordPayment: (id, data) => apiClient.post(`appointments/${id}/record_payment/`, data),
  startConsultation: (id) => apiClient.post(`appointments/${id}/start_consultation/`),
  completeConsultation: (id) => apiClient.post(`appointments/${id}/complete_consultation/`),
  getWorkflowStatus: (id) => apiClient.get(`appointments/${id}/workflow_status/`),
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
  getHospitalOverview: () => apiClient.get('analytics/hospital-overview/'),
};
// Prescription service
export const prescriptionService = {
  getAll: (params = {}) => getPaginatedData('prescriptions/', params),
  get: id => apiClient.get(`prescriptions/${id}/`),
  create: data => apiClient.post('prescriptions/', data),
  update: (id, data) => apiClient.put(`prescriptions/${id}/`, data),
  delete: id => apiClient.delete(`prescriptions/${id}/`),
  getByPatient: (patientId) => apiClient.get(`prescriptions/by_patient/?patient_id=${patientId}`),
  getByDoctor: (doctorId) => apiClient.get(`prescriptions/by_doctor/?doctor_id=${doctorId}`),
  downloadPdf: (id) => apiClient.get(`prescriptions/${id}/download-pdf/`, { responseType: 'blob' }),
};

export const medicalRecordService = {
  getAll: (params = {}) => getPaginatedData('medical-records/', params),
  get: id => apiClient.get(`medical-records/${id}/`),
  create: data => apiClient.post('medical-records/', data),
  update: (id, data) => apiClient.put(`medical-records/${id}/`, data),
  delete: id => apiClient.delete(`medical-records/${id}/`),
  getByPatient: (patientId) => apiClient.get(`medical-records/by_patient/?patient_id=${patientId}`),
};

export const billingService = {
  getAll: (params = {}) => getPaginatedData('invoices/', params),
  get: id => apiClient.get(`invoices/${id}/`),
  create: data => apiClient.post('invoices/', data),
  update: (id, data) => apiClient.put(`invoices/${id}/`, data),
  delete: id => apiClient.delete(`invoices/${id}/`),
  getByPatient: (patientId) => apiClient.get(`invoices/by-patient/?patient_id=${patientId}`),
  markPaid: (id) => apiClient.post(`invoices/${id}/mark-paid/`),
  generateForAppointment: (data) => apiClient.post('invoices/generate-for-appointment/', data),
  downloadPdf: (id) => apiClient.get(`invoices/${id}/download-pdf/`, { responseType: 'blob' }),
};

export const paymentService = {
  getAll: (params = {}) => getPaginatedData('payments/', params),
  create: data => apiClient.post('payments/', data),
};

export const departmentService = {
  getAll: (params = {}) => getPaginatedData('departments/', params),
  get: id => apiClient.get(`departments/${id}/`),
  create: data => apiClient.post('departments/', data),
  update: (id, data) => apiClient.put(`departments/${id}/`, data),
  delete: id => apiClient.delete(`departments/${id}/`),
  getWithStats: () => apiClient.get('departments/with_stats/'),
};

export const wardService = {
  getAll: (params = {}) => getPaginatedData('wards/', params),
  get: id => apiClient.get(`wards/${id}/`),
  create: data => apiClient.post('wards/', data),
  update: (id, data) => apiClient.put(`wards/${id}/`, data),
  delete: id => apiClient.delete(`wards/${id}/`),
  getBedAvailability: (id) => apiClient.get(`wards/${id}/bed_availability/`),
};

export const bedService = {
  getAll: (params = {}) => getPaginatedData('beds/', params),
  get: id => apiClient.get(`beds/${id}/`),
  admitPatient: (id, data) => apiClient.post(`beds/${id}/admit_patient/`, data),
  dischargePatient: (id) => apiClient.post(`beds/${id}/discharge_patient/`),
};

export const pharmacyService = {
  getCategories: (params = {}) => getPaginatedData('pharmacy/categories/', params),
  getAll: (params = {}) => getPaginatedData('pharmacy/medicines/', params),
  get: id => apiClient.get(`pharmacy/medicines/${id}/`),
  create: data => apiClient.post('pharmacy/medicines/', data),
  update: (id, data) => apiClient.put(`pharmacy/medicines/${id}/`, data),
  delete: id => apiClient.delete(`pharmacy/medicines/${id}/`),
  getLowStock: () => apiClient.get('pharmacy/medicines/low_stock/'),
  getExpired: () => apiClient.get('pharmacy/medicines/expired/'),
  createOrder: data => apiClient.post('pharmacy/orders/', data),
  getOrders: (params = {}) => getPaginatedData('pharmacy/orders/', params),
  dispenseOrder: (id) => apiClient.post(`pharmacy/orders/${id}/dispense/`),
};

export const labService = {
  getCategories: (params = {}) => getPaginatedData('lab/categories/', params),
  getTests: (params = {}) => getPaginatedData('lab/tests/', params),
  getTest: id => apiClient.get(`lab/tests/${id}/`),
  createOrder: data => apiClient.post('lab/orders/', data),
  getOrders: (params = {}) => getPaginatedData('lab/orders/', params),
  getOrder: id => apiClient.get(`lab/orders/${id}/`),
  updateOrderStatus: (id, data) => apiClient.post(`lab/orders/${id}/update-status/`, data),
  addResults: (id, data) => apiClient.post(`lab/orders/${id}/add-results/`, data),
  getReports: (params = {}) => getPaginatedData('lab/reports/', params),
  getOrdersByPatient: (patientId) => apiClient.get(`lab/orders/by-patient/?patient_id=${patientId}`),
  downloadPdf: (id) => apiClient.get(`lab/orders/${id}/download-pdf/`, { responseType: 'blob' }),
};

export const notificationService = {
  getAll: (params = {}) => getPaginatedData('notifications/', params),
  getUnread: () => apiClient.get('notifications/unread/'),
  getUnreadCount: () => apiClient.get('notifications/unread-count/'),
  markRead: (id) => apiClient.post(`notifications/${id}/mark-read/`),
  markAllRead: () => apiClient.post('notifications/mark-all-read/'),
  getPreferences: () => apiClient.get('notification-preferences/'),
  updatePreferences: (data) => apiClient.patch('notification-preferences/', data),
};

export const reviewService = {
  getAll: (params = {}) => getPaginatedData('doctor-reviews/', params),
  create: data => apiClient.post('doctor-reviews/', data),
  getByDoctor: (doctorId) => apiClient.get(`doctor-reviews/by_doctor/?doctor_id=${doctorId}`),
};

export const documentService = {
  getAll: (params = {}) => getPaginatedData('patient-documents/', params),
  get: id => apiClient.get(`patient-documents/${id}/`),
  create: data => {
    const formData = new FormData();
    Object.keys(data).forEach(key => formData.append(key, data[key]));
    return apiClient.post('patient-documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: id => apiClient.delete(`patient-documents/${id}/`),
  getByPatient: (patientId) => apiClient.get(`patient-documents/by_patient/?patient_id=${patientId}`),
};

export const timeSlotService = {
  getAll: (params = {}) => getPaginatedData('time-slots/', params),
  get: id => apiClient.get(`time-slots/${id}/`),
  create: data => apiClient.post('time-slots/', data),
  update: (id, data) => apiClient.put(`time-slots/${id}/`, data),
  delete: id => apiClient.delete(`time-slots/${id}/`),
};

export const doctorLeaveService = {
  getAll: (params = {}) => getPaginatedData('doctor-leaves/', params),
  create: data => apiClient.post('doctor-leaves/', data),
  update: (id, data) => apiClient.put(`doctor-leaves/${id}/`, data),
  delete: id => apiClient.delete(`doctor-leaves/${id}/`),
};

// Vitals & EHR service
export const vitalsService = {
  getAll: (params = {}) => getPaginatedData('vitals/vital-signs/', params),
  get: id => apiClient.get(`vitals/vital-signs/${id}/`),
  create: data => apiClient.post('vitals/vital-signs/', data),
  update: (id, data) => apiClient.put(`vitals/vital-signs/${id}/`, data),
  delete: id => apiClient.delete(`vitals/vital-signs/${id}/`),
  getLatestByPatient: (patientId) => apiClient.get(`vitals/vital-signs/latest_by_patient/?patient_id=${patientId}`),
  getHistory: (patientId, params = {}) => apiClient.get(`vitals/vital-signs/history/?patient_id=${patientId}`, { params }),
};

export const clinicalNoteService = {
  getAll: (params = {}) => getPaginatedData('vitals/clinical-notes/', params),
  get: id => apiClient.get(`vitals/clinical-notes/${id}/`),
  create: data => apiClient.post('vitals/clinical-notes/', data),
  update: (id, data) => apiClient.put(`vitals/clinical-notes/${id}/`, data),
  delete: id => apiClient.delete(`vitals/clinical-notes/${id}/`),
  getByPatient: (patientId) => apiClient.get(`vitals/clinical-notes/by_patient/?patient_id=${patientId}`),
  getByDoctor: (doctorId) => apiClient.get(`vitals/clinical-notes/by_doctor/?doctor_id=${doctorId}`),
};

export const treatmentPlanService = {
  getAll: (params = {}) => getPaginatedData('vitals/treatment-plans/', params),
  get: id => apiClient.get(`vitals/treatment-plans/${id}/`),
  create: data => apiClient.post('vitals/treatment-plans/', data),
  update: (id, data) => apiClient.put(`vitals/treatment-plans/${id}/`, data),
  delete: id => apiClient.delete(`vitals/treatment-plans/${id}/`),
  getByPatient: (patientId) => apiClient.get(`vitals/treatment-plans/by_patient/?patient_id=${patientId}`),
  getActivePlans: () => apiClient.get('vitals/treatment-plans/active_plans/'),
};

export const allergyService = {
  getAll: (params = {}) => getPaginatedData('vitals/allergies/', params),
  get: id => apiClient.get(`vitals/allergies/${id}/`),
  create: data => apiClient.post('vitals/allergies/', data),
  update: (id, data) => apiClient.put(`vitals/allergies/${id}/`, data),
  delete: id => apiClient.delete(`vitals/allergies/${id}/`),
  getByPatient: (patientId) => apiClient.get(`vitals/allergies/by_patient/?patient_id=${patientId}`),
};

// Staff & HR service
export const staffService = {
  getAll: (params = {}) => getPaginatedData('staff/staff-members/', params),
  get: id => apiClient.get(`staff/staff-members/${id}/`),
  create: data => apiClient.post('staff/staff-members/', data),
  update: (id, data) => apiClient.put(`staff/staff-members/${id}/`, data),
  delete: id => apiClient.delete(`staff/staff-members/${id}/`),
  getByDepartment: (deptId) => apiClient.get(`staff/staff-members/by_department/?department_id=${deptId}`),
  getByRole: (role) => apiClient.get(`staff/staff-members/by_role/?role=${role}`),
};

export const attendanceService = {
  getAll: (params = {}) => getPaginatedData('staff/attendance/', params),
  create: data => apiClient.post('staff/attendance/', data),
  getByStaff: (staffId) => apiClient.get(`staff/attendance/by_staff/?staff_member_id=${staffId}`),
  getMonthlyReport: (month, year) => apiClient.get(`staff/attendance/monthly_report/?month=${month}&year=${year}`),
};

export const leaveRequestService = {
  getAll: (params = {}) => getPaginatedData('staff/leave-requests/', params),
  create: data => apiClient.post('staff/leave-requests/', data),
  approve: (id) => apiClient.post(`staff/leave-requests/${id}/approve/`),
  reject: (id) => apiClient.post(`staff/leave-requests/${id}/reject/`),
};

export const payrollService = {
  getAll: (params = {}) => getPaginatedData('staff/payroll/', params),
  get: id => apiClient.get(`staff/payroll/${id}/`),
  generatePayroll: (data) => apiClient.post('staff/payroll/generate_payroll/', data),
  getByMonth: (month, year) => apiClient.get(`staff/payroll/by_month/?month=${month}&year=${year}`),
  getSummary: (month, year) => apiClient.get(`staff/payroll/payroll_summary/?month=${month}&year=${year}`),
  downloadPayslip: (id) => apiClient.get(`staff/payroll/${id}/download-payslip/`, { responseType: 'blob' }),
};

// Blood Bank service
export const bloodBankService = {
  getDonors: (params = {}) => getPaginatedData('blood-bank/donors/', params),
  getDonor: id => apiClient.get(`blood-bank/donors/${id}/`),
  createDonor: data => apiClient.post('blood-bank/donors/', data),
  updateDonor: (id, data) => apiClient.put(`blood-bank/donors/${id}/`, data),
  getEligibleDonors: () => apiClient.get('blood-bank/donors/eligible_donors/'),
  getUnits: (params = {}) => getPaginatedData('blood-bank/units/', params),
  getAvailableUnits: () => apiClient.get('blood-bank/units/available_units/'),
  getStockSummary: () => apiClient.get('blood-bank/units/stock_summary/'),
  getExpiringSoon: () => apiClient.get('blood-bank/units/expiring_soon/'),
  createUnit: data => apiClient.post('blood-bank/units/', data),
  getRequests: (params = {}) => getPaginatedData('blood-bank/requests/', params),
  createRequest: data => apiClient.post('blood-bank/requests/', data),
  approveRequest: (id) => apiClient.post(`blood-bank/requests/${id}/approve/`),
  issueRequest: (id) => apiClient.post(`blood-bank/requests/${id}/issue/`),
};

// Radiology service
export const radiologyService = {
  getImagingTypes: (params = {}) => getPaginatedData('radiology/imaging-types/', params),
  getOrders: (params = {}) => getPaginatedData('radiology/imaging-orders/', params),
  getOrder: id => apiClient.get(`radiology/imaging-orders/${id}/`),
  createOrder: data => apiClient.post('radiology/imaging-orders/', data),
  updateOrder: (id, data) => apiClient.put(`radiology/imaging-orders/${id}/`, data),
  getByPatient: (patientId) => apiClient.get(`radiology/imaging-orders/by-patient/?patient_id=${patientId}`),
  getPendingReports: () => apiClient.get('radiology/imaging-orders/pending-reports/'),
  getReports: (params = {}) => getPaginatedData('radiology/imaging-reports/', params),
  createReport: data => apiClient.post('radiology/imaging-reports/', data),
};

// Emergency service
export const emergencyService = {
  getVisits: (params = {}) => getPaginatedData('emergency/visits/', params),
  getVisit: id => apiClient.get(`emergency/visits/${id}/`),
  createVisit: data => apiClient.post('emergency/visits/', data),
  updateVisit: (id, data) => apiClient.put(`emergency/visits/${id}/`, data),
  getActiveVisits: () => apiClient.get('emergency/visits/active_visits/'),
  triageVisit: (id, data) => apiClient.post(`emergency/visits/${id}/triage/`, data),
  dischargeVisit: (id, data) => apiClient.post(`emergency/visits/${id}/discharge/`, data),
  getAmbulances: (params = {}) => getPaginatedData('emergency/ambulances/', params),
  getAvailableAmbulances: () => apiClient.get('emergency/ambulances/available/'),
  updateAmbulanceStatus: (id, data) => apiClient.post(`emergency/ambulances/${id}/update_status/`, data),
  getDispatches: (params = {}) => getPaginatedData('emergency/ambulance-dispatches/', params),
  createDispatch: data => apiClient.post('emergency/ambulance-dispatches/', data),
  getContacts: (params = {}) => getPaginatedData('emergency/contacts/', params),
};

// Operation Theater service
export const operationTheaterService = {
  getTheaters: (params = {}) => getPaginatedData('ot/theaters/', params),
  getAvailableTheaters: () => apiClient.get('ot/theaters/available/'),
  getSurgeries: (params = {}) => getPaginatedData('ot/surgeries/', params),
  getSurgery: id => apiClient.get(`ot/surgeries/${id}/`),
  createSurgery: data => apiClient.post('ot/surgeries/', data),
  updateSurgery: (id, data) => apiClient.put(`ot/surgeries/${id}/`, data),
  getTodaySurgeries: () => apiClient.get('ot/surgeries/today/'),
  getUpcomingSurgeries: () => apiClient.get('ot/surgeries/upcoming/'),
  getByPatient: (patientId) => apiClient.get(`ot/surgeries/by_patient/?patient_id=${patientId}`),
  getPreOpChecklist: id => apiClient.get(`ot/pre-op-checklists/${id}/`),
  updatePreOpChecklist: (id, data) => apiClient.put(`ot/pre-op-checklists/${id}/`, data),
  getPostOpNote: id => apiClient.get(`ot/post-op-notes/${id}/`),
  createPostOpNote: data => apiClient.post('ot/post-op-notes/', data),
};

// Inventory service
export const inventoryService = {
  getCategories: (params = {}) => getPaginatedData('inventory/categories/', params),
  getAssets: (params = {}) => getPaginatedData('inventory/assets/', params),
  getAsset: id => apiClient.get(`inventory/assets/${id}/`),
  createAsset: data => apiClient.post('inventory/assets/', data),
  updateAsset: (id, data) => apiClient.put(`inventory/assets/${id}/`, data),
  getByDepartment: (deptId) => apiClient.get(`inventory/assets/by_department/?department_id=${deptId}`),
  getMaintenanceDue: () => apiClient.get('inventory/assets/maintenance_due/'),
  getMaintenanceLogs: (params = {}) => getPaginatedData('inventory/maintenance-logs/', params),
  createMaintenanceLog: data => apiClient.post('inventory/maintenance-logs/', data),
  getVendors: (params = {}) => getPaginatedData('inventory/vendors/', params),
  getVendor: id => apiClient.get(`inventory/vendors/${id}/`),
  createVendor: data => apiClient.post('inventory/vendors/', data),
  getPurchaseOrders: (params = {}) => getPaginatedData('inventory/purchase-orders/', params),
  createPurchaseOrder: data => apiClient.post('inventory/purchase-orders/', data),
};

// OPD Queue service
export const queueService = {
  getEntries: (params = {}) => getPaginatedData('queue/entries/', params),
  createEntry: data => apiClient.post('queue/entries/', data),
  getTodayQueue: (params = {}) => apiClient.get('queue/entries/today_queue/', { params }),
  getByDoctor: (doctorId) => apiClient.get(`queue/entries/by_doctor/?doctor_id=${doctorId}`),
  callNext: (id) => apiClient.post(`queue/entries/${id}/call_next/`),
  complete: (id) => apiClient.post(`queue/entries/${id}/complete/`),
  skip: (id) => apiClient.post(`queue/entries/${id}/skip/`),
  getEstimatedWait: (id) => apiClient.get(`queue/entries/${id}/estimated_wait/`),
  getDisplays: (params = {}) => getPaginatedData('queue/displays/', params),
  getActiveDisplays: () => apiClient.get('queue/displays/active_displays/'),
};

// Discharge service
export const dischargeService = {
  getSummaries: (params = {}) => getPaginatedData('discharge/discharge-summaries/', params),
  getSummary: id => apiClient.get(`discharge/discharge-summaries/${id}/`),
  createSummary: data => apiClient.post('discharge/discharge-summaries/', data),
  updateSummary: (id, data) => apiClient.put(`discharge/discharge-summaries/${id}/`, data),
  approveSummary: (id) => apiClient.post(`discharge/discharge-summaries/${id}/approve/`),
  getByPatient: (patientId) => apiClient.get(`discharge/discharge-summaries/by_patient/?patient_id=${patientId}`),
  getFollowUps: (params = {}) => getPaginatedData('discharge/follow-ups/', params),
  createFollowUp: data => apiClient.post('discharge/follow-ups/', data),
  getUpcomingFollowUps: () => apiClient.get('discharge/follow-ups/upcoming/'),
  getOverdueFollowUps: () => apiClient.get('discharge/follow-ups/overdue/'),
  getReadmissions: (params = {}) => getPaginatedData('discharge/readmissions/', params),
  getReadmissionStats: () => apiClient.get('discharge/readmissions/statistics/'),
  downloadPdf: (id) => apiClient.get(`discharge/discharge-summaries/${id}/download-pdf/`, { responseType: 'blob' }),
};

// Accounting service
export const accountingService = {
  getFinancialDashboard: () => apiClient.get('accounting/reports/dashboard/'),
  getProfitLoss: (params = {}) => apiClient.get('accounting/reports/profit-loss/', { params }),
  getCashFlow: (params = {}) => apiClient.get('accounting/reports/cash-flow/', { params }),
  getARAging: () => apiClient.get('accounting/reports/ar-aging/'),
  getExpensesByCategory: (params = {}) => apiClient.get('accounting/expenses/by_category/', { params }),
  getMonthlyExpenses: () => apiClient.get('accounting/expenses/monthly_summary/'),
  getBudgetVariance: () => apiClient.get('accounting/budgets/variance_report/'),
  getExpenses: (params = {}) => apiClient.get('accounting/expenses/', { params }),
  createExpense: (data) => apiClient.post('accounting/expenses/', data),
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
