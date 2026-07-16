import { useState } from "react";
import { Send, Phone, X, CheckCircle2, AlertTriangle, Loader2, Activity } from "lucide-react";
import { normalizePhone, isValidPHPhone } from "../../services/firebase/subscribers";

const HTTPSMS_API_URL = "https://api.httpsms.com/v1/messages/send";

/**
 * TestSmsModal — Admin dialog to send a test SMS to verify httpSMS integration.
 * Requires admin passcode to access.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 */
export default function TestSmsModal({ isOpen, onClose }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    "Siglat PH Test: Your httpSMS integration is working. This is a plain text verification message. Time: " +
      new Date().toLocaleTimeString("en-PH")
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const resetState = () => {
    setPhone("");
    setMessage(
      "Siglat PH Test: Your httpSMS integration is working. This is a plain text verification message. Time: " +
        new Date().toLocaleTimeString("en-PH")
    );
    setSending(false);
    setResult(null);
    setPasscode("");
    setAuthorized(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAuthorize = () => {
    const expected = import.meta.env.VITE_ADMIN_PASSCODE || "admin123";
    if (passcode === expected) {
      setAuthorized(true);
    } else {
      setResult({ type: "error", message: "Incorrect admin passcode." });
      setPasscode("");
    }
  };

  const handleSend = async () => {
    const apiKey = import.meta.env.VITE_HTTPSMS_API_KEY;
    const sender = import.meta.env.VITE_HTTPSMS_SENDER;

    if (!apiKey || !sender) {
      setResult({ type: "error", message: "httpSMS API key or sender number not configured in .env" });
      return;
    }

    const normalized = normalizePhone(phone);
    if (!isValidPHPhone(normalized)) {
      setResult({ type: "error", message: "Enter a valid PH mobile number (e.g., 09171234567)" });
      return;
    }

    if (!message.trim()) {
      setResult({ type: "error", message: "Message content cannot be empty." });
      return;
    }

    setSending(true);
    setResult(null);

    const startTime = Date.now();

    try {
      const res = await fetch(HTTPSMS_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message,
          from: sender,
          to: normalized,
        }),
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;

      if (res.ok) {
        setResult({
          type: "success",
          message: `Test SMS sent to ${normalized} in ${elapsed}ms. Check your phone!`,
          data,
        });
      } else {
        setResult({
          type: "error",
          message: `API returned ${res.status}: ${data?.message || JSON.stringify(data)}`,
        });
      }
    } catch (err) {
      setResult({
        type: "error",
        message: `Network error: ${err.message}`,
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SMS Health Check</h2>
              <p className="text-white/80 text-xs">Test your httpSMS integration</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Result */}
          {result && (
            <div
              className={`flex items-start gap-3 p-3.5 rounded-xl mb-4 text-sm font-medium ${
                result.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          {/* Passcode gate */}
          {!authorized ? (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Enter the admin passcode to send a test SMS.
              </p>
              <input
                type="password"
                placeholder="Admin Passcode"
                value={passcode}
                onChange={(e) => { setPasscode(e.target.value); setResult(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && passcode) handleAuthorize(); }}
                className="w-full px-3 py-2.5 border border-slate-200 focus:border-emerald-400 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-100 mb-4 transition-all"
                autoFocus
              />
              <button
                onClick={handleAuthorize}
                disabled={!passcode}
                className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold
                         disabled:opacity-50 transition-all"
              >
                Authorize
              </button>
            </>
          ) : (
            <>
              {/* Phone input */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Recipient Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="09171234567"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setResult(null); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-emerald-400 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                    maxLength={13}
                    autoFocus
                  />
                </div>
              </div>

              {/* Message content */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Message Content
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2.5 border border-slate-200 focus:border-emerald-400 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all resize-none font-mono text-xs"
                />
              </div>

              {/* Config info */}
              <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-500 font-mono">
                  <span className="font-semibold text-slate-600">Sender:</span>{" "}
                  {import.meta.env.VITE_HTTPSMS_SENDER || "Not configured"}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  <span className="font-semibold text-slate-600">API:</span>{" "}
                  {import.meta.env.VITE_HTTPSMS_API_KEY ? "✅ Configured" : "❌ Missing"}
                </p>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !phone}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                         bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold
                         hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Test SMS
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
