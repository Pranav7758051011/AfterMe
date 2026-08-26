import { Router, Response } from 'express';
import { firestoreRepo } from '../database/firestoreRepo';
import { extractMemoryWithGemini } from '../services/gemini';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { config } from '../config';

const router = Router();
router.use(authMiddleware);

// POST /api/demo/reset - Reset everything for a fresh demo in Firestore
router.post('/reset', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    await firestoreRepo.clearUserData(userId);
    await firestoreRepo.updateUserLocation(userId, 'Conference Room', 'Office');
    return res.json({ success: true, message: 'All demo data cleared and location reset in Firestore.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to reset demo data.', details: error.message });
  }
});

// POST /api/demo/seed-golden - Prepares the exact state for Golden Demo Step 1
router.post('/seed-golden', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    await firestoreRepo.clearUserData(userId);
    await firestoreRepo.updateUserLocation(userId, 'Conference Room', 'Office');

    const text = 'I left my black laptop charger in the conference room.';
    const extracted = await extractMemoryWithGemini(text, 'Conference Room');

    const mem = await firestoreRepo.create({
      user_id: userId,
      original_text: text,
      memory_type: 'belonging',
      object: 'black laptop charger',
      location: 'Conference Room',
      action: 'left',
      importance: 'high',
      risk_level: 'high',
      status: 'active',
    });

    return res.json({
      success: true,
      message: 'Golden Demo seeded in Firestore! Memory created and location set to Conference Room.',
      memory: mem,
      current_location: 'Conference Room',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to seed golden demo.', details: error.message });
  }
});

// POST /api/demo/seed-full - Seeds all rich scenarios
router.post('/seed-full', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    await firestoreRepo.clearUserData(userId);
    await firestoreRepo.updateUserLocation(userId, 'Conference Room', 'Office');

    const seedItems = [
      {
        text: 'I left my black laptop charger in the conference room.',
        type: 'belonging' as const,
        object: 'black laptop charger',
        location: 'Conference Room',
        action: 'left',
        importance: 'high' as const,
        risk: 'high' as const,
        status: 'active' as const,
      },
      {
        text: 'My passport is in the blue folder in the top desk drawer.',
        type: 'document' as const,
        object: 'passport',
        location: 'blue folder in top desk drawer',
        action: 'placed',
        importance: 'critical' as const,
        risk: 'critical' as const,
        status: 'active' as const,
      },
      {
        text: 'I have a visa appointment tomorrow at 10 AM at the embassy.',
        type: 'event' as const,
        event: 'Visa appointment at embassy',
        location: 'Embassy',
        date: 'Tomorrow',
        time: '10:00 AM',
        importance: 'critical' as const,
        risk: 'critical' as const,
        status: 'active' as const,
      },
      {
        text: 'I need to submit my final project report to Professor Davis by Friday.',
        type: 'task' as const,
        task: 'Submit final project report',
        person: 'Professor Davis',
        deadline: 'Friday',
        importance: 'high' as const,
        risk: 'high' as const,
        status: 'active' as const,
      },
      {
        text: 'I left my AirPods on the 2nd floor library study table.',
        type: 'belonging' as const,
        object: 'AirPods',
        location: 'Library (2nd floor)',
        action: 'left',
        importance: 'high' as const,
        risk: 'high' as const,
        status: 'active' as const,
      }
    ];

    const created = [];
    for (const item of seedItems) {
      const mem = await firestoreRepo.create({
        user_id: userId,
        original_text: item.text,
        memory_type: item.type,
        object: item.object || null,
        task: item.task || null,
        event: item.event || null,
        person: item.person || null,
        location: item.location || null,
        action: item.action || null,
        date: item.date || null,
        time: item.time || null,
        deadline: item.deadline || null,
        importance: item.importance,
        risk_level: item.risk,
        status: item.status,
      });
      created.push(mem);
    }

    return res.json({
      success: true,
      message: `Full scenario seeded with ${created.length} rich memories in Firestore!`,
      memories: created,
      current_location: 'Conference Room',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to seed full demo data.', details: error.message });
  }
});

export default router;
