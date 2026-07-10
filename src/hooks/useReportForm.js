import { useState, useCallback } from "react";

/**
 * Hook encapsulating report form state and validation.
 * Keeps the ReportForm component purely presentational.
 *
 * @param {Object} initialValues - Optional default field values
 * @returns Form state, setters, errors, and submit handler
 */
export function useReportForm(initialValues = {}) {
  const defaults = {
    province: "",
    municipality: "",
    barangay: "",
    status: "ongoing",
    startTime: "",
    estimatedEnd: "",
    reason: "",
    notes: "",
    latitude: "",
    longitude: "",
    ...initialValues,
  };

  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const validate = useCallback(() => {
    const required = ["province", "municipality", "barangay", "status", "startTime"];
    const newErrors = {};
    required.forEach((f) => {
      if (!form[f]?.trim()) newErrors[f] = "Required.";
    });
    return newErrors;
  }, [form]);

  const reset = useCallback(() => {
    setForm(defaults);
    setErrors({});
    setSubmitting(false);
    setSubmitted(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    form,
    setField,
    errors,
    setErrors,
    submitting,
    setSubmitting,
    submitted,
    setSubmitted,
    validate,
    reset,
  };
}
