import React, { useState, useEffect } from "react";
import { api } from "../api";

export function RecruiterDashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });

  // Job Creation Modal State
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minCgpa, setMinCgpa] = useState("7.0");
  const [allowedBranches, setAllowedBranches] = useState("CSE, ECE, IT");
  const [allowedYears, setAllowedYears] = useState("2026");

  // ATS Filters & Batch Update State
  const [atsPage, setAtsPage] = useState(1);
  const [atsLimit, setAtsLimit] = useState(20);
  const [atsTotalPages, setAtsTotalPages] = useState(1);
  const [atsTotal, setAtsTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    loadRecruiterData();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      loadJobApplications(selectedJob.id, atsPage, statusFilter, branchFilter);
    }
  }, [selectedJob, atsPage, statusFilter, branchFilter]);

  const loadRecruiterData = async () => {
    setLoading(true);
    try {
      const [profData, jobsData] = await Promise.all([
        api.getRecruiterProfile(),
        api.getRecruiterJobs(),
      ]);
      setProfile(profData);
      setJobs(jobsData);
      if (jobsData.length > 0 && !selectedJob) {
        setSelectedJob(jobsData[0]);
      }
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadJobApplications = async (jobId, page = 1, status = "", branch = "") => {
    try {
      const data = await api.getJobApplications(jobId, page, atsLimit, status, branch);
      setApplications(data.items);
      setAtsTotal(data.total);
      setAtsTotalPages(data.total_pages);
      setSelectedAppIds([]);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    setActionMsg({ type: "", text: "" });

    const branchesArray = allowedBranches
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
    const yearsArray = allowedYears
      .split(",")
      .map((y) => parseInt(y.trim()))
      .filter((y) => !isNaN(y));

    try {
      if (editingJob) {
        await api.updateJob(editingJob.id, {
          title,
          description,
          min_cgpa: parseFloat(minCgpa) || 0.0,
          allowed_branches: branchesArray,
          allowed_graduation_years: yearsArray,
        });
        setActionMsg({ type: "success", text: "Job updated successfully!" });
      } else {
        await api.createJob({
          title,
          description,
          min_cgpa: parseFloat(minCgpa) || 0.0,
          allowed_branches: branchesArray,
          allowed_graduation_years: yearsArray,
        });
        setActionMsg({ type: "success", text: "New job created in DRAFT state!" });
      }
      setIsCreatingJob(false);
      setEditingJob(null);
      loadRecruiterData();
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleSubmitForApproval = async (jobId) => {
    try {
      await api.submitJobForApproval(jobId);
      setActionMsg({ type: "success", text: "Job submitted for admin vetting (PENDING_APPROVAL)!" });
      loadRecruiterData();
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleCloseJob = async (jobId) => {
    try {
      await api.closeJob(jobId);
      setActionMsg({ type: "success", text: "Job transitioned to CLOSED state." });
      loadRecruiterData();
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Soft delete this job? Applicants will receive automated background alerts.")) return;
    try {
      const res = await api.deleteJob(jobId);
      setActionMsg({ type: "success", text: res.message });
      setSelectedJob(null);
      loadRecruiterData();
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handleBatchUpdate = async (targetStatus) => {
    if (selectedAppIds.length === 0) {
      alert("Please select at least one candidate using the checkboxes.");
      return;
    }
    setBatchLoading(true);
    setActionMsg({ type: "", text: "" });
    try {
      const res = await api.batchUpdateApplications(selectedJob.id, selectedAppIds, targetStatus);
      setActionMsg({ type: "success", text: `ACID Batch Success: ${res.message}` });
      loadJobApplications(selectedJob.id, atsPage, statusFilter, branchFilter);
    } catch (err) {
      setActionMsg({ type: "error", text: `Batch Transaction Aborted: ${err.message}` });
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAppIds(applications.map((a) => a.id));
    } else {
      setSelectedAppIds([]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isPending = profile?.status === "PENDING";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Recruiter Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {profile?.company_name || user.name || "Recruiter Workspace"}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                profile?.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {profile?.status === "ACTIVE" ? "Approved" : "Pending Approval"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
            <span>HR Representative: <strong className="text-slate-900">{profile?.hr_name || "N/A"}</strong></span>
            <span>&bull;</span>
            <span>Email: <strong className="text-slate-900 font-mono">{user.email}</strong></span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setEditingJob(null);
            setTitle("");
            setDescription("");
            setMinCgpa("7.0");
            setAllowedBranches("CSE, ECE, IT");
            setAllowedYears("2026");
            setIsCreatingJob(true);
          }}
          disabled={isPending}
          className={`py-2 px-4 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
            isPending
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          + Draft New Position
        </button>
      </div>

      {/* Admin Staging Gating Alert */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center space-x-3 text-amber-800 text-xs">
          <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong>Organization Awaiting Approval:</strong> Your recruiter account has been registered and is pending approval from the Placement Cell. Job creation and publishing will unlock once approved.
          </div>
        </div>
      )}

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

      {/* Main Grid: Left Job List, Right ATS Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Pipeline Management */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Placement Drives ({jobs.length})</h2>

          {jobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
              No placement drives drafted yet. Click "+ Draft New Position" above to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => { setSelectedJob(job); setAtsPage(1); }}
                    className={`bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-sm ${
                      isSelected
                        ? "border-blue-600 ring-1 ring-blue-600 bg-blue-50/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          job.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : job.status === "PENDING_APPROVAL"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : job.status === "REQUIRES_CHANGES"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : job.status === "CLOSED"
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {job.status === "PENDING_APPROVAL"
                          ? "Pending Approval"
                          : job.status === "REQUIRES_CHANGES"
                          ? "Changes Requested"
                          : job.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{job.description}</p>

                    {/* Criteria Snippet */}
                    <div className="text-[10px] text-slate-500 mt-2 font-mono">
                      CGPA &ge; {job.min_cgpa.toFixed(1)} | {job.allowed_branches?.join(", ") || "All Branches"}
                    </div>

                    {/* Admin Feedback Loop Callout */}
                    {job.status === "REQUIRES_CHANGES" && job.admin_feedback && (
                      <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
                        <strong>Placement Cell Note:</strong> {job.admin_feedback}
                      </div>
                    )}

                    {/* State Transitions Toolbar */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                      {(job.status === "DRAFT" || job.status === "REQUIRES_CHANGES") && (
                        <div className="flex space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingJob(job);
                              setTitle(job.title);
                              setDescription(job.description);
                              setMinCgpa(job.min_cgpa.toString());
                              setAllowedBranches(job.allowed_branches?.join(", ") || "");
                              setAllowedYears(job.allowed_graduation_years?.join(", ") || "");
                              setIsCreatingJob(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium border border-slate-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitForApproval(job.id);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold transition-colors"
                          >
                            Submit
                          </button>
                        </div>
                      )}

                      {job.status === "ACTIVE" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseJob(job.id);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-medium transition-colors"
                        >
                          Close Drive
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded ml-auto transition-colors"
                        title="Archive placement drive"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: ATS Applicant Tracking System */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Applicant Tracking System</h2>
              {selectedJob && (
                <p className="text-xs text-blue-600 font-medium">Viewing candidates for: {selectedJob.title}</p>
              )}
            </div>

            {/* Batch Action Toolbar */}
            {selectedJob && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">
                  {selectedAppIds.length} selected
                </span>
                <button
                  onClick={() => handleBatchUpdate("SHORTLISTED")}
                  disabled={selectedAppIds.length === 0 || batchLoading}
                  className="px-2.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-semibold text-xs rounded-lg disabled:opacity-40 transition-colors"
                >
                  Shortlist
                </button>
                <button
                  onClick={() => handleBatchUpdate("OFFERED")}
                  disabled={selectedAppIds.length === 0 || batchLoading}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-semibold text-xs rounded-lg disabled:opacity-40 transition-colors"
                >
                  Select / Offer
                </button>
                <button
                  onClick={() => handleBatchUpdate("REJECTED")}
                  disabled={selectedAppIds.length === 0 || batchLoading}
                  className="px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold text-xs rounded-lg disabled:opacity-40 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>

          {/* Filters Bar */}
          {selectedJob && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs shadow-sm">
              <span className="font-medium text-slate-600">Filters:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setAtsPage(1); }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="">All ATS Stages</option>
                <option value="APPLIED">Applied</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="OFFERED">Offered</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <input
                type="text"
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setAtsPage(1); }}
                placeholder="Filter by branch (e.g. CSE)"
                className="bg-white border border-slate-300 rounded-lg px-3 py-1 text-slate-800 focus:outline-none focus:border-blue-600 placeholder-slate-400"
              />

              <span className="ml-auto text-slate-500">Total Applicants: <strong>{atsTotal}</strong></span>
            </div>
          )}

          {/* ATS Data Table */}
          {!selectedJob ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-sm">
              Select a placement drive on the left to inspect applicant candidates.
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-sm">
              No applicants found matching this filter criteria.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={selectedAppIds.length === applications.length && applications.length > 0}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Roll No.</th>
                      <th className="p-3">CGPA</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Resume</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => {
                      const isChecked = selectedAppIds.includes(app.id);
                      return (
                        <tr key={app.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? "bg-blue-50/40" : ""}`}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(app.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            {app.student?.full_name || "Applicant"}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {app.student?.roll_number}
                          </td>
                          <td className="p-3 font-bold text-emerald-700">
                            {app.student?.cgpa !== undefined ? Number(app.student.cgpa).toFixed(2) : "N/A"}
                          </td>
                          <td className="p-3 text-slate-600">{app.student?.branch}</td>
                          <td className="p-3">
                            {app.student?.resume_url ? (
                              <a
                                href={app.student.resume_url}
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
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                app.status === "OFFERED" || app.status === "SELECTED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : app.status === "SHORTLISTED" || app.status === "INTERVIEW_SCHEDULED"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : app.status === "UNDER_REVIEW"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : app.status === "REJECTED"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {app.status === "UNDER_REVIEW"
                                ? "Under Review"
                                : app.status === "SHORTLISTED"
                                ? "Shortlisted"
                                : app.status === "OFFERED"
                                ? "Offered"
                                : app.status === "REJECTED"
                                ? "Rejected"
                                : app.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Page {atsPage} of {atsTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setAtsPage((p) => Math.max(1, p - 1))}
                    disabled={atsPage <= 1}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setAtsPage((p) => Math.min(atsTotalPages, p + 1))}
                    disabled={atsPage >= atsTotalPages}
                    className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Job Draft / Edit */}
      {isCreatingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-xl relative text-slate-800">
            <button
              onClick={() => { setIsCreatingJob(false); setEditingJob(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {editingJob ? "Edit Placement Drive" : "Create Placement Drive"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Specify job details and candidate eligibility thresholds.
            </p>

            <form onSubmit={handleSaveJob} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Graduate Software Engineer"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role Description</label>
                <textarea
                  required
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Responsibilities, requirements, technology stack..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Min CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={minCgpa}
                    onChange={(e) => setMinCgpa(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Allowed Batches</label>
                  <input
                    type="text"
                    value={allowedYears}
                    onChange={(e) => setAllowedYears(e.target.value)}
                    placeholder="2025, 2026"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Allowed Branches (comma separated)
                </label>
                <input
                  type="text"
                  value={allowedBranches}
                  onChange={(e) => setAllowedBranches(e.target.value)}
                  placeholder="CSE, ECE, IT, Mechanical"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to open to all departments.</p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreatingJob(false); setEditingJob(null); }}
                  className="w-1/2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {editingJob ? "Save Changes" : "Save as Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
