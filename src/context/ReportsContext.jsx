import { createContext, useState, useEffect, useCallback } from "react";
import { subscribeToReports } from "../services/reports";
import { MOCK_REPORTS } from "../data/mockData";

export const ReportsContext = createContext(null);

/**
 * Provides global reports state to the entire application.
 * Uses Firestore's onSnapshot for real-time updates. Falls back
 * to mock data if Firestore is unconfigured or returns an error.
 */
function processReport(r) {
  let status = r.status;
  if (status === "pending") {
    return r;
  }
  if (r.estimatedEnd) {
    const end = new Date(r.estimatedEnd);
    const now = new Date();
    if (!isNaN(end.getTime()) && end < now && status !== "restored") {
      status = "restored";
    }
  }
  return { ...r, status };
}

function processReports(list) {
  if (!Array.isArray(list)) return [];
  return list.map(processReport);
}

export function ReportsProvider({ children }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribe;
    try {
      unsubscribe = subscribeToReports(
        (updatedReports) => {
          setReports(processReports(updatedReports));
          setLoading(false);
          setIsUsingFallback(false);
        },
        (err) => {
          console.warn("Firestore connection failed; falling back to local mock data:", err);
          setReports(processReports(MOCK_REPORTS));
          setIsUsingFallback(true);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn("Firestore subscription failed; falling back to local mock data:", err);
      setReports(processReports(MOCK_REPORTS));
      setIsUsingFallback(true);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Optimistic local add
  const addReport = useCallback((report) => {
    setReports((prev) => [processReport(report), ...prev]);
  }, []);

  // Optimistic local update
  const updateReport = useCallback((id, updates) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? processReport({ ...r, ...updates }) : r))
    );
  }, []);

  // Optimistic local remove
  const removeReport = useCallback((id) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const value = {
    reports,
    loading,
    error,
    isUsingFallback,
    addReport,
    updateReport,
    removeReport,
  };

  return (
    <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>
  );
}

