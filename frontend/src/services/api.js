import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// 每次請求自動帶上 JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 自動清除 token 並跳回登入頁
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (username) => api.post('/auth/login', { username }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const attendanceAPI = {
  clockIn: () => api.post('/attendance/clock-in'),
  clockOut: (note) => api.post('/attendance/clock-out', { note }),
  today: () => api.get('/attendance/today'),
  updateNote: (note) => api.patch('/attendance/today/note', { note }),
  myRecords: (month) => api.get('/attendance/me', { params: { month } }),
  myMonthly: (month) => api.get('/attendance/me/monthly', { params: { month } }),
};

export const adminAPI = {
  summary: (month) => api.get('/admin/summary', { params: { month } }),
  allAttendance: (month) => api.get('/admin/attendance', { params: { month } }),
  userDetail: (userId, month) =>
    api.get(`/admin/attendance/user/${userId}`, { params: { month } }),
  updateRecord: (recordId, data) => api.put(`/admin/attendance/${recordId}`, data),
};

export default api;
