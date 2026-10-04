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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Recruiter Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{profile?.company_name || user.name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Recruiter Portal | HR Representative: <strong className="text-white">{profile?.hr_name}</strong> | Account Status:{" "}
            <span
              className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
                profile?.status === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {profile?.status}
            </span>
          </p>
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
          className={`py-2 px-4 rounded-xl text-xs font-bold shadow-lg transition-all ${
            isPending
              ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
          }`}
        >
          + Draft New Position
        </button>
      </div>

      {/* Admin Staging Gating Alert */}
      {isPending && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center space-x-3 text-amber-300 text-xs">
          <span className="text-lg">⏳</span>
          <div>
            <strong>Account Pending Administrative Verification:</strong> Your recruiter account has been registered
            and placed in the Placement Cell staging queue. Job creation and publishing endpoints are locked with HTTP
            403 until approved by an administrator.
          </div>
        </div>
      )}

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

      {/* Main Grid: Left Job List, Right ATS Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Pipeline Management */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Your Job Drives ({jobs.length})</h2>

          {jobs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              No jobs drafted yet. Click "+ Draft New Position" above to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => { setSelectedJob(job); setAtsPage(1); }}
                    className={`bg-slate-900 border rounded-2xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-slate-800/60 shadow-lg shadow-indigo-500/10"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm">{job.title}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          job.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : job.status === "PENDING_APPROVAL"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : job.status === "REQUIRES_CHANGES"
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            : job.status === "CLOSED"
                            ? "bg-slate-700 text-slate-400 border-slate-600"
                            : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{job.description}</p>

                    {/* Criteria Snippet */}
                    <div className="text-[10px] text-slate-400 mt-2">
                      CGPA &ge; {job.min_cgpa.toFixed(1)} | {job.allowed_branches?.join(", ") || "All"}
                    </div>

                    {/* Admin Feedback Loop Callout */}
                    {job.status === "REQUIRES_CHANGES" && job.admin_feedback && (
                      <div className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-300">
                        <strong>Admin Feedback:</strong> {job.admin_feedback}
                      </div>
                    )}

                    {/* State Transitions Toolbar */}
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between gap-1 text-[11px]">
                      {(job.status === "DRAFT" || job.status === "REQUIRES_CHANGES") && (
                        <div className="flex space-x-1">
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
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitForApproval(job.id);
                            }}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-bold"
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
                          className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 rounded font-semibold"
                        >
                          Close Pipeline
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded ml-auto"
                        title="Soft delete with background applicant notification"
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
              <h2 className="text-lg font-bold text-white">Applicant Tracking System (ATS) Pipeline</h2>
              {selectedJob && (
                <p className="text-xs text-indigo-400 font-medium">Viewing candidates for: {selectedJob.title}</p>
              )}
            </div>

            {/* Batch Action Toolbar */}
            {selectedJob && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">
                  {selectedAppIds.length} candidate(s) selected
                </span>
                <button
                  onClick={() => handleBatchUpdate("SHORTLISTED")}
                  disabled={selectedAppIds.length === 0 || batchLoading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg disabled:opacity-40"
                >
                  Shortlist All
                </button>
                <button
                  onClick={() => handleBatchUpdate("OFFERED")}
                  disabled={selectedAppIds.length === 0 || batchLoading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-40"
                >
                  Offer All
                </button>
                <button
                  onClick={() => handleBatchUpdate("REJECTED")}
                  disabled={selectedAppIds.length === 0 || batchLoading}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg disabled:opacity-40"
                >
                  Reject All
                </button>
              </div>
            )}
          </div>

          {/* Filters Bar */}
          {selectedJob && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-slate-400">Filter Applicants:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setAtsPage(1); }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none"
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
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-white focus:outline-none placeholder-slate-500"
              />

              <span className="ml-auto text-slate-400">Total Applicants: {atsTotal}</span>
            </div>
          )}

          {/* ATS Data Table */}
          {!selectedJob ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              Select a job drive on the left to inspect applicant candidates.
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No applicants found matching this filter criteria.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={selectedAppIds.length === applications.length && applications.length > 0}
                        className="rounded border-slate-700"
                      />
                    </th>
                    <th className="p-3">Applicant Name</th>
                    <th className="p-3">CGPA</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Resume</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {applications.map((app) => {
                    const isChecked = selectedAppIds.includes(app.id);
                    return (
                      <tr key={app.id} className={`hover:bg-slate-800/40 ${isChecked ? "bg-indigo-950/20" : ""}`}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOne(app.id)}
                            className="rounded border-slate-700"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{app.student?.full_name || "Applicant"}</div>
                          <div className="text-[10px] text-slate-400">{app.student?.roll_number}</div>
                        </td>
                        <td className="p-3 font-semibold text-emerald-400">{app.student?.cgpa.toFixed(2)}</td>
                        <td className="p-3">{app.student?.branch}</td>
                        <td className="p-3">
                          {app.student?.resume_url ? (
                            <a
                              href={app.student.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 underline font-medium"
                            >
                              View PDF
                            </a>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.status === "OFFERED"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : app.status === "SHORTLISTED"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : app.status === "UNDER_REVIEW"
                                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                                : app.status === "REJECTED"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {atsPage} of {atsTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setAtsPage((p) => Math.max(1, p - 1))}
                    disabled={atsPage <= 1}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setAtsPage((p) => Math.min(atsTotalPages, p + 1))}
                    disabled={atsPage >= atsTotalPages}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative text-white">
            <button
              onClick={() => { setIsCreatingJob(false); setEditingJob(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-1">
              {editingJob ? "Edit Job Specifications" : "Targeted Job Creator"}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Configure hard rules and server-side eligibility parameters.
            </p>

            <form onSubmit={handleSaveJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems Engineer"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role Description</label>
                <textarea
                  required
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Responsibilities, requirements, technology stack..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Min CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={minCgpa}
                    onChange={(e) => setMinCgpa(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Allowed Batches</label>
                  <input
                    type="text"
                    value={allowedYears}
                    onChange={(e) => setAllowedYears(e.target.value)}
                    placeholder="2025, 2026"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Allowed Branches (comma separated)
                </label>
                <input
                  type="text"
                  value={allowedBranches}
                  onChange={(e) => setAllowedBranches(e.target.value)}
                  placeholder="CSE, ECE, IT, Mechanical"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave empty to open to all university branches.</p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreatingJob(false); setEditingJob(null); }}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg"
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
