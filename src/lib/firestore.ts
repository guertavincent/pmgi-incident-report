import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Incident } from '@/types/incident';

export async function getNextIncidentId(): Promise<string> {
  const counterRef = doc(db, 'counters', 'incidents');
  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    if (!snap.exists()) {
      transaction.set(counterRef, { nextNumber: 1 });
      return 1;
    }
    const current = snap.data().nextNumber as number;
    transaction.update(counterRef, { nextNumber: current + 1 });
    return current;
  });
  return `IR-${String(nextNumber).padStart(5, '0')}`;
}

export async function submitIncident(
  incidentData: Omit<Incident, 'id' | 'incidentId' | 'createdAt'>
): Promise<string> {
  const incidentId = await getNextIncidentId();
  const docRef = await addDoc(collection(db, 'incidents'), {
    ...incidentData,
    incidentId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getIncident(id: string): Promise<Incident | null> {
  const docRef = doc(db, 'incidents', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Incident;
}

export async function getUserIncidents(uid: string): Promise<Incident[]> {
  const q = query(
    collection(db, 'incidents'),
    where('submittedBy', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Incident));
}

export async function getAllIncidents(): Promise<Incident[]> {
  const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Incident));
}
