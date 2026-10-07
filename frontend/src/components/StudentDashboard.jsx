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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);

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

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchTerm ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEligible = !filterEligibleOnly || job.is_eligible;
    return matchesSearch && matchesEligible;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Student Profile Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {user.name || "Student Applicant"}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Candidate
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2 font-mono">
            <span>Roll No: <strong className="text-slate-900">{profile?.roll_number || "N/A"}</strong></span>
            <span>&bull;</span>
            <span>Department: <strong className="text-slate-900">{profile?.branch || "N/A"}</strong></span>
            <span>&bull;</span>
            <span>CGPA: <strong className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">{profile?.cgpa !== undefined ? Number(profile.cgpa).toFixed(2) : "0.00"}</strong></span>
            <span>&bull;</span>
            <span>Batch: <strong className="text-slate-900">{profile?.graduation_year || "N/A"}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {profile?.resume_url && (
            <a
              href={profile.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              View Resume
            </a>
          )}
          <button
            onClick={() => setActiveTab("PROFILE")}
            className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("JOBS")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "JOBS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Placement Drives ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab("APPLICATIONS")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "APPLICATIONS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          My Applications ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "PROFILE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Academic Profile
        </button>
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

      {/* Tab: Placement Drives */}
      {activeTab === "JOBS" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <input
                type="text"
                placeholder="Search by company, role or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer self-start sm:self-center">
              <input
                type="checkbox"
                checked={filterEligibleOnly}
                onChange={(e) => setFilterEligibleOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Eligible Drives Only</span>
            </label>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs">
              No placement drives found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map((job) => {
                const hasApplied = appliedJobIds.has(job.id);
                return (
                  <div
                    key={job.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">{job.title}</h3>
                          <div className="text-xs font-semibold text-blue-600 mt-0.5">{job.company_name}</div>
                        </div>

                        {/* Status Label */}
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            job.is_eligible
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {job.is_eligible ? "Eligible" : "Criteria Not Met"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-3 line-clamp-3">{job.description}</p>

                      {/* Criteria Constraints */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          Min CGPA: <strong>{job.min_cgpa.toFixed(1)}</strong>
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          Branches:{" "}
                          <strong>
                            {job.allowed_branches?.length ? job.allowed_branches.join(", ") : "All"}
                          </strong>
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          Batches:{" "}
                          <strong>
                            {job.allowed_graduation_years?.length ? job.allowed_graduation_years.join(", ") : "All"}
                          </strong>
                        </span>
                      </div>

                      {/* If ineligible, show server feedback explanation */}
                      {!job.is_eligible && job.reasons && job.reasons.length > 0 && (
                        <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                          <div className="font-semibold text-amber-900 mb-1">Eligibility Criteria Unmet:</div>
                          <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                            {job.reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Posted {new Date(job.created_at).toLocaleDateString()}
                      </span>

                      {hasApplied ? (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                          ✓ Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(job.id)}
                          disabled={!job.is_eligible}
                          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                            job.is_eligible
                              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          }`}
                        >
                          {job.is_eligible ? "Apply" : "Not Eligible"}
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Application Status Tracker</h2>
          </div>
          {applications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs">
              You have not submitted applications to any position yet.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Company</th>
                      <th className="p-3.5">Job Role</th>
                      <th className="p-3.5">Applied Date</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-semibold text-blue-600">{app.company_name}</td>
                        <td className="p-3.5 font-bold text-slate-900">{app.job_title}</td>
                        <td className="p-3.5 text-slate-500">{new Date(app.applied_at).toLocaleDateString()}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
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
                              ? "Selected"
                              : app.status === "REJECTED"
                              ? "Rejected"
                              : app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Academic Profile */}
      {activeTab === "PROFILE" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-xl">
          <h2 className="text-base font-bold text-slate-900 mb-1">Academic Profile Management</h2>
          <p className="text-xs text-slate-500 mb-5">
            Keep your credentials updated to maintain placement drive eligibility.
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cumulative GPA (0.0 - 10.0)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Academic Department / Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. CSE, ECE, Mechanical, IT"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Graduation Batch Year</label>
              <input
                type="number"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Resume Link (HttpUrl Format)</label>
              <input
                type="url"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://drive.google.com/resume.pdf"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Provide a shareable public link to your updated PDF resume.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-2.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              {savingProfile ? "Saving Profile..." : "Save Academic Profile"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
