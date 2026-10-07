import React from "react";

export function NotificationCenter({ isOpen, onClose, notifications, onMarkRead }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md h-full max-h-[90vh] rounded-2xl p-6 shadow-xl relative text-slate-800 flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notifications &amp; Alerts</h2>
            <p className="text-[11px] text-slate-500">Placement Cell &amp; Drive Status Updates</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center text-slate-400 py-12 text-xs">
              No alerts in your inbox.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  notif.is_read
                    ? "bg-slate-50 border-slate-200 text-slate-600"
                    : "bg-blue-50/60 border-blue-200 text-slate-800 shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs text-slate-900">{notif.title}</div>
                  {!notif.is_read && (
                    <button
                      onClick={() => onMarkRead(notif.id)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1 text-slate-600">{notif.message}</p>
                <div className="text-[10px] text-slate-400 mt-2">
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
