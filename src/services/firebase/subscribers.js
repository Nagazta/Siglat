import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

const SUBSCRIBERS_COLLECTION = "subscribers";

/**
 * Get a Firestore collection reference for subscribers.
 */
const subscribersRef = () => collection(db, SUBSCRIBERS_COLLECTION);

/**
 * Normalize a Philippine phone number to +63 format.
 * Accepts: 09XX, +639XX, 639XX formats.
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+63" + cleaned.slice(1);
  } else if (cleaned.startsWith("63") && !cleaned.startsWith("+63")) {
    cleaned = "+" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+63" + cleaned;
  }
  return cleaned;
}

/**
 * Validate a Philippine mobile number.
 * @param {string} phone - normalized phone number
 * @returns {boolean}
 */
export function isValidPHPhone(phone) {
  return /^\+639\d{9}$/.test(phone);
}

/**
 * Add or update a subscriber in Firestore.
 * Uses the normalized phone number as the document ID to prevent duplicates.
 * @param {string} phone
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusKm
 */
export async function addSubscriber(phone, latitude, longitude, radiusKm = 5) {
  const normalized = normalizePhone(phone);
  const ref = doc(db, SUBSCRIBERS_COLLECTION, normalized);
  await setDoc(ref, {
    phone: normalized,
    latitude,
    longitude,
    radiusKm,
    active: true,
    subscribedAt: serverTimestamp(),
    lastNotified: null,
  });
  return normalized;
}

/**
 * Remove a subscriber from Firestore.
 * @param {string} phone
 */
export async function removeSubscriber(phone) {
  const normalized = normalizePhone(phone);
  const ref = doc(db, SUBSCRIBERS_COLLECTION, normalized);
  await deleteDoc(ref);
}

/**
 * Check if a phone number is already subscribed.
 * @param {string} phone
 * @returns {Promise<Object|null>}
 */
export async function getSubscriberByPhone(phone) {
  const normalized = normalizePhone(phone);
  const ref = doc(db, SUBSCRIBERS_COLLECTION, normalized);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Fetch all active subscribers.
 * @returns {Promise<Array>}
 */
export async function fetchAllSubscribers() {
  const q = query(subscribersRef(), where("active", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
