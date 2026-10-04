import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { AuthModal } from "./components/AuthModal";
import { StudentDashboard } from "./components/StudentDashboard";
import { RecruiterDashboard } from "./components/RecruiterDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { NotificationCenter } from "./components/NotificationCenter";
import {
  api,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  removeStoredToken,
} from "./api";

export function App() {
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("LOGIN");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate session from localStorage
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setUser(storedUser);
      if (storedUser.role === "STUDENT") {
        fetchStudentNotifications();
      }
    }
    setLoading(false);
  }, []);

  const fetchStudentNotifications = async () => {
    try {
      const data = await api.getStudentNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const handleLogout = () => {
    removeStoredToken();
    setUser(null);
    setNotifications([]);
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (authenticatedUser.role === "STUDENT") {
      fetchStudentNotifications();
    }
  };

  const handleQuickLogin = async (email, password, role) => {
    try {
      const res = await api.login({ email, password, role });
      setStoredToken(res.access_token);
      const userData = {
        id: res.user_id,
        email: res.email,
        name: res.name,
        role: res.role,
        status: res.status,
      };
      setStoredUser(userData);
      setUser(userData);
      if (userData.role === "STUDENT") {
        fetchStudentNotifications();
      }
    } catch (err) {
      alert(`Quick Login Failed: ${err.message}`);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400">
        <div className="animate-spin text-3xl">⚙</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
        notificationCount={unreadCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onQuickLogin={handleQuickLogin}
      />

      <main className="flex-1">
        {!user ? (
          /* Landing Hero & Quick Role Launchpad */
          <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-8">
            <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              Institutional Placement Architecture &bull; Strict RBAC &bull; ACID ATS Pipeline
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Enterprise Role-Based <br />
              <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                Campus Placement Portal
              </span>
            </h1>

            <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
              Automating the campus recruitment lifecycle with physical table isolation, server-side eligibility gating,
              statechart workflow validation, asynchronous soft-delete notification dispatches, and immutable audit trails.
            </p>

            {/* Quick Demo Login Cards */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {/* Student Card */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl hover:border-sky-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center mb-3">
                    🎓
                  </div>
                  <h3 className="font-bold text-white text-base">Student Applicant</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage academic metrics, discover active jobs, inspect real-time eligibility checks, and track application funnels.
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => {
                      setAuthModalMode("REGISTER");
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Register as Student
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode("LOGIN");
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Sign In
                  </button>
                </div>
              </div>

              {/* Recruiter Card */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mb-3">
                    🏢
                  </div>
                  <h3 className="font-bold text-white text-base">Company Recruiter</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Draft job requirements, submit for admin vetting, manage ATS candidate table with ACID multi-select batch updates.
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => {
                      setAuthModalMode("REGISTER");
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Register as Recruiter
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode("LOGIN");
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Sign In
                  </button>
                </div>
              </div>

              {/* Admin Card */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl hover:border-purple-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center mb-3">
                    🛡️
                  </div>
                  <h3 className="font-bold text-white text-base">Placement Cell Admin</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Vet recruiter accounts, review job drafts with feedback loop, inspect live KPIs, and review immutable audit logs.
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => handleQuickLogin("admin@placement.edu", "Admin@1234", "ADMIN")}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Sign In as Default Admin
                  </button>
                  <div className="text-[10px] text-slate-500 text-center">
                    admin@placement.edu / Admin@1234
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : user.role === "STUDENT" ? (
          <StudentDashboard user={user} />
        ) : user.role === "RECRUITER" ? (
          <RecruiterDashboard user={user} />
        ) : user.role === "ADMIN" ? (
          <AdminDashboard user={user} />
        ) : null}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Student Notifications Modal */}
      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        Institutional Campus Placement Portal &bull; FastAPI + React + PostgreSQL Architecture
      </footer>
    </div>
  );
}
