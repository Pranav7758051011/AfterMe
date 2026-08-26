import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCktpf-6YEWje50f-P6jikqG2PspoPV3k0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "afterme-ai-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "afterme-ai-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "afterme-ai-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "377448090451",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:377448090451:web:a3c79e763639e75967efa6",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
