import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Helper function to safely get environment variables
function getEnvVar(key: string, fallback: string = ''): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
}

// Firebase web configuration comes from the local .env file.
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

const firebaseEnvNames = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const;

const missingFirebaseEnvVars = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => firebaseEnvNames[key as keyof typeof firebaseEnvNames]);

let firebaseInitializationError: string | undefined;

// Initialize Firebase
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

if (typeof window !== 'undefined') {
  try {
    if (missingFirebaseEnvVars.length > 0) {
      throw new Error(`Missing Firebase environment variables: ${missingFirebaseEnvVars.join(', ')}`);
    }

    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    firebaseInitializationError = error instanceof Error ? error.message : 'Unknown Firebase initialization error';
    console.error('Firebase initialization error:', firebaseInitializationError);
    console.warn('Set the required VITE_FIREBASE_* variables in your local .env file or deployment environment.');
  }
}

// Check if Firebase services are initialized
export const isFirebaseInitialized = () => {
  return !!(app && auth && db && storage);
};

export const getFirebaseInitializationError = () => firebaseInitializationError;

export { app, auth, db, storage };
