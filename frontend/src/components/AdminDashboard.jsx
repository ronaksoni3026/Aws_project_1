import React, { useState, useEffect } from "react";
import { api } from "../api";

export function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("STUDENTS"); // STUDENTS, VETTING, JOBS, COMPANIES, AUDIT
  const [metrics, setMetrics] = useState(null);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });

  // Students Directory State
  const [students, setStudents] = useState([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentBranch, setStudentBranch] = useState("");

  // Companies Directory State
  const [companies, setCompanies] = useState([]);
  const [companyPage, setCompanyPage] = useState(1);
  const [companyTotalPages, setCompanyTotalPages] = useState(1);
  const [companyTotal, setCompanyTotal] = useState(0);
  const [companyStatusFilter, setCompanyStatusFilter] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  // Job Feedback Modal State
  const [selectedJobForFeedback, setSelectedJobForFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "STUDENTS") {
      loadStudents(studentPage, studentSearch, studentBranch);
    } else if (activeTab === "COMPANIES") {
      loadCompanies(companyPage, companyStatusFilter, companySearch);
    } else if (activeTab === "AUDIT") {
      loadAuditLogs(auditPage);
    }
  }, [activeTab, studentPage, studentSearch, studentBranch, companyPage, companyStatusFilter, companySearch, auditPage]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [metricsData, recruitersData, jobsData] = await Promise.all([
        api.getMetrics(),
        api.getPendingRecruiters(),
        api.getPendingJobs(),
      ]);
      setMetrics(metricsData);
      setPendingRecruiters(recruitersData);
      setPendingJobs(jobsData);
      loadStudents(1, "", "");
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (page = 1, search = "", branch = "") => {
    try {
      const data = await api.getAdminStudents(page, 20, search, branch);
      setStudents(data.items);
      setStudentTotal(data.total);
      setStudentTotalPages(data.total_pages);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const loadCompanies = async (page = 1, status = "", search = "") => {
    try {
      const data = await api.getAdminRecruiters(page, 20, status, search);
      setCompanies(data.items);
      setCompanyTotal(data.total);
      setCompanyTotalPages(data.total_pages);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const loadAuditLogs = async (page = 1) => {
    try {
      const data = await api.getAuditLogs(page, 20);
      setAuditLogs(data.items);
      setAuditTotalPages(data.total_pages);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleApproveRecruiter = async (id) => {
    try {
      await api.approveRecruiter(id);
      setActionMsg({ type: "success", text: "Recruiter account approved and activated. Audit log recorded." });
      loadAllData();
      if (activeTab === "COMPANIES") loadCompanies(companyPage, companyStatusFilter, companySearch);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleRejectRecruiter = async (id) => {
    try {
      await api.rejectRecruiter(id);
      setActionMsg({ type: "success", text: "Recruiter account rejected. Audit log recorded." });
      loadAllData();
      if (activeTab === "COMPANIES") loadCompanies(companyPage, companyStatusFilter, companySearch);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleApproveJob = async (id) => {
    try {
      await api.approveJob(id);
      setActionMsg({ type: "success", text: "Job approved and published to live student discovery." });
      loadAllData();
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleSendJobFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    try {
      await api.requestJobChanges(selectedJobForFeedback.id, feedbackText);
      setActionMsg({
        type: "success",
        text: `Job transitioned to REQUIRES_CHANGES state. Feedback sent to recruiter: "${feedbackText}"`,
      });
      setSelectedJobForFeedback(null);
      setFeedbackText("");
      loadAllData();
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Placement Cell Administration Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Placement Cell Administration</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
              Administrator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage students, recruiters, placement drives and applications.
          </p>
        </div>
      </div>

      {actionMsg.text && (
        <div
          className={`p-3.5 rounded-lg border text-xs whitespace-pre-line ${
            actionMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* Institutional Placement Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => setActiveTab("STUDENTS")}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-blue-400 transition-colors"
          >
            <div className="text-[11px] font-medium text-slate-500">Total Students</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total_students}</div>
          </div>
          <div
            onClick={() => setActiveTab("COMPANIES")}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-emerald-400 transition-colors"
          >
            <div className="text-[11px] font-medium text-slate-500">Registered Companies</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total_recruiters || metrics.active_recruiters}</div>
          </div>
          <div
            onClick={() => setActiveTab("VETTING")}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-amber-400 transition-colors"
          >
            <div className="text-[11px] font-medium text-slate-500">Pending Recruiters</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.pending_recruiters}</div>
          </div>
          <div
            onClick={() => setActiveTab("JOBS")}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-blue-400 transition-colors"
          >
            <div className="text-[11px] font-medium text-slate-500">Active Drives</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.active_jobs}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-medium text-slate-500">Total Applications</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total_applications}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-medium text-slate-500">Conversion Rate</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {metrics.conversion_rate_percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("VETTING")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "VETTING"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Recruiter Approvals ({pendingRecruiters.length})
        </button>
        <button
          onClick={() => setActiveTab("JOBS")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "JOBS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Placement Drives ({pendingJobs.length})
        </button>
        <button
          onClick={() => setActiveTab("STUDENTS")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "STUDENTS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Students ({metrics?.total_students || 0})
        </button>
        <button
          onClick={() => setActiveTab("COMPANIES")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "COMPANIES"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Companies ({metrics?.total_recruiters || 0})
        </button>
        <button
          onClick={() => setActiveTab("AUDIT")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "AUDIT"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* Tab: Recruiter Onboarding Approvals */}
      {activeTab === "VETTING" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Pending Recruiter Approvals</h2>
          </div>
          {pendingRecruiters.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-sm">
              All recruiter registrations have been processed. Queue is clear.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRecruiters.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-slate-900 text-base">{rec.company_name}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-2 space-y-1">
                      <div>
                        HR Contact: <strong className="text-slate-800">{rec.hr_name}</strong>
                      </div>
                      <div>
                        Email: <span className="font-mono text-slate-600">{rec.email}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Registered {new Date(rec.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex space-x-2">
                    <button
                      onClick={() => handleApproveRecruiter(rec.id)}
                      className="w-1/2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectRecruiter(rec.id)}
                      className="w-1/2 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold text-xs transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Job Review Queue */}
      {activeTab === "JOBS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Placement Drive Vetting Queue</h2>
          </div>
          {pendingJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-sm">
              No pending job postings requiring administrative review.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{job.title}</h3>
                        <div className="text-xs font-semibold text-blue-600">{job.company_name}</div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Approval
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3">{job.description}</p>

                    <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                      <div>
                        Min CGPA Required: <strong className="text-slate-800">{job.min_cgpa.toFixed(1)}</strong>
                      </div>
                      <div>
                        Target Departments:{" "}
                        <strong className="text-slate-800">
                          {job.allowed_branches?.length ? job.allowed_branches.join(", ") : "All"}
                        </strong>
                      </div>
                      <div>
                        Target Batches:{" "}
                        <strong className="text-slate-800">
                          {job.allowed_graduation_years?.length ? job.allowed_graduation_years.join(", ") : "All"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex space-x-2">
                    <button
                      onClick={() => handleApproveJob(job.id)}
                      className="w-1/2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                    >
                      Approve Drive
                    </button>
                    <button
                      onClick={() => {
                        setSelectedJobForFeedback(job);
                        setFeedbackText("");
                      }}
                      className="w-1/2 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs transition-colors"
                    >
                      Request Changes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Student Directory */}
      {activeTab === "STUDENTS" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Directory</h2>
              <p className="text-xs text-slate-500">
                Institutional directory of registered students and academic records.
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentPage(1);
                }}
                placeholder="Search name, roll no, email..."
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />

              <input
                type="text"
                value={studentBranch}
                onChange={(e) => {
                  setStudentBranch(e.target.value);
                  setStudentPage(1);
                }}
                placeholder="Filter by branch (e.g. CSE)"
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-sm">
              No students found matching your search criteria.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Roll Number</th>
                      <th className="p-3">CGPA</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Grad Batch</th>
                      <th className="p-3">Resume</th>
                      <th className="p-3">Applications</th>
                      <th className="p-3">Registered On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{stu.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{stu.email}</div>
                        </td>
                        <td className="p-3 font-mono font-medium text-blue-700">{stu.roll_number}</td>
                        <td className="p-3 font-bold text-emerald-700">{stu.cgpa !== undefined ? Number(stu.cgpa).toFixed(2) : "N/A"}</td>
                        <td className="p-3">{stu.branch || "N/A"}</td>
                        <td className="p-3 text-slate-600">{stu.graduation_year}</td>
                        <td className="p-3">
                          {stu.resume_url ? (
                            <a
                              href={stu.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View PDF
                            </a>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                            {stu.applications_count} applied
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(stu.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing {students.length} of {studentTotal} student(s) &bull; Page {studentPage} of{" "}
                  {studentTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                    disabled={studentPage <= 1}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                    disabled={studentPage >= studentTotalPages}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: All Companies */}
      {activeTab === "COMPANIES" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Company Directory</h2>
              <p className="text-xs text-slate-500">Registered organizations on the placement portal.</p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <select
                value={companyStatusFilter}
                onChange={(e) => {
                  setCompanyStatusFilter(e.target.value);
                  setCompanyPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <input
                type="text"
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setCompanyPage(1);
                }}
                placeholder="Search company or HR..."
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {companies.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-sm">
              No companies found matching this filter.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Company Name</th>
                      <th className="p-3">HR Representative</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Drives Posted</th>
                      <th className="p-3">Onboarded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">{c.company_name}</td>
                        <td className="p-3 text-slate-700">{c.hr_name}</td>
                        <td className="p-3 text-blue-600 font-mono">{c.email}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : c.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {c.jobs_count} drives
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing {companies.length} of {companyTotal} company record(s) &bull; Page {companyPage} of{" "}
                  {companyTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCompanyPage((p) => Math.max(1, p - 1))}
                    disabled={companyPage <= 1}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCompanyPage((p) => Math.min(companyTotalPages, p + 1))}
                    disabled={companyPage >= companyTotalPages}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Immutable Audit Trail */}
      {activeTab === "AUDIT" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">System Audit Trail</h2>
            <span className="text-xs text-slate-500">Immutable transactional log of administrative actions</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Timestamp (UTC)</th>
                    <th className="p-3">Admin Authority</th>
                    <th className="p-3">Action Type</th>
                    <th className="p-3">Target Entity</th>
                    <th className="p-3">Details / Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-3 text-blue-600 font-medium">{log.admin_email}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {log.target_entity} #{log.target_id}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span>Page {auditPage} of {auditTotalPages}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage >= auditTotalPages}
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Job Feedback Loop */}
      {selectedJobForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl relative text-slate-800">
            <button
              onClick={() => setSelectedJobForFeedback(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">Request Changes</h2>
            <p className="text-xs text-slate-500 mb-4">
              Return "{selectedJobForFeedback.title}" to the recruiter with feedback.
            </p>

            <form onSubmit={handleSendJobFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Required Corrections / Guidance</label>
                <textarea
                  required
                  rows="4"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Please clarify eligibility requirements..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForFeedback(null)}
                  className="w-1/2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
