import { useState } from "react";
import { Bell, MapPin, Phone, CheckCircle2, AlertTriangle, Loader2, X, Activity } from "lucide-react";
import TestSmsModal from "./TestSmsModal";
import {
  addSubscriber,
  getSubscriberByPhone,
  removeSubscriber,
  normalizePhone,
  isValidPHPhone,
} from "../../services/firebase/subscribers";

const RADIUS_OPTIONS = [
  { value: 3, label: "3 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 15, label: "15 km" },
];

/**
 * SubscribeModal — allows users to register their phone number and location
 * for SMS outage alerts via httpSMS.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 */
export default function SubscribeModal({ isOpen, onClose }) {
  const [phone, setPhone] = useState("");
  const [radius, setRadius] = useState(5);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error' | 'exists', message }

  // Check/manage subscription state
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingSub, setExistingSub] = useState(null);
  const [unsubscribing, setUnsubscribing] = useState(false);

  // Test SMS modal
  const [showTestSms, setShowTestSms] = useState(false);

  const resetState = () => {
    setPhone("");
    setRadius(5);
    setCoords(null);
    setLocating(false);
    setLocError(null);
    setSubmitting(false);
    setResult(null);
    setCheckingExisting(false);
    setExistingSub(null);
    setUnsubscribing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        const messages = {
          1: "Location permission denied. Please allow location access in your browser settings.",
          2: "Position unavailable. Please try again.",
          3: "Location request timed out. Please try again.",
        };
        setLocError(messages[err.code] || "Failed to get location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCheckExisting = async () => {
    const normalized = normalizePhone(phone);
    if (!isValidPHPhone(normalized)) {
      setResult({ type: "error", message: "Please enter a valid Philippine mobile number (e.g., 09171234567)." });
      return;
    }

    setCheckingExisting(true);
    try {
      const existing = await getSubscriberByPhone(phone);
      if (existing) {
        setExistingSub(existing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleSubscribe = async () => {
    const normalized = normalizePhone(phone);

    if (!isValidPHPhone(normalized)) {
      setResult({ type: "error", message: "Please enter a valid Philippine mobile number (e.g., 09171234567)." });
      return;
    }

    if (!coords) {
      setResult({ type: "error", message: "Please allow location access so we can alert you about nearby outages." });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      // Check for existing subscription
      const existing = await getSubscriberByPhone(normalized);
      if (existing) {
        setExistingSub(existing);
        setSubmitting(false);
        return;
      }

      await addSubscriber(normalized, coords.lat, coords.lng, radius);
      setResult({
        type: "success",
        message: `Subscribed! You'll receive SMS alerts at ${normalized} for outages within ${radius}km of your location.`,
      });
    } catch (err) {
      console.error(err);
      setResult({ type: "error", message: "Failed to subscribe. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnsubscribe = async () => {
    setUnsubscribing(true);
    try {
      await removeSubscriber(phone);
      setExistingSub(null);
      setResult({ type: "success", message: "You've been unsubscribed. You will no longer receive SMS alerts." });
    } catch (err) {
      console.error(err);
      setResult({ type: "error", message: "Failed to unsubscribe. Please try again." });
    } finally {
      setUnsubscribing(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!coords) {
      setResult({ type: "error", message: "Please allow location access to update your subscription." });
      return;
    }

    setSubmitting(true);
    try {
      const normalized = normalizePhone(phone);
      await addSubscriber(normalized, coords.lat, coords.lng, radius);
      setExistingSub(null);
      setResult({
        type: "success",
        message: `Subscription updated! Alerts at ${normalized} for outages within ${radius}km.`,
      });
    } catch (err) {
      console.error(err);
      setResult({ type: "error", message: "Failed to update. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <Bell size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SMS Outage Alerts</h2>
              <p className="text-white/80 text-xs">Get texted when there's a brownout near you</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Success / Error Result */}
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

          {/* Already subscribed state */}
          {existingSub && !result && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                This number is already subscribed!
              </p>
              <p className="text-xs text-amber-700 mb-3">
                Currently receiving alerts within {existingSub.radiusKm || 5}km radius.
                You can update your location/radius or unsubscribe.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateSubscription}
                  disabled={submitting || !coords}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-all"
                >
                  {submitting ? "Updating..." : "Update Subscription"}
                </button>
                <button
                  onClick={handleUnsubscribe}
                  disabled={unsubscribing}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 rounded-xl transition-all"
                >
                  {unsubscribing ? "..." : "Unsubscribe"}
                </button>
              </div>
            </div>
          )}

          {/* Form (hide on success) */}
          {result?.type !== "success" && (
            <>
              {/* Phone input */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="09171234567"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setExistingSub(null);
                      setResult(null);
                    }}
                    onBlur={handleCheckExisting}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 focus:border-amber-400 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all"
                    maxLength={13}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Philippine mobile number (e.g., 09171234567 or +639171234567)
                </p>
              </div>

              {/* Location */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Your Location
                </label>
                {coords ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Location captured</p>
                      <p className="text-[11px] text-emerald-600 font-mono">
                        {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200
                             hover:border-amber-400 hover:bg-amber-50 rounded-xl text-sm font-semibold text-slate-600
                             hover:text-amber-700 transition-all disabled:opacity-50"
                  >
                    {locating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Detecting location...
                      </>
                    ) : (
                      <>
                        <MapPin size={16} />
                        Allow Location Access
                      </>
                    )}
                  </button>
                )}
                {locError && (
                  <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {locError}
                  </p>
                )}
              </div>

              {/* Radius selector */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Alert Radius
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRadius(opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        radius === opt.value
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  You'll be alerted for outages within this distance
                </p>
              </div>

              {/* Subscribe button */}
              {!existingSub && (
                <button
                  onClick={handleSubscribe}
                  disabled={submitting || !phone || checkingExisting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500
                           text-white text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <Bell size={16} />
                      Subscribe to SMS Alerts
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* Done button (on success) */}
          {result?.type === "success" && (
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all"
            >
              Done
            </button>
          )}

          {/* Footer note */}
          <p className="text-[10px] text-slate-400 mt-4 text-center leading-relaxed">
            Powered by <span className="font-semibold">httpSMS</span>. 
            SMS sent from a local Philippine number. Standard carrier rates may apply.
            Reply STOP to any alert to unsubscribe.
          </p>

          {/* Admin: Test SMS link */}
          <button
            onClick={() => setShowTestSms(true)}
            className="mt-2 w-full text-[10px] text-slate-300 hover:text-emerald-500 transition-colors flex items-center justify-center gap-1"
          >
            <Activity size={10} />
            Admin: Send Test SMS
          </button>
        </div>
      </div>

      {showTestSms && (
        <TestSmsModal isOpen={showTestSms} onClose={() => setShowTestSms(false)} />
      )}
    </div>
  );
}
