import { useState, useEffect, useMemo } from "react";
import { MapPin, Clock, AlertTriangle, FileText, Camera, CheckCircle2 } from "lucide-react";
import { MapContainer as LeafletMap, TileLayer, CircleMarker, useMapEvents, useMap } from "react-leaflet";
import Button from "../common/Button";
import { STATUS } from "../../data/mockData";
import { createReport } from "../../services/reports";
import { uploadReportPhoto } from "../../services/firebase/storage";

// Map events controller for the location pin picker
function FormMapEvents({ onMapClick, selectedLatLng }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedLatLng) {
      map.setView([selectedLatLng.lat, selectedLatLng.lng], 14, { animate: true });
    }
  }, [selectedLatLng, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

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

  // Location Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Debounced geocoding search
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            searchQuery
          )}&format=json&addressdetails=1&limit=5&countrycodes=ph`,
          {
            headers: {
              "User-Agent": "SiglatPH-Outage-Tracker",
            },
          }
        );
        if (res.ok) {
          const data = await res.ok ? await res.json() : [];
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Geocoding fetch error:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

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

  const parseNominatimAddress = (item) => {
    const address = item.address || {};
    
    // Barangay resolution (suburb, neighborhood, village, quarter, hamlet)
    const barangay = address.suburb || 
                     address.neighbourhood || 
                     address.village || 
                     address.quarter || 
                     address.hamlet || 
                     address.island || 
                     address.district ||
                     "";
                     
    // Municipality/City resolution (city, town, municipality, county)
    const municipality = address.city || 
                         address.town || 
                         address.municipality || 
                         address.county || 
                         "";
                         
    // Province resolution (province, state, region)
    const province = address.province || 
                     address.state || 
                     address.region || 
                     "";

    return {
      barangay,
      municipality,
      province,
      latitude: item.lat ? parseFloat(item.lat) : 14.5995,
      longitude: item.lon ? parseFloat(item.lon) : 120.9842,
    };
  };

  const selectedLatLng = useMemo(() => {
    return form.latitude && form.longitude
      ? { lat: parseFloat(form.latitude), lng: parseFloat(form.longitude) }
      : null;
  }, [form.latitude, form.longitude]);

  const handleSelectSuggestion = (item) => {
    const parsed = parseNominatimAddress(item);
    
    setForm((prev) => ({
      ...prev,
      province: parsed.province,
      municipality: parsed.municipality,
      barangay: parsed.barangay,
      latitude: parsed.latitude.toString(),
      longitude: parsed.longitude.toString(),
    }));

    setSelectedLocationName(item.display_name);
    setSearchQuery("");
    setSuggestions([]);
    setShowMap(true);
    
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.location;
      delete copy.province;
      delete copy.municipality;
      delete copy.barangay;
      return copy;
    });
  };

  const handleMapClickOrDrag = async (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            "User-Agent": "SiglatPH-Outage-Tracker",
          },
        }
      );
      if (res.ok) {
        const item = await res.json();
        const parsed = parseNominatimAddress(item);
        
        setForm((prev) => ({
          ...prev,
          province: parsed.province,
          municipality: parsed.municipality,
          barangay: parsed.barangay,
        }));
        setSelectedLocationName(item.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.location;
          delete copy.province;
          delete copy.municipality;
          delete copy.barangay;
          return copy;
        });
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (manualMode) {
      REQUIRED_FIELDS.forEach((field) => {
        if (!form[field]?.trim()) {
          newErrors[field] = "This field is required.";
        }
      });
    } else {
      if (!form.province?.trim() || !form.municipality?.trim() || !form.barangay?.trim()) {
        newErrors.location = "A specific location (including Barangay, Municipality, and Province) must be selected.";
      }
      
      ["status", "startTime"].forEach((field) => {
        if (!form[field]?.trim()) {
          newErrors[field] = "This field is required.";
        }
      });
    }
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
      const reportData = {
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : 14.5995,
        longitude: form.longitude ? parseFloat(form.longitude) : 120.9842,
        photoUrl: null,
      };

      const newReport = await createReport(reportData);

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

        {!manualMode ? (
          <div className="flex flex-col gap-3 relative">
            <label className="block text-xs font-semibold text-slate-700">
              Search Location <span className="text-danger">*</span>
              <span className="block text-[11px] text-muted font-normal mt-0.5">
                Type your barangay or city name and select from the suggestions
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Batasan Hills, Quezon City"
                className={`input-field text-sm pr-10 ${errors.location ? "border-danger ring-1 ring-danger/30" : ""}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {loadingSuggestions ? (
                  <svg className="animate-spin h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <MapPin size={16} className="text-muted" />
                )}
              </div>
            </div>

            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 top-[68px] bg-white border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 animate-slide-down">
                {suggestions.map((item) => (
                  <li key={item.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-primary/5 hover:text-primary transition-colors text-slate-700 leading-snug"
                    >
                      {item.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Selected confirmation */}
            {selectedLocationName ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex flex-col gap-2.5 animate-fade-in">
                <div>
                  <p className="font-semibold text-slate-700">Pin Reference Address:</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{selectedLocationName}</p>
                </div>
                
                {/* Editable location components */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200/60 pt-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">🏡 Barangay *</label>
                    <input
                      type="text"
                      value={form.barangay}
                      onChange={(e) => set("barangay", e.target.value)}
                      placeholder="Barangay name"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">🏙️ City / Muni *</label>
                    <input
                      type="text"
                      value={form.municipality}
                      onChange={(e) => set("municipality", e.target.value)}
                      placeholder="City or town"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">🗺️ Province *</label>
                    <input
                      type="text"
                      value={form.province}
                      onChange={(e) => set("province", e.target.value)}
                      placeholder="Province"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-muted flex gap-3 border-t border-slate-200/40 pt-1.5 mt-0.5">
                  <span>Coordinates — Lat: {parseFloat(form.latitude).toFixed(6)}</span>
                  <span>Lng: {parseFloat(form.longitude).toFixed(6)}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-center text-xs text-muted">
                No location selected yet. Type to search above or drop a pin on the map.
              </div>
            )}

            {/* Pin Location on Map Button and Expandable Map Drawer */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowMap((prev) => !prev)}
                className="inline-flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm self-start"
              >
                <MapPin size={14} className="text-primary" />
                {showMap ? "Hide Pin-Location Map" : "Pin Location on Map"}
              </button>

              {showMap && (
                <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-200 relative z-0 animate-fade-in">
                  <LeafletMap
                    center={selectedLatLng ? [selectedLatLng.lat, selectedLatLng.lng] : [12.8797, 121.7740]}
                    zoom={selectedLatLng ? 14 : 5}
                    className="w-full h-full"
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FormMapEvents 
                      onMapClick={handleMapClickOrDrag} 
                      selectedLatLng={selectedLatLng} 
                    />
                    {selectedLatLng && (
                      <CircleMarker
                        center={[selectedLatLng.lat, selectedLatLng.lng]}
                        radius={8}
                        pathOptions={{
                          color: "#ffffff",
                          weight: 2,
                          fillColor: "#EF4444",
                          fillOpacity: 1,
                        }}
                      />
                    )}
                  </LeafletMap>
                  <div className="absolute bottom-2 right-2 z-[400] bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-slate-500 pointer-events-none font-semibold border border-slate-100 shadow-sm">
                    Click on map to drop location pin
                  </div>
                </div>
              )}
            </div>

            {errors.location && <p className="text-xs text-danger mt-0.5">{errors.location}</p>}

            <button
              type="button"
              onClick={() => {
                setManualMode(true);
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.location;
                  return copy;
                });
              }}
              className="text-left text-xs font-semibold text-primary hover:underline self-start mt-1"
            >
              Can't find your location? Enter details manually →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-fade-in">
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

            <button
              type="button"
              onClick={() => {
                setManualMode(false);
                setForm((prev) => ({
                  ...prev,
                  province: "",
                  municipality: "",
                  barangay: "",
                  latitude: "",
                  longitude: "",
                }));
                setSelectedLocationName("");
              }}
              className="text-left text-xs font-semibold text-primary hover:underline self-start"
            >
              ← Switch back to automatic search
            </button>
          </div>
        )}
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
