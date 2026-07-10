import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { getStatusConfig } from "../../utils";
import ReportPopup from "./ReportPopup";

// Marker radius by status — ongoing is slightly larger to draw attention
const RADIUS_BY_STATUS = {
  ongoing: 10,
  scheduled: 9,
  restored: 8,
  unknown: 8,
};

/**
 * A styled HTML marker on the Leaflet map representing one outage report.
 * Uses Leaflet L.divIcon for perfect compatibility with marker clustering.
 * @param {Object}   report  - The report data object
 * @param {Function} onClick - Called with the report when the marker is clicked
 */
export default function MapMarker({ report, onClick }) {
  const config = getStatusConfig(report.status);
  const radius = RADIUS_BY_STATUS[report.status] || 8;

  // Create standard HTML divIcon that mimics CircleMarker appearance + adds a drop shadow
  const icon = L.divIcon({
    className: "custom-map-pin-marker",
    html: `<div style="
      width: ${radius * 2}px;
      height: ${radius * 2}px;
      background-color: ${config.markerColor};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    "></div>`,
    iconSize: [radius * 2, radius * 2],
    iconAnchor: [radius, radius], // center anchor
    popupAnchor: [0, -radius], // offset popup slightly above the circle
  });

  return (
    <Marker
      position={[parseFloat(report.latitude), parseFloat(report.longitude)]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(report),
      }}
    >
      <Popup minWidth={220} maxWidth={280} className="report-popup">
        <ReportPopup report={report} />
      </Popup>
    </Marker>
  );
}
