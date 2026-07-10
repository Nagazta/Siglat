import { useContext } from "react";
import { ReportsContext } from "../context/ReportsContext";

/**
 * Hook to consume the ReportsContext.
 * @returns {Object} reports context value
 */
export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) {
    throw new Error("useReports must be used within a ReportsProvider");
  }
  return ctx;
}
