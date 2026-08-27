import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
// Live Gemini 2.5 Flash & Firebase Active
import { initializeFirebaseAdmin, getAdminFirestore } from './database/firebaseAdmin';
import memoryRoutes from './routes/memoryRoutes';
import askRoutes from './routes/askRoutes';
import locationRoutes from './routes/locationRoutes';
import demoRoutes from './routes/demoRoutes';
import authRoutes from './routes/authRoutes';

const app = express();

// Enable CORS for web and mobile clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json());

// Initialize Firebase Admin & Firestore
const fbStatus = initializeFirebaseAdmin();

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  const firestore = getAdminFirestore();
  res.json({
    status: 'ok',
    product: 'AfterMe',
    backend: 'Firebase (Firestore + Auth + Functions + FCM)',
    firebase_connected: Boolean(firestore),
    firebase_project_id: config.firebaseProjectId,
    gemini_configured: Boolean(config.geminiApiKey && config.geminiApiKey.trim() !== ''),
    gemini_model: config.geminiModel,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/ask', askRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/demo', demoRoutes);

// Root greeting
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AfterMe Firebase Backend API',
    tagline: 'Your AI memory layer that remembers what you said, understands where you left things, and proactively reminds you before you forget them.',
    backend: 'Firebase Firestore & Cloud Functions',
    endpoints: {
      health: 'GET /api/health',
      auth: 'GET /api/auth/me',
      memories: 'GET/POST /api/memories',
      ask: 'POST /api/ask',
      location: 'GET/POST /api/location/change',
      demo: 'POST /api/demo/seed-golden'
    }
  });
});

// Start standalone Express server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, config.host, () => {
    console.log(`=============================================`);
    console.log(`🔥 AfterMe Firebase Backend Server running`);
    console.log(`🌐 URL: http://${config.host}:${config.port}`);
    console.log(`📦 Firebase Project: ${config.firebaseProjectId}`);
    console.log(`🧠 Gemini Model: ${config.geminiModel}`);
    console.log(`🔑 Gemini Key: ${config.geminiApiKey ? 'CONFIGURED' : 'OFFLINE HEURISTICS'}`);
    console.log(`=============================================`);
  });
}

export default app;
