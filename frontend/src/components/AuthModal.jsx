import React, { useState } from "react";
import { api, setStoredToken, setStoredUser } from "../api";

export function AuthModal({ isOpen, onClose, initialMode = "LOGIN", initialRole = "STUDENT", onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // LOGIN or REGISTER
  const [role, setRole] = useState(initialRole); // STUDENT, RECRUITER, ADMIN
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync role and mode whenever opened or props change
  React.useEffect(() => {
    setMode(initialMode);
    setRole(initialRole);
    setError("");
  }, [isOpen, initialMode, initialRole]);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [cgpa, setCgpa] = useState("8.5");
  const [branch, setBranch] = useState("CSE");
  const [gradYear, setGradYear] = useState("2026");
  const [resumeUrl, setResumeUrl] = useState("https://drive.google.com/my_resume.pdf");

  // Recruiter fields
  const [companyName, setCompanyName] = useState("");
  const [hrName, setHrName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let authResponse;
      if (mode === "LOGIN") {
        authResponse = await api.login({ email, password, role });
      } else {
        if (role === "STUDENT") {
          authResponse = await api.registerStudent({
            email,
            password,
            full_name: fullName,
            roll_number: rollNumber,
            cgpa: parseFloat(cgpa) || 0.0,
            branch,
            graduation_year: parseInt(gradYear) || 2026,
            resume_url: resumeUrl || null,
          });
        } else if (role === "RECRUITER") {
          authResponse = await api.registerRecruiter({
            email,
            password,
            company_name: companyName,
            hr_name: hrName,
          });
        }
      }

      setStoredToken(authResponse.access_token);
      setStoredUser({
        id: authResponse.user_id,
        email: authResponse.email,
        name: authResponse.name,
        role: authResponse.role,
        status: authResponse.status,
      });

      onAuthSuccess({
        id: authResponse.user_id,
        email: authResponse.email,
        name: authResponse.name,
        role: authResponse.role,
        status: authResponse.status,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-xl relative text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {mode === "LOGIN" ? "Sign In to Placement Portal" : "Create Account"}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Stateless JWT Authentication with Role-Based Access Control (RBAC).
        </p>

        {/* Tab Switcher: Login vs Register */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => { setMode("LOGIN"); setError(""); }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "LOGIN" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("REGISTER"); setError(""); }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "REGISTER" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Register
          </button>
        </div>

        {/* Role Selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Role Context</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "STUDENT", label: "Student" },
              { id: "RECRUITER", label: "Recruiter" },
              { id: "ADMIN", label: "Admin" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                disabled={mode === "REGISTER" && r.id === "ADMIN"}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  role === r.id
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                } ${mode === "REGISTER" && r.id === "ADMIN" ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {mode === "REGISTER" && role === "ADMIN" && (
            <p className="text-[11px] text-amber-700 mt-1">Admin accounts are pre-seeded or provisioned by institutional authorities.</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "ADMIN" ? "admin@placement.edu" : "user@example.com"}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Registration Fields */}
          {mode === "REGISTER" && role === "STUDENT" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="CS2026_010"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CGPA</label>
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Batch Year</label>
                  <input
                    type="number"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Resume Link (HttpUrl)</label>
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </>
          )}

          {mode === "REGISTER" && role === "RECRUITER" && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp Global"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lead HR Representative</label>
                <input
                  type="text"
                  required
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                Note: Recruiter accounts begin in <strong>PENDING</strong> state. An administrator must verify your company before drive creation is unlocked.
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : mode === "LOGIN" ? `Sign In as ${role}` : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
