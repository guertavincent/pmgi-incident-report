import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  try {
    const credential = await signInWithPopup(getFirebaseAuth(), provider);
    await createUserProfile(credential.user, credential.user.displayName || '');
    return { credential, redirected: false };
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === 'auth/network-request-failed' || error?.code === 'auth/popup-blocked') {
      await signInWithRedirect(getFirebaseAuth(), provider);
      return { redirected: true };
    }
    throw err;
  }
}

export async function handleGoogleRedirectResult() {
  const result = await getRedirectResult(getFirebaseAuth());
  if (result?.user) {
    await createUserProfile(result.user, result.user.displayName || '');
  }
  return result;
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
      role: 'user',
        createdAt: serverTimestamp(),
      });
  }
}

export async function getUserRole(uid: string): Promise<'admin' | 'user'> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data().role as 'admin' | 'user';
  }
  return 'user';
}

