import React from "react";

export function Navbar({ user, onLogout, onOpenAuth, notificationCount, onOpenNotifications, onQuickLogin }) {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
            CP
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              Campus Placement Portal
            </span>
            {user ? (
              <span
                className={`hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  user.role === "ADMIN"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : user.role === "RECRUITER"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {user.role} WORKSPACE
              </span>
            ) : (
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Placement Cell
              </span>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {user ? (
            <>
              {/* Notification Bell for Students */}
              {user.role === "STUDENT" && (
                <button
                  onClick={onOpenNotifications}
                  className="relative p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
                  title="Notifications & Alerts"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white font-bold text-[9px] rounded-full shadow-sm">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Identity Chip */}
              <div className="flex items-center space-x-2.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{user.name || user.email}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onQuickLogin("admin@placement.edu", "Admin@1234", "ADMIN")}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
              >
                Demo Admin
              </button>
              <button
                onClick={() => onOpenAuth("LOGIN")}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
