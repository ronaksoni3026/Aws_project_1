import React from "react";

export function NotificationCenter({ isOpen, onClose, notifications, onMarkRead }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md h-full max-h-[90vh] rounded-2xl p-6 shadow-2xl relative text-white flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Student Alert Inbox</h2>
            <p className="text-[11px] text-slate-400">FastAPI Asynchronous Background Observer Alerts</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center text-slate-500 py-12 text-xs">
              No alerts in your inbox.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  notif.is_read
                    ? "bg-slate-800/40 border-slate-800 text-slate-400"
                    : "bg-indigo-950/20 border-indigo-500/40 text-slate-200 shadow"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-white">{notif.title}</div>
                  {!notif.is_read && (
                    <button
                      onClick={() => onMarkRead(notif.id)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1 text-slate-300">{notif.message}</p>
                <div className="text-[10px] text-slate-500 mt-2">
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
