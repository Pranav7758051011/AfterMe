import { Router, Response } from 'express';
import { firestoreRepo } from '../database/firestoreRepo';
import { proactiveEngine } from '../services/proactiveEngine';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { config } from '../config';

const router = Router();
router.use(authMiddleware);

// GET /api/location - Get user's current location state
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    const locationState = await firestoreRepo.getUserLocation(userId);
    return res.json(locationState);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get location state.', details: error.message });
  }
});

// POST /api/location/change - Simulate or receive location departure/transition
router.post('/change', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { previous_location, current_location } = req.body;
    if (!current_location) {
      return res.status(400).json({ error: 'current_location is required.' });
    }

    const userId = req.userId || config.defaultUserId;
    const prevLocState = await firestoreRepo.getUserLocation(userId);
    const prev = previous_location || prevLocState.current_location;

    // Run proactive departure intelligence engine
    const evaluation = await proactiveEngine.handleLocationChange(userId, prev, current_location);

    return res.json(evaluation);
  } catch (error: any) {
    console.error('Error changing location:', error);
    return res.status(500).json({ error: 'Failed to process location change.', details: error.message });
  }
});

// POST /api/location/gps - Real-time GPS coordinate update & geofence evaluation
router.post('/gps', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { latitude, longitude, accuracy, place_name } = req.body;
    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ 
        error: 'Invalid coordinates provided. Latitude must be between -90 and 90, Longitude between -180 and 180.',
        received: { latitude, longitude }
      });
    }

    const userId = req.userId || config.defaultUserId;
    const result = await proactiveEngine.handleGPSLocationUpdate(
      userId,
      latNum,
      lngNum,
      accuracy !== undefined ? Number(accuracy) : 10,
      place_name
    );

    return res.json(result);
  } catch (error: any) {
    console.error('Error processing GPS location:', error);
    return res.status(500).json({ error: 'Failed to process GPS location.', details: error.message });
  }
});

// GET /api/location/alerts - Get all active proactive warnings
router.get('/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    const alerts = await firestoreRepo.getActiveAlerts(userId);
    return res.json({ alerts, count: alerts.length });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to get alerts from Firestore.', details: error.message });
  }
});

// POST /api/location/alerts/:id/dismiss
router.post('/alerts/:id/dismiss', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    const id = String(req.params.id);
    const existingAlert = await firestoreRepo.getAlertById(id);
    
    if (!existingAlert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }
    if (existingAlert.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot dismiss foreign user alert.' });
    }

    const success = await firestoreRepo.dismissAlert(id);
    return res.json({ success, message: 'Alert dismissed in Firestore.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to dismiss alert.', details: error.message });
  }
});

// POST /api/location/beacon - BLE Beacon RSSI signal ingestion & indoor micro-zone resolution
router.post('/beacon', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { signals } = req.body;
    if (!signals || !Array.isArray(signals)) {
      return res.status(400).json({ error: 'signals array is required.' });
    }

    const { resolveIndoorPosition } = await import('../services/indoorLocalization');
    const result = resolveIndoorPosition(signals);

    const userId = req.userId || config.defaultUserId;
    if (result.resolvedZone && result.confidence > 0.4) {
      await firestoreRepo.updateUserLocation(userId, result.resolvedZone);
    }

    return res.json({
      success: true,
      indoor_position: result
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to resolve indoor position.', details: error.message });
  }
});

export default router;
