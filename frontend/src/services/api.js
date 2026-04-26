import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// ─── Zone API ───────────────────────────────────────────────
export const createZone = (data) => API.post('/zones', data);
export const getAllZones = () => API.get('/zones');
export const updateZone = (id, data) => API.put(`/zones/${id}`, data);
export const deleteZone = (id) => API.delete(`/zones/${id}`);

// ─── Employee API ───────────────────────────────────────────
export const registerEmployee = (data) => API.post('/employees', data);
export const getAllEmployees = () => API.get('/employees');
export const updateEmployee = (id, data) => API.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => API.delete(`/employees/${id}`);
export const changeEmployeePassword = (data) => API.post('/employees/change-password', data);
export const updateEmployeeProfile = (id, data) => API.put(`/employees/${id}/profile`, data);
export const changeUserPassword = (data) => API.post('/auth/change-password', data);

// ─── PPE Item API ───────────────────────────────────────────
export const createPPEItem = (data) => API.post('/ppe-items', data);
export const getAllPPEItems = () => API.get('/ppe-items');
export const getItemsByZone = (zoneId) => API.get(`/ppe-items/zone/${zoneId}`);
export const updatePPEItem = (id, data) => API.put(`/ppe-items/${id}`, data);
export const deletePPEItem = (id) => API.delete(`/ppe-items/${id}`);

// ─── Zone Assignment API ────────────────────────────────────
export const getPopulatedZones = () => API.get('/zone-assignments/populated');
export const assignEmployee = (data) => API.post('/zone-assignments', data);
export const bulkAssignEmployees = (data) => API.post('/zone-assignments/bulk', data);
export const removeAssignment = (id) => API.delete(`/zone-assignments/${id}`);
export const removeAssignmentByZoneEmployee = (zoneId, employeeId) =>
    API.delete(`/zone-assignments/zone/${zoneId}/employee/${employeeId}`);
export const getMyAssignedZones = (employeeId) =>
    API.get(`/zone-assignments/employee/${employeeId}`);

// ─── Inquiry API ────────────────────────────────────────────
export const createInquiry = (data) => API.post('/inquiries', data);
export const getMyInquiries = (employeeId) => API.get(`/inquiries/employee/${employeeId}`);
export const getAllInquiries = () => API.get('/inquiries');
export const updateInquiry = (id, data) => API.put(`/inquiries/${id}`, data);
export const deleteInquiry = (id) => API.delete(`/inquiries/${id}`);
export const respondToInquiry = (id, data) => API.put(`/inquiries/${id}/respond`, data);

// ─── Notification API ───────────────────────────────────────
export const sendNotification = (data) => API.post('/notifications', data);
export const getAllNotifications = () => API.get('/notifications');
export const getEmployeeNotifications = (employeeId) =>
    API.get(`/notifications/employee/${employeeId}`);
export const updateNotification = (id, data) => API.put(`/notifications/${id}`, data);
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);
export const markNotificationRead = (id, employeeId) =>
    API.put(`/notifications/${id}/read`, { employeeId });

// ─── Feedback API ───────────────────────────────────────────
export const createFeedback = (data) => API.post('/feedbacks', data);
export const getAllFeedbacks = () => API.get('/feedbacks');
export const getEmployeeFeedbacks = (employeeId) =>
    API.get(`/feedbacks/employee/${employeeId}`);
export const updateFeedbackStatus = (id, status) =>
    API.put(`/feedbacks/${id}/status`, { status });
export const deleteFeedback = (id) => API.delete(`/feedbacks/${id}`);

// ─── Inference API ──────────────────────────────────────────
export const runInference = (formData) =>
    API.post('/inferences', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
export const getAllInferences = () => API.get('/inferences');
export const getInferencesByZone = (zoneId) => API.get(`/inferences/zone/${zoneId}`);
export const getInferenceMetrics = (zoneId) =>
    API.get('/inferences/metrics', { params: zoneId ? { zone_id: zoneId } : {} });
export const deleteInferenceApi = (id) => API.delete(`/inferences/${id}`);

export const getLiveSummary = (since) =>
    API.get('/inferences/summary', { params: { since } });

export const getHourlyReport = (date) =>
    API.get('/inferences/hourly', { params: { date } });

export const getDateRangeReport = (start, end) =>
    API.get('/inferences/range', { params: { start, end } });

export const downloadCSV = (start, end) => {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api')
        .replace(/\/api$/, ''); // strip trailing /api → gives us the origin
    const url = `${base}/api/inferences/export/csv?start=${start}&end=${end}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppe-report-${start}-to-${end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

export default API;
