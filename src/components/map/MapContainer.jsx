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
  // Detect overlapping coordinates and apply spiral dispersal to prevent stacking
  const processedReports = useMemo(() => {
    const coordinateGroups = {};

    reports.forEach((r) => {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      // Group by coordinate rounded to 5 decimal places (~1 meter precision)
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (!coordinateGroups[key]) {
        coordinateGroups[key] = [];
      }
      coordinateGroups[key].push(r);
    });

    const result = [];

    Object.keys(coordinateGroups).forEach((key) => {
      const group = coordinateGroups[key];
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Disperse in a small spiral/circle ring
        group.forEach((r, index) => {
          const angle = (index / group.length) * 2 * Math.PI;
          // Offset radius (around 15-20 meters)
          const offsetRadius = 0.00015 * (1 + Math.floor(index / 8) * 0.5);

          result.push({
            ...r,
            latitude: parseFloat(r.latitude) + offsetRadius * Math.cos(angle),
            longitude: parseFloat(r.longitude) + offsetRadius * Math.sin(angle),
          });
        });
      }
    });

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
