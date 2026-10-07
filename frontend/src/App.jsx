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

  const [authRole, setAuthRole] = useState("STUDENT");

  const openAuthWithRole = (mode, targetRole) => {
    setAuthModalMode(mode);
    setAuthRole(targetRole);
    setAuthModalOpen(true);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-blue-600">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={(mode) => openAuthWithRole(mode, "STUDENT")}
        notificationCount={unreadCount}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onQuickLogin={handleQuickLogin}
      />

      <main className="flex-1 flex flex-col">
        {!user ? (
          /* Institutional Landing Hero & Three Role Login Cards */
          <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto w-full space-y-10">
              {/* Tagline / Headline at the top */}
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Campus Placement &amp; Internship Portal
                </h1>
                <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
                  Centralized gateway for academic placement drives, corporate internships, and recruitment governance.
                </p>
              </div>

              {/* Three separate login cards: Responsive row on desktop, stacked on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {/* 1. Student Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Student</h2>
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">Undergraduate &amp; Postgraduate Candidates</p>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Access campus placement drives, verify real-time academic eligibility, and track your job applications.
                    </p>
                  </div>
                  <div className="mt-8 space-y-2.5">
                    <button
                      onClick={() => openAuthWithRole("LOGIN", "STUDENT")}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors text-center"
                    >
                      Student Login
                    </button>
                    <button
                      onClick={() => openAuthWithRole("REGISTER", "STUDENT")}
                      className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors text-center"
                    >
                      New Student Registration
                    </button>
                  </div>
                </div>

                {/* 2. Company / Recruiter Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Company / Recruiter</h2>
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5">Corporate Talent Acquisition</p>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Post placement drives, evaluate applicant profiles, schedule interviews, and manage candidate selections.
                    </p>
                  </div>
                  <div className="mt-8 space-y-2.5">
                    <button
                      onClick={() => openAuthWithRole("LOGIN", "RECRUITER")}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors text-center"
                    >
                      Recruiter Login
                    </button>
                    <button
                      onClick={() => openAuthWithRole("REGISTER", "RECRUITER")}
                      className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors text-center"
                    >
                      Register Organization
                    </button>
                  </div>
                </div>

                {/* 3. Administrator Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Administrator</h2>
                      <p className="text-xs text-purple-600 font-semibold mt-0.5">Placement Cell &amp; Governance</p>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Oversee placement cell operations, vet company registrations, manage eligibility criteria, and generate reports.
                    </p>
                  </div>
                  <div className="mt-8 space-y-2.5">
                    <button
                      onClick={() => openAuthWithRole("LOGIN", "ADMIN")}
                      className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors text-center"
                    >
                      Administrator Login
                    </button>
                    <button
                      onClick={() => handleQuickLogin("admin@placement.edu", "Admin@1234", "ADMIN")}
                      className="w-full py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs rounded-lg border border-purple-200 transition-colors text-center"
                    >
                      Demo Admin Login
                    </button>
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
        initialRole={authRole}
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
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Campus Placement &amp; Internship Portal &bull; Directorate of Training &amp; Placement</span>
          <span className="text-slate-400 font-mono text-[11px]">Institutional Portal &bull; Active Session</span>
        </div>
      </footer>
    </div>
  );
}
