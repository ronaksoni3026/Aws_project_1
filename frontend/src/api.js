// Centralized API Client with JWT Bearer Token Injection
const API_BASE = "/api";

export const getStoredToken = () => localStorage.getItem("placement_token");
export const setStoredToken = (token) => localStorage.setItem("placement_token", token);
export const removeStoredToken = () => {
  localStorage.removeItem("placement_token");
  localStorage.removeItem("placement_user");
};
export const getStoredUser = () => {
  const user = localStorage.getItem("placement_user");
  return user ? JSON.parse(user) : null;
};
export const setStoredUser = (user) => localStorage.setItem("placement_user", JSON.stringify(user));

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.headers || {}),
  };

  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let errorMsg = "An unexpected network or server error occurred.";
    if (data.detail) {
      if (typeof data.detail === "object" && data.detail.reasons) {
        errorMsg = `Eligibility Criteria Unmet:\n• ` + data.detail.reasons.join("\n• ");
      } else if (typeof data.detail === "object") {
        errorMsg = data.detail.message || JSON.stringify(data.detail);
      } else {
        errorMsg = data.detail;
      }
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // System / AWS Cloud
  getAwsStatus: () => request("/aws/status"),

  // Auth
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  registerStudent: (data) => request("/auth/register/student", { method: "POST", body: JSON.stringify(data) }),
  registerRecruiter: (data) => request("/auth/register/recruiter", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/auth/me"),
  changePassword: (data) => request("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),

  // Student
  getStudentProfile: () => request("/student/profile"),
  updateStudentProfile: (profile) => request("/student/profile", { method: "PUT", body: JSON.stringify(profile) }),
  uploadResume: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/student/resume/upload", {
      method: "POST",
      body: formData,
    });
  },
  getStudentJobs: () => request("/student/jobs"),
  applyJob: (jobId) => request(`/student/jobs/${jobId}/apply`, { method: "POST" }),
  getStudentApplications: () => request("/student/applications"),
  getStudentNotifications: () => request("/student/notifications"),
  markNotificationRead: (id) => request(`/student/notifications/${id}/read`, { method: "POST" }),

  // Recruiter
  getRecruiterProfile: () => request("/recruiter/profile"),
  getRecruiterJobs: () => request("/recruiter/jobs"),
  createJob: (job) => request("/recruiter/jobs", { method: "POST", body: JSON.stringify(job) }),
  updateJob: (jobId, job) => request(`/recruiter/jobs/${jobId}`, { method: "PUT", body: JSON.stringify(job) }),
  submitJobForApproval: (jobId) => request(`/recruiter/jobs/${jobId}/submit`, { method: "POST" }),
  closeJob: (jobId) => request(`/recruiter/jobs/${jobId}/close`, { method: "POST" }),
  deleteJob: (jobId) => request(`/recruiter/jobs/${jobId}`, { method: "DELETE" }),
  getJobApplications: (jobId, page = 1, limit = 20, status = "", branch = "") => {
    let url = `/recruiter/jobs/${jobId}/applications?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (branch) url += `&branch=${encodeURIComponent(branch)}`;
    return request(url);
  },
  batchUpdateApplications: (jobId, applicationIds, targetStatus) =>
    request(`/recruiter/jobs/${jobId}/applications/batch-update`, {
      method: "POST",
      body: JSON.stringify({ application_ids: applicationIds, status: targetStatus }),
    }),
  scheduleInterview: (jobId, applicationId, payload) =>
    request(`/recruiter/jobs/${jobId}/applications/${applicationId}/schedule-interview`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  exportJobCsvUrl: (jobId) => `/api/recruiter/jobs/${jobId}/export-csv`,

  // Admin
  getPendingRecruiters: () => request("/admin/recruiters/pending"),
  approveRecruiter: (id) => request(`/admin/recruiters/${id}/approve`, { method: "POST" }),
  rejectRecruiter: (id) => request(`/admin/recruiters/${id}/reject`, { method: "POST" }),
  getPendingJobs: () => request("/admin/jobs/pending"),
  approveJob: (id) => request(`/admin/jobs/${id}/approve`, { method: "POST" }),
  requestJobChanges: (id, admin_feedback) =>
    request(`/admin/jobs/${id}/request-changes`, { method: "POST", body: JSON.stringify({ admin_feedback }) }),
  getAuditLogs: (page = 1, limit = 25) => request(`/admin/audit-logs?page=${page}&limit=${limit}`),
  getMetrics: () => request("/admin/metrics"),
  getAdminStudents: (page = 1, limit = 20, search = "", branch = "", min_cgpa = null) => {
    let url = `/admin/students?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (branch) url += `&branch=${encodeURIComponent(branch)}`;
    if (min_cgpa !== null && min_cgpa !== undefined && min_cgpa !== "") url += `&min_cgpa=${min_cgpa}`;
    return request(url);
  },
  getAdminRecruiters: (page = 1, limit = 20, status = "", search = "") => {
    let url = `/admin/recruiters?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return request(url);
  },
  exportStudentsCsvUrl: () => "/api/admin/export/students-csv",
  exportPlacementsCsvUrl: () => "/api/admin/export/placements-csv",
};
