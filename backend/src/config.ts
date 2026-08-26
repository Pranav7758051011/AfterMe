import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory or parent
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  isDev: process.env.NODE_ENV !== 'production',
  defaultUserId: 'demo_user_001',

  // Firebase Configuration
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'afterme-ai-app',
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL || '',
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
};
