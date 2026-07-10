import { useState, useCallback } from "react";
import { PHILIPPINES_CENTER, PHILIPPINES_ZOOM } from "../data/mockData";

/**
 * Hook for managing interactive map state.
 * Keeps map center, zoom, and selected report decoupled from the page component.
 */
export function useMap() {
  const [center, setCenter] = useState(PHILIPPINES_CENTER);
  const [zoom, setZoom] = useState(PHILIPPINES_ZOOM);
  const [selectedReport, setSelectedReport] = useState(null);
  const [flyTo, setFlyTo] = useState(null);

  const flyToReport = useCallback((report) => {
    setFlyTo({ lat: report.latitude, lng: report.longitude });
    setSelectedReport(report);
  }, []);

  const flyToLocation = useCallback((lat, lng, z = 13) => {
    setFlyTo({ lat, lng });
    setZoom(z);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedReport(null);
    setFlyTo(null);
  }, []);

  return {
    center,
    zoom,
    flyTo,
    selectedReport,
    setCenter,
    setZoom,
    flyToReport,
    flyToLocation,
    clearSelection,
  };
}
