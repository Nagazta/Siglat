import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

/**
 * Upload a photo file to Firebase Storage.
 * Returns the public download URL.
 *
 * @param {File}   file      - The image File object from the input
 * @param {string} reportId  - Used to create a unique storage path
 * @returns {Promise<string>} Download URL
 */
export async function uploadReportPhoto(file, reportId) {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const path = `reports/${reportId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
