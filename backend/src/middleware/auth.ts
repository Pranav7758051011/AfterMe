import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../database/firebaseAdmin';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
  isAnonymous?: boolean;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAdminAuth();

    if (auth) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.userId = decodedToken.uid;
        req.userEmail = decodedToken.email;
        req.userName = decodedToken.name || decodedToken.email?.split('@')[0] || 'User';
        req.isAnonymous = Boolean(decodedToken.firebase?.sign_in_provider === 'anonymous');
        return next();
      } catch (err: any) {
        console.warn('Firebase token verification warning:', err?.message || err);
      }
    }
  }

  // Fallback to x-user-id header, body/query userId, or default demo user
  req.userId = (req.headers['x-user-id'] as string) || (req.body?.user_id as string) || (req.query?.user_id as string) || config.defaultUserId;
  req.userEmail = `${req.userId}@afterme.ai`;
  req.userName = req.userId.replace(/_/g, ' ');
  req.isAnonymous = false;

  next();
}
