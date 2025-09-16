import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase config - uses environment variables in production, demo config in development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore only
export const db = getFirestore(app);

// Connect to Firestore emulator in development (only if explicitly enabled)
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔥 Connected to Firestore emulator at localhost:8080');
  } catch (error) {
    console.log(
      'Firestore emulator connection failed:',
      (error as Error).message
    );
  }
} else if (import.meta.env.DEV) {
  console.log('🚀 Using REAL Firebase in development mode');
  console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

export default app;
