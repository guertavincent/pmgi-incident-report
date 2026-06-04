import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { getFirebaseDB } from './firebase';
import { Incident, IncidentComment } from '@/types/incident';

export type IncidentFilters = {
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  type?: string;
};

export async function getNextIncidentId(): Promise<string> {
  const db = getFirebaseDB();
  const counterRef = doc(db, 'counters', 'incidents');
  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    if (!snap.exists()) {
      transaction.set(counterRef, { nextNumber: 1 });
      return 1;
    }
    const data = snap.data();
    const current = typeof data.nextNumber === 'number' ? data.nextNumber : 1;
    transaction.update(counterRef, { nextNumber: current + 1 });
    return current;
  });
  return `IR-${String(nextNumber).padStart(5, '0')}`;
}

export async function submitIncident(
  incidentData: Omit<Incident, 'id' | 'incidentId' | 'createdAt'>
): Promise<string> {
  const db = getFirebaseDB();
  const incidentId = await getNextIncidentId();
  const docRef = await addDoc(collection(db, 'incidents'), {
    ...incidentData,
    incidentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateIncidentFiles(
  docId: string,
  files: Partial<
    Pick<
      Incident,
      | 'sample1Url'
      | 'sample2Url'
      | 'sample3Url'
      | 'correctiveSignatureUrl'
      | 'safetySignatureUrl'
    >
  >
): Promise<void> {
  const db = getFirebaseDB();
  const docRef = doc(db, 'incidents', docId);
  await updateDoc(docRef, files);
}

export async function updateIncident(
  docId: string,
  updates: Partial<Incident>
): Promise<void> {
  const db = getFirebaseDB();
  const docRef = doc(db, 'incidents', docId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function addIncidentComment(
  docId: string,
  comment: Omit<IncidentComment, 'createdAt'>
): Promise<void> {
  const db = getFirebaseDB();
  const docRef = doc(db, 'incidents', docId);
  await updateDoc(docRef, {
    comments: arrayUnion({
      ...comment,
      createdAt: serverTimestamp(),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function getIncident(id: string): Promise<Incident | null> {
  const db = getFirebaseDB();
  const docRef = doc(db, 'incidents', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Incident;
}

export async function getUserIncidents(
  uid: string,
  filters: IncidentFilters = {}
): Promise<Incident[]> {
  const db = getFirebaseDB();
  const clauses = [where('submittedBy', '==', uid)];

  if (filters.type) clauses.push(where('incidentType', '==', filters.type));
  if (filters.location) clauses.push(where('locationOfIncident', '==', filters.location));
  if (filters.dateFrom) clauses.push(where('dateOfIncident', '>=', filters.dateFrom));
  if (filters.dateTo) clauses.push(where('dateOfIncident', '<=', filters.dateTo));

  const orderField = filters.dateFrom || filters.dateTo ? 'dateOfIncident' : 'createdAt';
  const q = query(collection(db, 'incidents'), ...clauses, orderBy(orderField, 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Incident));
}

export async function getAllIncidents(
  filters: IncidentFilters = {}
): Promise<Incident[]> {
  const db = getFirebaseDB();
  const clauses = [] as ReturnType<typeof where>[];
  if (filters.type) clauses.push(where('incidentType', '==', filters.type));
  if (filters.location) clauses.push(where('locationOfIncident', '==', filters.location));
  if (filters.dateFrom) clauses.push(where('dateOfIncident', '>=', filters.dateFrom));
  if (filters.dateTo) clauses.push(where('dateOfIncident', '<=', filters.dateTo));

  const orderField = filters.dateFrom || filters.dateTo ? 'dateOfIncident' : 'createdAt';
  const q = query(collection(db, 'incidents'), ...clauses, orderBy(orderField, 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Incident));
}
