/**
 * Reports service — bridges the app to Firestore.
 * Falls back to mock data when Firestore is unavailable.
 */

import {
  fetchReports as firestoreFetchReports,
  fetchReportById as firestoreFetchById,
  addReport as firestoreAddReport,
  incrementConfirmations,
  incrementRestoredVotes,
  subscribeToReports,
} from "../firebase/firestore";

export { subscribeToReports };

/**
 * Fetch all reports from Firestore.
 * @returns {Promise<Array>}
 */
export async function getReports() {
  return firestoreFetchReports();
}

/**
 * Fetch a single report by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getReportById(id) {
  return firestoreFetchById(id);
}

/**
 * Submit a new brownout report to Firestore.
 * @param {Object} reportData
 * @returns {Promise<Object>}
 */
export async function createReport(reportData) {
  return firestoreAddReport(reportData);
}

/**
 * Confirm an ongoing outage.
 * @param {string} reportId
 */
export async function confirmOutage(reportId) {
  return incrementConfirmations(reportId);
}

/**
 * Vote that an outage has been restored.
 * @param {string} reportId
 */
export async function voteRestored(reportId) {
  return incrementRestoredVotes(reportId);
}
