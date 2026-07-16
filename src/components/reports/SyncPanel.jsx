import { useState } from "react";
import { RefreshCw, Globe, AlertTriangle, CheckCircle2, Loader2, Key } from "lucide-react";

// Custom Facebook SVG
function FacebookIcon({ size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export default function SyncPanel() {
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [target, setTarget] = useState(null); // "facebook" | "visayan"
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success" | "error", message, details }

  const handleOpenSync = (syncTarget) => {
    setTarget(syncTarget);
    setShowPasscodeModal(true);
    setStatus(null);
  };

  const handleSyncSubmit = async () => {
    const expectedPasscode = import.meta.env.VITE_ADMIN_PASSCODE || "admin123";
    if (passcode !== expectedPasscode) {
      setStatus({ type: "error", message: "Access Denied: Incorrect admin passcode!" });
      setShowPasscodeModal(false);
      setPasscode("");
      return;
    }

    setShowPasscodeModal(false);
    setPasscode("");
    setSyncing(true);
    setStatus(null);

    const url = target === "facebook" ? "/api/sync/facebook" : "/api/sync/visayan";
    const label = target === "facebook" ? "Facebook Scraper" : "Visayan Electric Scraper";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode: expectedPasscode }), // Send actual passcode to verify server-side
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({
          type: "success",
          message: `${label} synchronized successfully.`,
          details: `Elapsed: ${(data.duration / 1000).toFixed(1)}s\n\n${data.output}`,
        });
      } else {
        setStatus({
          type: "error",
          message: `Failed to sync ${label}.`,
          details: data.output || data.error || "An unknown error occurred.",
        });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: `Network/server error while syncing ${label}.`,
        details: err.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-[#1E293B] border border-white/5 rounded-2xl p-5 mb-6 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-spark-white flex items-center gap-2">
            <RefreshCw size={18} className={syncing ? "animate-spin text-live-amber" : "text-live-amber"} />
            Manual Data Synchronization
          </h2>
          <p className="text-xs text-spark-white/60 mt-1">
            Trigger a real-time scrape of outage advisories. Requires administrative credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* FB Sync */}
          <button
            onClick={() => handleOpenSync("facebook")}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                     border border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 
                     disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <FacebookIcon size={16} />
            Sync Facebook
          </button>

          {/* Website/Veco Sync */}
          <button
            onClick={() => handleOpenSync("visayan")}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                     border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 
                     disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <Globe size={16} />
            Sync Visayan Electric
          </button>
        </div>
      </div>

      {/* Syncing Loader */}
      {syncing && (
        <div className="mt-4 flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
          <Loader2 size={16} className="animate-spin text-live-amber" />
          <span className="text-xs font-semibold text-spark-white/80">
            Running {target === "facebook" ? "Facebook" : "Visayan Electric"} scraper. This can take up to 30-45 seconds...
          </span>
        </div>
      )}

      {/* Status Reports */}
      {status && (
        <div
          className={`mt-4 border rounded-xl p-4 ${
            status.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          <div className="flex items-start gap-3">
            {status.type === "success" ? (
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{status.message}</p>
              {status.details && (
                <details className="mt-2 text-xs font-mono whitespace-pre-wrap leading-relaxed opacity-85 select-text cursor-pointer">
                  <summary className="font-semibold select-none hover:underline mb-1">
                    Toggle details & log output
                  </summary>
                  <div className="bg-[#0B0F14]/70 p-3 rounded-lg border border-white/5 max-h-60 overflow-y-auto">
                    {status.details}
                  </div>
                </details>
              )}
            </div>
            <button
              onClick={() => setStatus(null)}
              className="text-xs font-bold hover:underline opacity-60 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Passcode Dialog */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 animate-scale-in">
            <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2">
              <Key size={18} className="text-live-amber" />
              Force Synchronization
            </h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Confirm passcode to trigger a manual refresh for the{" "}
              <span className="font-semibold text-slate-700">
                {target === "facebook" ? "Facebook Scraper" : "Visayan Electric Scraper"}
              </span>.
            </p>
            <input
              type="password"
              placeholder="Admin Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 focus:border-live-amber rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 mb-4 transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && passcode) handleSyncSubmit();
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasscodeModal(false);
                  setPasscode("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSyncSubmit}
                disabled={!passcode}
                className="px-4 py-2 text-xs font-semibold text-white bg-live-amber hover:brightness-95 disabled:opacity-50 rounded-xl transition-all"
                style={{ backgroundColor: "#FFB020", color: "#0B0F14" }}
              >
                Confirm & Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
