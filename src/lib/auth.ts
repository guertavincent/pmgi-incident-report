import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, db } from './firebase';

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password
  );
  await updateProfile(credential.user, { displayName });
  await createUserProfile(credential.user, displayName);
  return credential;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  await createUserProfile(credential.user, credential.user.displayName || '');
  return credential;
}

export async function logout() {
  return signOut(getFirebaseAuth());
}

export async function createUserProfile(user: User, displayName: string) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName,
        createdAt: serverTimestamp(),
      });
  }
}

