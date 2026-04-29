import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';

export async function uploadFile(
  file: File,
  incidentId: string,
  fileName: string
): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), `incidents/${incidentId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadSignature(
  dataUrl: string,
  incidentId: string,
  fileName: string
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const storageRef = ref(getFirebaseStorage(), `incidents/${incidentId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, blob);
  return getDownloadURL(snapshot.ref);
}
