import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, BellOff, CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import Card from "../../components/common/Card";
import {
  removeSubscriber,
  getSubscriberByPhone,
  normalizePhone,
  isValidPHPhone,
} from "../../services/firebase/subscribers";

/**
 * Unsubscribe page — allows users to remove their phone number
 * from SMS outage alerts.
 */
export default function Unsubscribe() {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleUnsubscribe = async () => {
    const normalized = normalizePhone(phone);

    if (!isValidPHPhone(normalized)) {
      setResult({
        type: "error",
        message: "Please enter a valid Philippine mobile number (e.g., 09171234567).",
      });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const existing = await getSubscriberByPhone(normalized);
      if (!existing) {
        setResult({
          type: "error",
          message: "This number is not currently subscribed to any alerts.",
        });
        return;
      }

      await removeSubscriber(normalized);
      setResult({
        type: "success",
        message: "You've been successfully unsubscribed. You will no longer receive SMS outage alerts.",
      });
      setPhone("");
    } catch (err) {
      console.error(err);
      setResult({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-grid-ink border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors mb-4"
            style={{ color: "rgba(248,250,252,0.6)" }}
          >
            <ArrowLeft size={15} />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(244,63,94,0.15)" }}
            >
              <BellOff size={24} className="text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#F8FAFC" }}>
                Unsubscribe from SMS Alerts
              </h1>
              <p
                className="text-sm mt-0.5"
                style={{ color: "rgba(248,250,252,0.6)" }}
              >
                Remove your number from Siglat PH outage notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          {/* Result message */}
          {result && (
            <div
              className={`flex items-start gap-3 p-3.5 rounded-xl mb-5 text-sm font-medium ${
                result.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle2
                  size={18}
                  className="text-emerald-500 flex-shrink-0 mt-0.5"
                />
              ) : (
                <AlertTriangle
                  size={18}
                  className="text-rose-500 flex-shrink-0 mt-0.5"
                />
              )}
              <span>{result.message}</span>
            </div>
          )}

          {result?.type !== "success" && (
            <>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Enter the phone number you used to subscribe. Once unsubscribed,
                you will no longer receive SMS text alerts for power outages in
                your area.
              </p>

              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="tel"
                    placeholder="09171234567"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setResult(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && phone) handleUnsubscribe();
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-rose-400 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all"
                    maxLength={13}
                  />
                </div>
              </div>

              <button
                onClick={handleUnsubscribe}
                disabled={submitting || !phone}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                         bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold
                         disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BellOff size={16} />
                    Unsubscribe
                  </>
                )}
              </button>
            </>
          )}

          {result?.type === "success" && (
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                       bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all"
            >
              <ArrowLeft size={14} />
              Back to Home
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}
