// src/firebase/config.js - Firebase Configuration
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// التحقق من صحة الإعدادات
const isValidKey = (key) => key && key.length > 10 && !key.includes('placeholder');
const isConfigured = isValidKey(firebaseConfig.apiKey) && isValidKey(firebaseConfig.projectId);

let app = null;
let auth = null;
let db = null;
let storage = null;
let analytics = null;

// Firebase initialization
if (firebaseConfig.projectId) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    // Storage is optional. The current free image flow stores compressed
    // data URLs in Firestore, so the app must not depend on a paid bucket.
    if (firebaseConfig.storageBucket) {
      storage = getStorage(app);
    }
    auth = getAuth(app); // Initialize auth immediately
  } catch (error) {
    console.error('Firebase init error:', error);
  }
}

// Analytics with lazy loading
const ensureAnalytics = async () => {
  if (!app || analytics || !firebaseConfig.measurementId) return null;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
    }
  } catch {
    analytics = null;
  }
  return analytics;
};

// Default export
export default {
  app,
  auth,
  db,
  storage,
  analytics,
  ensureAnalytics,
  isConfigured
};

// Named exports
export { app, auth, db, storage, analytics, ensureAnalytics, isConfigured };