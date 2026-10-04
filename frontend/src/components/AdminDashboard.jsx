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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Command Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white">Placement Cell Administrative Console</h1>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              Lead Officer
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative platform oversight, student applicant records, recruiter vetting, and immutable audit logs.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1.5 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("STUDENTS")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "STUDENTS" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Student Directory ({metrics?.total_students || 0})
          </button>
          <button
            onClick={() => setActiveTab("VETTING")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "VETTING" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Pending Recruiters ({pendingRecruiters.length})
          </button>
          <button
            onClick={() => setActiveTab("JOBS")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "JOBS" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Job Review Queue ({pendingJobs.length})
          </button>
          <button
            onClick={() => setActiveTab("COMPANIES")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "COMPANIES" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            All Companies ({metrics?.total_recruiters || 0})
          </button>
          <button
            onClick={() => setActiveTab("AUDIT")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "AUDIT" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {actionMsg.text && (
        <div
          className={`p-4 rounded-xl border text-xs whitespace-pre-line ${
            actionMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* Global Placement KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => setActiveTab("STUDENTS")}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow cursor-pointer hover:border-indigo-500/50 transition-all"
          >
            <div className="text-[11px] text-slate-400">Total Students</div>
            <div className="text-xl font-bold text-white mt-1">{metrics.total_students}</div>
          </div>
          <div
            onClick={() => setActiveTab("COMPANIES")}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow cursor-pointer hover:border-emerald-500/50 transition-all"
          >
            <div className="text-[11px] text-slate-400">Active Companies</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.active_recruiters}</div>
          </div>
          <div
            onClick={() => setActiveTab("VETTING")}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow cursor-pointer hover:border-amber-500/50 transition-all"
          >
            <div className="text-[11px] text-slate-400">Pending Approvals</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{metrics.pending_recruiters}</div>
          </div>
          <div
            onClick={() => setActiveTab("JOBS")}
            className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow cursor-pointer hover:border-indigo-500/50 transition-all"
          >
            <div className="text-[11px] text-slate-400">Active Drives</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">{metrics.active_jobs}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
            <div className="text-[11px] text-slate-400">Applications Submitted</div>
            <div className="text-xl font-bold text-sky-400 mt-1">{metrics.total_applications}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
            <div className="text-[11px] text-slate-400">Conversion Rate</div>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {metrics.conversion_rate_percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Tab: Student Directory */}
      {activeTab === "STUDENTS" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Student Applicant Records</h2>
              <p className="text-xs text-slate-400">
                Institutional directory of all registered students, academic metrics, and application activity.
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
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <input
                type="text"
                value={studentBranch}
                onChange={(e) => {
                  setStudentBranch(e.target.value);
                  setStudentPage(1);
                }}
                placeholder="Filter by branch (e.g. CSE)"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No students found matching your search criteria.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Roll Number</th>
                    <th className="p-3">CGPA</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Grad Batch</th>
                    <th className="p-3">Resume</th>
                    <th className="p-3">Applications</th>
                    <th className="p-3">Registered On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {students.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-white">{stu.full_name}</div>
                        <div className="text-[10px] text-slate-400">{stu.email}</div>
                      </td>
                      <td className="p-3 font-mono text-indigo-300 font-semibold">{stu.roll_number}</td>
                      <td className="p-3 font-bold text-emerald-400">{stu.cgpa.toFixed(2)}</td>
                      <td className="p-3">{stu.branch || "N/A"}</td>
                      <td className="p-3 font-semibold text-slate-200">{stu.graduation_year}</td>
                      <td className="p-3">
                        {stu.resume_url ? (
                          <a
                            href={stu.resume_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 font-medium underline"
                          >
                            View PDF
                          </a>
                        ) : (
                          <span className="text-slate-500">Not Uploaded</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                          {stu.applications_count} applied
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(stu.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {students.length} of {studentTotal} registered student(s) &bull; Page {studentPage} of{" "}
                  {studentTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                    disabled={studentPage <= 1}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                    disabled={studentPage >= studentTotalPages}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Recruiter Onboarding Approvals */}
      {activeTab === "VETTING" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Recruiter Company Staging Queue</h2>
          {pendingRecruiters.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              ✓ All recruiter registrations have been processed. Queue is clear!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRecruiters.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-white text-base">{rec.company_name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        PENDING
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-2 space-y-1">
                      <div>
                        HR Contact: <strong>{rec.hr_name}</strong>
                      </div>
                      <div>
                        Email: <span className="text-indigo-400">{rec.email}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Registered {new Date(rec.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex space-x-2">
                    <button
                      onClick={() => handleApproveRecruiter(rec.id)}
                      className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRejectRecruiter(rec.id)}
                      className="w-1/2 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all"
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
          <h2 className="text-lg font-bold text-white">Job Drive Vetting & Feedback Loop</h2>
          {pendingJobs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              ✓ No pending job postings requiring administrative review.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white text-base">{job.title}</h3>
                        <div className="text-xs font-semibold text-indigo-400">{job.company_name}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        PENDING_APPROVAL
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 line-clamp-3">{job.description}</p>

                    <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                      <div>
                        Min CGPA Required: <strong className="text-white">{job.min_cgpa.toFixed(1)}</strong>
                      </div>
                      <div>
                        Target Departments:{" "}
                        <strong className="text-white">
                          {job.allowed_branches?.length ? job.allowed_branches.join(", ") : "All"}
                        </strong>
                      </div>
                      <div>
                        Target Batches:{" "}
                        <strong className="text-white">
                          {job.allowed_graduation_years?.length ? job.allowed_graduation_years.join(", ") : "All"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex space-x-2">
                    <button
                      onClick={() => handleApproveJob(job.id)}
                      className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      ✓ Approve Post
                    </button>
                    <button
                      onClick={() => {
                        setSelectedJobForFeedback(job);
                        setFeedbackText("");
                      }}
                      className="w-1/2 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all"
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

      {/* Tab: All Companies */}
      {activeTab === "COMPANIES" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Partner Companies Directory</h2>
              <p className="text-xs text-slate-400">All registered corporate recruiting tenants on the platform.</p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <select
                value={companyStatusFilter}
                onChange={(e) => {
                  setCompanyStatusFilter(e.target.value);
                  setCompanyPage(1);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none"
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
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {companies.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No companies found matching this filter.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">HR Representative</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Drives Posted</th>
                    <th className="p-3">Onboarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{c.company_name}</td>
                      <td className="p-3 text-slate-200">{c.hr_name}</td>
                      <td className="p-3 text-indigo-300">{c.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : c.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          {c.jobs_count} drives
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {companies.length} of {companyTotal} company records &bull; Page {companyPage} of{" "}
                  {companyTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCompanyPage((p) => Math.max(1, p - 1))}
                    disabled={companyPage <= 1}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCompanyPage((p) => Math.min(companyTotalPages, p + 1))}
                    disabled={companyPage >= companyTotalPages}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
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
            <h2 className="text-lg font-bold text-white">Immutable Administrative Audit Log</h2>
            <span className="text-xs text-slate-400">Application-Level Transactional Receipts</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3">Timestamp (UTC)</th>
                  <th className="p-3">Admin Authority</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Details / Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 text-indigo-300 font-semibold">{log.admin_email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-mono text-[10px] border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-200">
                      {log.target_entity} #{log.target_id}
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Page {auditPage} of {auditTotalPages}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                  disabled={auditPage >= auditTotalPages}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-white">
            <button
              onClick={() => setSelectedJobForFeedback(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-1">Statechart Feedback Loop</h2>
            <p className="text-xs text-slate-400 mb-4">
              Transition "{selectedJobForFeedback.title}" to <strong>REQUIRES_CHANGES</strong> state and attach mandatory
              guidance for the recruiter.
            </p>

            <form onSubmit={handleSendJobFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Required Corrections Feedback</label>
                <textarea
                  required
                  rows="4"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g. Please clarify department eligibility for Electronics students..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForFeedback(null)}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg"
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
