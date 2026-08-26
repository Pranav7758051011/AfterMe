import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { getAdminFirestore } from '../database/firebaseAdmin';
import { config } from '../config';

const router = Router();

// GET /api/auth/me - Current user session
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId || config.defaultUserId;
  const firestore = getAdminFirestore();

  let profile = {
    userId,
    email: req.userEmail || 'demo@afterme.ai',
    name: req.userName || 'Demo User',
    firebase_connected: Boolean(firestore),
  };

  if (firestore) {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (userDoc.exists) {
        profile = { ...profile, ...userDoc.data() };
      }
    } catch (e) {}
  }

  res.json({
    user: profile,
    status: 'authenticated',
  });
});

// POST /api/auth/demo-switch - Switch active demo user
router.post('/demo-switch', (req: AuthenticatedRequest, res: Response) => {
  const { userId, name, email } = req.body;
  const newUserId = userId || `user_${Date.now()}`;
  res.json({
    success: true,
    user: {
      userId: newUserId,
      name: name || 'Demo User',
      email: email || `${newUserId}@afterme.ai`,
    },
    message: `Switched to user ${newUserId}`,
  });
});

export default router;
