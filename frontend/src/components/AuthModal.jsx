import React, { useState } from "react";
import { api, setStoredToken, setStoredUser } from "../api";

export function AuthModal({ isOpen, onClose, initialMode = "LOGIN", onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // LOGIN or REGISTER
  const [role, setRole] = useState("STUDENT"); // STUDENT, RECRUITER, ADMIN
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-1">
          {mode === "LOGIN" ? "Sign In to Placement Portal" : "Create Entity Account"}
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Stateless JWT Authentication with Role-Based Access Control (RBAC).
        </p>

        {/* Tab Switcher: Login vs Register */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => { setMode("LOGIN"); setError(""); }}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === "LOGIN" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("REGISTER"); setError(""); }}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === "REGISTER" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        {/* Role Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1">Select Role Context</label>
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
                className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                  role === r.id
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                } ${mode === "REGISTER" && r.id === "ADMIN" ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {mode === "REGISTER" && role === "ADMIN" && (
            <p className="text-[11px] text-amber-400 mt-1">Admin accounts are pre-seeded or provisioned by lead authorities.</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "ADMIN" ? "admin@placement.edu" : "user@example.com"}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Registration Fields */}
          {mode === "REGISTER" && role === "STUDENT" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="CS2026_010"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Batch Year</label>
                  <input
                    type="number"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Resume Link (HttpUrl)</label>
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {mode === "REGISTER" && role === "RECRUITER" && (
            <>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Company / Organization</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp Global"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Lead HR Representative</label>
                <input
                  type="text"
                  required
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                Note: Recruiter accounts begin in <strong>PENDING</strong> state. An admin must verify your company before job creation is unlocked.
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all text-white disabled:opacity-50"
          >
            {loading ? "Processing..." : mode === "LOGIN" ? `Sign In as ${role}` : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
