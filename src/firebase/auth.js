// src/firebase/auth.js - Firebase Authentication Service
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { auth } from './config';
import { OWNER_EMAILS } from '../utils/ownerEmails';

const googleProvider = new GoogleAuthProvider();

export const signIn = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.code };
  }
};

export const signUp = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    await sendEmailVerification(result.user);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.code };
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.code };
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.code };
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.code };
  }
};

export const reauthenticate = async (password) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.code };
  }
};

export const changeEmail = async (newEmail, password) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user');
    await reauthenticate(password);
    await verifyBeforeUpdateEmail(user, newEmail);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.code };
  }
};

export const getCurrentUser = () => auth?.currentUser;

export const onAuthChange = (callback) => {
  if (!auth || typeof onAuthStateChanged !== 'function') return () => {};
  return onAuthStateChanged(auth, callback);
};

export const isAdmin = (email) => {
  if (typeof email !== 'string') return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
};