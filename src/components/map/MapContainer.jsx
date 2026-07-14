import { useEffect, useMemo } from "react";
import { MapContainer as LeafletMap, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import MapMarker from "./MapMarker";
import Legend from "./Legend";
import { PHILIPPINES_CENTER, PHILIPPINES_ZOOM } from "../../data/mockData";

/**
 * Internal component to imperatively fly the map to a new center.
 */
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], zoom || map.getZoom(), { duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

/**
 * Main interactive map component.
 * @param {Array}    reports        - Array of report objects to display as markers
 * @param {Function} onMarkerClick  - Called with report object when a marker is clicked
 * @param {Object}   flyTo          - { lat, lng } to fly the map to (controlled externally)
 * @param {number}   flyToZoom      - Zoom level when flying
 * @param {string}   className      - Additional className for the wrapper
 */
export default function MapContainer({
  reports = [],
  onMarkerClick,
  flyTo = null,
  flyToZoom = 13,
  className = "",
}) {
  // Detect overlapping coordinates (within ~30 meters) and apply spiral dispersal to prevent stacking
  const processedReports = useMemo(() => {
    const result = [];
    const dispersedIndices = new Set();

    for (let i = 0; i < reports.length; i++) {
      if (dispersedIndices.has(i)) continue;

      const r1 = reports[i];
      const lat1 = parseFloat(r1.latitude);
      const lng1 = parseFloat(r1.longitude);
      if (isNaN(lat1) || isNaN(lng1)) continue;

      const closeGroup = [r1];
      const closeIndices = [i];

      for (let j = i + 1; j < reports.length; j++) {
        if (dispersedIndices.has(j)) continue;

        const r2 = reports[j];
        const lat2 = parseFloat(r2.latitude);
        const lng2 = parseFloat(r2.longitude);
        if (isNaN(lat2) || isNaN(lng2)) continue;

        const dLat = lat1 - lat2;
        const dLng = lng1 - lng2;
        const distance = Math.sqrt(dLat * dLat + dLng * dLng);

        // Threshold: 0.00028 degrees (~30 meters)
        if (distance < 0.00028) {
          closeGroup.push(r2);
          closeIndices.push(j);
        }
      }

      if (closeGroup.length === 1) {
        result.push(r1);
      } else {
        // Disperse in a small circle ring around the first coordinate point
        closeGroup.forEach((r, index) => {
          const angle = (index / closeGroup.length) * 2 * Math.PI;
          // Offset radius (around 25 meters to ensure visual separation)
          const offsetRadius = 0.00025 * (1 + Math.floor(index / 8) * 0.4);

          result.push({
            ...r,
            latitude: lat1 + offsetRadius * Math.cos(angle),
            longitude: lng1 + offsetRadius * Math.sin(angle),
          });
        });
      }

      // Mark all items in the current group as processed
      closeIndices.forEach((idx) => dispersedIndices.add(idx));
    }

    return result;
  }, [reports]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden ${className}`}>
      <LeafletMap
        center={[PHILIPPINES_CENTER.lat, PHILIPPINES_CENTER.lng]}
        zoom={PHILIPPINES_ZOOM}
        className="w-full h-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fly to controlled location */}
        {flyTo && <FlyTo center={flyTo} zoom={flyToZoom} />}

        {/* Render a clustered set of markers for each report */}
        <MarkerClusterGroup chunkedLoading>
          {processedReports.map((report) => (
            <MapMarker
              key={report.id}
              report={report}
              onClick={onMarkerClick}
            />
          ))}
        </MarkerClusterGroup>
      </LeafletMap>

      {/* Map legend overlay */}
      <Legend />
    </div>
  );
}
