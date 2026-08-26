import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

let isInitialized = false;
let isRealFirestore = false;

export function initializeFirebaseAdmin(): { isReal: boolean } {
  if (getApps().length > 0) {
    return { isReal: isRealFirestore };
  }

  try {
    // 1. Check for explicit Service Account credentials in ENV
    if (config.firebaseClientEmail && config.firebasePrivateKey) {
      initializeApp({
        credential: cert({
          projectId: config.firebaseProjectId,
          clientEmail: config.firebaseClientEmail,
          privateKey: config.firebasePrivateKey,
        }),
      });
      isInitialized = true;
      isRealFirestore = true;
      console.log('🔥 Firebase Admin connected successfully to Cloud Firestore via ENV Service Account.');
      return { isReal: true };
    }

    // 2. Check for serviceAccountKey.json file
    const serviceAccountFile = config.googleApplicationCredentials || path.resolve(__dirname, '../../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountFile)) {
      initializeApp({
        credential: cert(serviceAccountFile),
      });
      isInitialized = true;
      isRealFirestore = true;
      console.log(`🔥 Firebase Admin connected via service account file: ${serviceAccountFile}`);
      return { isReal: true };
    }

    // 3. Check for GCP / Application Default Credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      initializeApp({
        credential: applicationDefault(),
        projectId: config.firebaseProjectId,
      });
      isInitialized = true;
      isRealFirestore = true;
      console.log('🔥 Firebase Admin connected via Google Application Default Credentials.');
      return { isReal: true };
    }

    // 4. Fallback Mode (Resilient zero-setup offline/mock layer)
    isInitialized = true;
    isRealFirestore = false;
    console.log('ℹ️ Firebase Admin running in Local Firestore Adapter Mode.');
    return { isReal: false };
  } catch (err: any) {
    console.warn('ℹ️ Firebase Admin initialization notice:', err?.message || err);
    isInitialized = true;
    isRealFirestore = false;
    return { isReal: false };
  }
}

export function getAdminFirestore(): Firestore | null {
  if (!isInitialized) initializeFirebaseAdmin();
  if (!isRealFirestore) return null;
  try {
    return getFirestore();
  } catch (e) {
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  if (!isInitialized) initializeFirebaseAdmin();
  if (!isRealFirestore) return null;
  try {
    return getAuth();
  } catch (e) {
    return null;
  }
}

export function getAdminMessaging(): Messaging | null {
  if (!isInitialized) initializeFirebaseAdmin();
  if (!isRealFirestore) return null;
  try {
    return getMessaging();
  } catch (e) {
    return null;
  }
}

export function isRealFirebaseConnected(): boolean {
  return isRealFirestore;
}
