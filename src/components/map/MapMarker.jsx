import { CircleMarker, Popup } from "react-leaflet";
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
 * A colored CircleMarker on the Leaflet map representing one outage report.
 * @param {Object}   report  - The report data object
 * @param {Function} onClick - Called with the report when the marker is clicked
 */
export default function MapMarker({ report, onClick }) {
  const config = getStatusConfig(report.status);
  const radius = RADIUS_BY_STATUS[report.status] || 8;

  return (
    <CircleMarker
      center={[parseFloat(report.latitude), parseFloat(report.longitude)]}
      radius={radius}
      pathOptions={{
        color: "#ffffff",
        weight: 2,
        fillColor: config.markerColor,
        fillOpacity: 0.9,
      }}
      eventHandlers={{
        click: () => onClick?.(report),
      }}
    >
      <Popup minWidth={220} maxWidth={280} className="report-popup">
        <ReportPopup report={report} />
      </Popup>
    </CircleMarker>
  );
}
