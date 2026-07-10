import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  orderBy,
  query,
  onSnapshot,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

const REPORTS_COLLECTION = "reports";

/**
 * Get a Firestore collection reference for reports.
 */
export const reportsRef = () => collection(db, REPORTS_COLLECTION);

/**
 * Fetch all reports ordered by createdAt descending.
 * @returns {Promise<Array>}
 */
export async function fetchReports() {
  const q = query(reportsRef(), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single report by ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function fetchReportById(id) {
  const ref = doc(db, REPORTS_COLLECTION, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Add a new report to Firestore.
 * @param {Object} reportData
 * @returns {Promise<Object>} The created report with its Firestore ID
 */
export async function addReport(reportData) {
  const payload = {
    ...reportData,
    confirmations: 0,
    restoredVotes: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(reportsRef(), payload);
  return { id: docRef.id, ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

/**
 * Increment the confirmation count for a report.
 * @param {string} reportId
 */
export async function incrementConfirmations(reportId) {
  const ref = doc(db, REPORTS_COLLECTION, reportId);
  await updateDoc(ref, {
    confirmations: increment(1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Increment the restored votes count for a report.
 * @param {string} reportId
 */
export async function incrementRestoredVotes(reportId) {
  const ref = doc(db, REPORTS_COLLECTION, reportId);
  await updateDoc(ref, {
    restoredVotes: increment(1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Subscribe to real-time updates on the reports collection.
 * @param {Function} onUpdate - Called with the updated reports array
 * @returns {Function} Unsubscribe function
 */
export function subscribeToReports(onUpdate, onError) {
  const q = query(reportsRef(), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        // Convert Firestore Timestamps to ISO strings for consistent handling
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt,
        updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || d.data().updatedAt,
        startTime: d.data().startTime || null,
        estimatedEnd: d.data().estimatedEnd || null,
      }));
      onUpdate(reports);
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      onError?.(error);
    }
  );
}

