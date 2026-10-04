import React from "react";

export function Navbar({ user, onLogout, onOpenAuth, notificationCount, onOpenNotifications, onQuickLogin }) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/30">
            CP
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Campus Placement Portal
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
              RBAC v1.0
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {/* Notification Bell for Students */}
              {user.role === "STUDENT" && (
                <button
                  onClick={onOpenNotifications}
                  className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Notifications & Background Alerts"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-500 text-white font-bold text-[10px] rounded-full animate-pulse">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Identity Chip */}
              <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white leading-tight">{user.name || user.email}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{user.email}</div>
                </div>

                {/* Role Claim Badge */}
                <span
                  className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    user.role === "ADMIN"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : user.role === "RECRUITER"
                      ? user.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  }`}
                >
                  {user.role} {user.role === "RECRUITER" && `(${user.status || "PENDING"})`}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors border border-rose-500/30"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              {/* Quick Demo Switcher Buttons */}
              <button
                onClick={() => onQuickLogin("admin@placement.edu", "Admin@1234", "ADMIN")}
                className="text-xs px-2.5 py-1.5 rounded bg-purple-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-600/50"
              >
                Demo Admin
              </button>
              <button
                onClick={() => onOpenAuth("LOGIN")}
                className="text-xs font-bold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-md transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
