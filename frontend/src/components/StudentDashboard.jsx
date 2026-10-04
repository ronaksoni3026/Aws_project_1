import React, { useState, useEffect } from "react";
import { api } from "../api";

export function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("JOBS"); // JOBS, APPLICATIONS, PROFILE
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ type: "", text: "" });

  // Profile Edit State
  const [cgpa, setCgpa] = useState("");
  const [branch, setBranch] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [profData, jobsData, appsData] = await Promise.all([
        api.getStudentProfile(),
        api.getStudentJobs(),
        api.getStudentApplications(),
      ]);
      setProfile(profData);
      setCgpa(profData.cgpa);
      setBranch(profData.branch);
      setGradYear(profData.graduation_year);
      setResumeUrl(profData.resume_url || "");
      setJobs(jobsData);
      setApplications(appsData);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setActionMsg({ type: "", text: "" });
    try {
      const updated = await api.updateStudentProfile({
        cgpa: parseFloat(cgpa) || 0.0,
        branch,
        graduation_year: parseInt(gradYear) || 2026,
        resume_url: resumeUrl || null,
      });
      setProfile(updated);
      setActionMsg({ type: "success", text: "Profile updated successfully! Re-evaluating job eligibility..." });
      // Refresh jobs to show recomputed eligibility
      const updatedJobs = await api.getStudentJobs();
      setJobs(updatedJobs);
    } catch (err) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleApply = async (jobId) => {
    setActionMsg({ type: "", text: "" });
    try {
      await api.applyJob(jobId);
      setActionMsg({ type: "success", text: "Application submitted successfully to ATS pipeline!" });
      loadAllData();
    } catch (err) {
      // Check if it's structured HTTP 422 eligibility engine rejection
      if (err.data && err.data.detail && err.data.detail.reasons) {
        setActionMsg({
          type: "error",
          text: `Application Blocked by Server Eligibility Gatekeeper:\n- ${err.data.detail.reasons.join("\n- ")}`,
        });
      } else {
        setActionMsg({ type: "error", text: err.message });
      }
    }
  };

  const appliedJobIds = new Set(applications.map((a) => a.job_id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner / Student Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Student Applicant Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Roll Number: <span className="text-indigo-400 font-mono">{profile?.roll_number}</span> |
            Live CGPA: <span className="text-emerald-400 font-bold">{profile?.cgpa}</span> |
            Branch: <span className="text-sky-400 font-semibold">{profile?.branch}</span> |
            Batch: <span className="text-purple-400 font-semibold">{profile?.graduation_year}</span>
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex space-x-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("JOBS")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "JOBS" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Smart Job Board ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("APPLICATIONS")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "APPLICATIONS" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            My Applications ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab("PROFILE")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "PROFILE" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Academic Profile
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

      {/* Tab: Smart Job Board */}
      {activeTab === "JOBS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Active Campus Recruitment Drives</h2>
            <span className="text-xs text-slate-400">Server-Side Eligibility Gating Enabled</span>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              No active job postings found at this moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => {
                const hasApplied = appliedJobIds.has(job.id);
                return (
                  <div
                    key={job.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-white text-base leading-snug">{job.title}</h3>
                          <div className="text-xs font-semibold text-indigo-400 mt-0.5">{job.company_name}</div>
                        </div>

                        {/* Real-time Server-Side Eligibility Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            job.is_eligible
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {job.is_eligible ? "✓ Eligible" : "⚠ Ineligible"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-3 line-clamp-3">{job.description}</p>

                      {/* Criteria Constraints */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          Min CGPA: <strong className="text-white">{job.min_cgpa.toFixed(1)}</strong>
                        </span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          Branches:{" "}
                          <strong className="text-white">
                            {job.allowed_branches?.length ? job.allowed_branches.join(", ") : "All"}
                          </strong>
                        </span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                          Batches:{" "}
                          <strong className="text-white">
                            {job.allowed_graduation_years?.length ? job.allowed_graduation_years.join(", ") : "All"}
                          </strong>
                        </span>
                      </div>

                      {/* If ineligible, show server feedback explanation */}
                      {!job.is_eligible && job.reasons && job.reasons.length > 0 && (
                        <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90">
                          <div className="font-semibold text-amber-300 mb-1">Eligibility Criteria Unmet:</div>
                          <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                            {job.reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        Posted {new Date(job.created_at).toLocaleDateString()}
                      </span>

                      {hasApplied ? (
                        <span className="text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-lg">
                          ✓ Application Submitted
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(job.id)}
                          disabled={!job.is_eligible}
                          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                            job.is_eligible
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                              : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                          }`}
                          title={job.is_eligible ? "Submit application" : "Blocked by eligibility gatekeeper"}
                        >
                          {job.is_eligible ? "Apply for Role" : "Criteria Not Met"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Applications */}
      {activeTab === "APPLICATIONS" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Application Macro-Funnel Tracker</h2>
          {applications.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              You have not submitted applications to any position yet.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Position Title</th>
                    <th className="p-3.5">Organization</th>
                    <th className="p-3.5">Applied Timestamp</th>
                    <th className="p-3.5">ATS Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">{app.job_title}</td>
                      <td className="p-3.5 text-indigo-300">{app.company_name}</td>
                      <td className="p-3.5 text-slate-400">{new Date(app.applied_at).toLocaleString()}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            app.status === "OFFERED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : app.status === "SHORTLISTED"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : app.status === "UNDER_REVIEW"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                              : app.status === "REJECTED"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-slate-700 text-slate-300 border border-slate-600"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Academic Profile */}
      {activeTab === "PROFILE" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl">
          <h2 className="text-lg font-bold text-white mb-1">Academic Profile Management</h2>
          <p className="text-xs text-slate-400 mb-4">
            Changes here directly influence server-side eligibility checks across the smart job board.
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cumulative GPA (0.0 - 10.0)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Department / Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. CSE, ECE, Mechanical, IT"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Graduation Batch Year</label>
              <input
                type="number"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Resume Link (HttpUrl Format)</label>
              <input
                type="url"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://drive.google.com/resume.pdf"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Validated server-side using Pydantic HttpUrl to prevent security injection attacks.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {savingProfile ? "Saving Profile..." : "Save Academic Profile"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
