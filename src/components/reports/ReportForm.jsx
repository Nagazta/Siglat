import { useState } from "react";
import { MapPin, Clock, AlertTriangle, FileText, Camera, CheckCircle2 } from "lucide-react";
import Button from "../common/Button";
import { STATUS } from "../../data/mockData";
import { createReport } from "../../services/reports";
import { uploadReportPhoto } from "../../services/firebase/storage";

const INITIAL_FORM = {
  province: "",
  municipality: "",
  barangay: "",
  status: STATUS.ONGOING,
  startTime: "",
  estimatedEnd: "",
  reason: "",
  notes: "",
  latitude: "",
  longitude: "",
};

const REQUIRED_FIELDS = ["province", "municipality", "barangay", "status", "startTime"];

const STATUS_OPTIONS = [
  { value: STATUS.ONGOING, label: "⚡ Ongoing" },
  { value: STATUS.SCHEDULED, label: "📅 Scheduled" },
  { value: STATUS.RESTORED, label: "✅ Restored" },
];

const REASON_OPTIONS = [
  "",
  "Transformer maintenance",
  "Line maintenance",
  "System upgrade",
  "Typhoon damage",
  "Equipment failure",
  "Unknown",
  "Other",
];

/**
 * Full report submission form with Firebase Storage photo upload.
 * @param {Function} onSuccess - Called with the new report object after successful submit
 * @param {Function} onCancel  - Called when user clicks Cancel
 */
export default function ReportForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState("");

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!form[field]?.trim()) {
        newErrors[field] = "This field is required.";
      }
    });
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Create the report first to get an ID for the photo path
      const reportData = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : 14.5995,
        longitude: form.longitude ? parseFloat(form.longitude) : 120.9842,
        photoUrl: null,
      };

      const newReport = await createReport(reportData);

      // Upload photo if provided
      if (photo && newReport.id) {
        setUploadProgress("Uploading photo...");
        const photoUrl = await uploadReportPhoto(photo, newReport.id);
        newReport.photoUrl = photoUrl;
      }

      onSuccess?.(newReport);
    } catch (err) {
      console.error("Failed to submit report:", err);
      setErrors({ _form: "Failed to submit. Please try again." });
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* ── Location ── */}
      <fieldset className="border border-border rounded-xl p-4 flex flex-col gap-4">
        <legend className="px-2 text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
          <MapPin size={13} /> Location
        </legend>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { field: "province", label: "Province", placeholder: "e.g. Metro Manila" },
            { field: "municipality", label: "Municipality / City", placeholder: "e.g. Quezon City" },
            { field: "barangay", label: "Barangay", placeholder: "e.g. Batasan Hills" },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {label} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className={`input-field text-sm ${errors[field] ? "border-danger ring-1 ring-danger/30" : ""}`}
              />
              {errors[field] && <p className="text-xs text-danger mt-1">{errors[field]}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { field: "latitude", placeholder: "14.5995" },
            { field: "longitude", placeholder: "120.9842" },
          ].map(({ field, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-slate-700 mb-1 capitalize">
                {field} <span className="text-muted font-normal text-[11px]">(optional)</span>
              </label>
              <input
                type="number"
                step="any"
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className="input-field text-sm"
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* ── Outage Details ── */}
      <fieldset className="border border-border rounded-xl p-4 flex flex-col gap-4">
        <legend className="px-2 text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
          <AlertTriangle size={13} /> Outage Details
        </legend>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status <span className="text-danger">*</span>
            </label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="input-field text-sm"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <Clock size={11} className="inline mr-1" />
              Start Time <span className="text-danger">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              className={`input-field text-sm ${errors.startTime ? "border-danger ring-1 ring-danger/30" : ""}`}
            />
            {errors.startTime && <p className="text-xs text-danger mt-1">{errors.startTime}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              <Clock size={11} className="inline mr-1" />
              Est. Restoration <span className="text-muted font-normal text-[11px]">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={form.estimatedEnd}
              onChange={(e) => set("estimatedEnd", e.target.value)}
              className="input-field text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason <span className="text-muted font-normal text-[11px]">(optional)</span>
          </label>
          <select
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            className="input-field text-sm"
          >
            {REASON_OPTIONS.map((r) => (
              <option key={r} value={r}>{r || "— Select a reason —"}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* ── Notes & Photo ── */}
      <fieldset className="border border-border rounded-xl p-4 flex flex-col gap-4">
        <legend className="px-2 text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
          <FileText size={13} /> Additional Info
        </legend>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes <span className="text-muted font-normal text-[11px]">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any additional information about the outage..."
            rows={3}
            className="input-field text-sm resize-none"
          />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <Camera size={12} />
            Photo <span className="text-muted font-normal text-[11px]">(optional)</span>
          </label>

          {photoPreview ? (
            <div className="relative inline-block">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full max-h-40 object-cover rounded-xl border border-border"
              />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border
                              rounded-xl py-6 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
              <Camera size={24} className="text-muted" />
              <span className="text-xs text-muted">Click to upload a photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </fieldset>

      {/* Form-level error */}
      {errors._form && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">{errors._form}</p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {uploadProgress && (
          <span className="text-xs text-muted flex items-center gap-1.5 mr-auto">
            <CheckCircle2 size={13} className="text-primary animate-pulse" />
            {uploadProgress}
          </span>
        )}
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          <AlertTriangle size={14} />
          Submit Report
        </Button>
      </div>
    </form>
  );
}
