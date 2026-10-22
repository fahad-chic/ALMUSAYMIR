// src/firebase/index.js - Firebase Module Export
// Main entry point for all Firebase services

// Core config
export { default as app, auth, db, storage, analytics, ensureAnalytics } from './config';

// Auth service
export * from './auth';

// Firestore service
export * from './firestore';

// Storage service
export * from './storage';

// Re-export Firestore functions needed by AdminDashboard & OwnerPrivateRoom
export { 
  doc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
  getDoc,
  setDoc,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CART: 'cart',
  FAVORITES: 'favorites',
  REVIEWS: 'reviews',
  CATEGORIES: 'categories',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  MESSAGES: 'messages',
  BANNERS: 'banners',
  COUPONS: 'coupons',
  COMPLAINTS: 'complaints',
  REPORTS: 'reports',
  BROADCASTS: 'broadcasts',
  SECURITY_LOGS: 'security_logs'
};

// Utility: Check if Firebase is configured
export const isFirebaseConfigured = () => {
  const required = [
    import.meta.env.VITE_FIREBASE_API_KEY,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    import.meta.env.VITE_FIREBASE_APP_ID
  ];
  return required.every(Boolean);
};

// Utility: Get store config from env
export const getStoreConfig = () => ({
  name: import.meta.env.VITE_STORE_NAME || 'المسيمير | ALMUSAYMIR',
  description: import.meta.env.VITE_STORE_DESCRIPTION || 'متجر شامل',
  phone1: import.meta.env.VITE_PHONE_1,
  phone2: import.meta.env.VITE_PHONE_2,
  whatsapp1: import.meta.env.VITE_CONTACT_WHATSAPP_1,
  whatsapp2: import.meta.env.VITE_CONTACT_WHATSAPP_2,
  bankRajhi: {
    name: import.meta.env.VITE_BANK_RAJHI_NAME || 'بنك الراجحي',
    iban: import.meta.env.VITE_BANK_RAJHI_IBAN,
    account: import.meta.env.VITE_BANK_RAJHI_ACCOUNT
  },
  bankArabi: {
    name: import.meta.env.VITE_BANK_ARABI_NAME || 'البنك العربي',
    iban: import.meta.env.VITE_BANK_ARABI_IBAN,
    account: import.meta.env.VITE_BANK_ARABI_ACCOUNT
  },
  // نفس القيمة الاحتياطية المستخدمة في App.jsx وAuthContext وauth.js
  // حتى تبقى صلاحيات المالك موحدة عند اختلاف متغيرات البيئة.
  adminEmails: (
    import.meta.env.VITE_OWNER_EMAILS ||
    import.meta.env.VITE_ADMIN_EMAILS ||
    'f882771f@gmail.com,kal6667222@gmail.com'
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  aliyaConfig: {
    name: import.meta.env.VITE_ALIAA_NAME || 'فهد',
    greeting: import.meta.env.VITE_ALIAA_GREETING || 'ياهلا!',
    personality: import.meta.env.VITE_ALIAA_PERSONALITY,
    owner: import.meta.env.VITE_ALIAA_OWNER,
    established: import.meta.env.VITE_ALIAA_ESTABLISHED,
    location: import.meta.env.VITE_ALIAA_LOCATION,
    contacts: import.meta.env.VITE_ALIAA_CONTACTS
  }
});

// Utility: Admin check
export const isAdminEmail = (email) => {
  const adminEmails = getStoreConfig().adminEmails;
  const normalized = String(email || '').trim().toLowerCase();
  return !!normalized && adminEmails.includes(normalized);
};