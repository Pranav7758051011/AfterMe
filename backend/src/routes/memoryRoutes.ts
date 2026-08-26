import { Router, Response } from 'express';
import { firestoreRepo, MemoryStatus } from '../database/firestoreRepo';
import { extractMemoryWithGemini } from '../services/gemini';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { config } from '../config';

const router = Router();

// Apply Auth Middleware to all memory routes
router.use(authMiddleware);

// POST /api/memories - Natural language memory input
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, current_location, image_url, image_base64, mime_type, latitude, longitude } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    const userId = req.userId || config.defaultUserId;
    const userLocState = await firestoreRepo.getUserLocation(userId);
    const userLoc = current_location || userLocState.current_location;

    // Use Gemini to extract structured representation (supports Multimodal Vision)
    const extracted = await extractMemoryWithGemini(text.trim(), userLoc, image_base64, mime_type, image_url);

    // Save into Cloud Firestore
    const saved = await firestoreRepo.create({
      user_id: userId,
      original_text: text.trim(),
      memory_type: extracted.memory_type,
      object: extracted.object,
      task: extracted.task,
      event: extracted.event,
      person: extracted.person,
      location: extracted.location || userLoc,
      action: extracted.action,
      date: extracted.date,
      time: extracted.time,
      deadline: extracted.deadline,
      importance: extracted.importance,
      risk_level: extracted.risk_level,
      status: extracted.status,
      image_url: image_url || extracted.image_url || null,
      latitude: latitude !== undefined ? latitude : (extracted.latitude || null),
      longitude: longitude !== undefined ? longitude : (extracted.longitude || null),
    });

    return res.status(201).json({
      success: true,
      memory: saved,
      extraction: extracted,
      message: `Memory created in Firestore: ${extracted.summary}`,
    });
  } catch (error: any) {
    console.error('Error creating memory:', error);
    return res.status(500).json({ error: 'Failed to create memory in Firestore.', details: error.message });
  }
});

// GET /api/memories - List memories with filters for active user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    const { status, memory_type, location, search } = req.query as Record<string, string>;

    const memories = await firestoreRepo.getAll(userId, { status, memory_type, location, search });
    return res.json({ memories, count: memories.length, userId });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch memories from Firestore.', details: error.message });
  }
});

// GET /api/memories/stats - Dashboard metrics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || config.defaultUserId;
    const stats = await firestoreRepo.getStats(userId);
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch stats.', details: error.message });
  }
});

// GET /api/memories/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const memory = await firestoreRepo.getById(id);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found in Firestore.' });
    }
    return res.json({ memory });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch memory.', details: error.message });
  }
});

// PATCH /api/memories/:id/status
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const id = String(req.params.id);
    const updated = await firestoreRepo.updateStatus(id, status as MemoryStatus);
    if (!updated) {
      return res.status(404).json({ error: 'Memory not found.' });
    }

    return res.json({ success: true, memory: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update memory status.', details: error.message });
  }
});

// PATCH /api/memories/:id
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const updated = await firestoreRepo.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Memory not found.' });
    }
    return res.json({ success: true, memory: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update memory.', details: error.message });
  }
});

// DELETE /api/memories/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const success = await firestoreRepo.delete(id);
    return res.json({ success, message: 'Memory deleted from Firestore.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete memory.', details: error.message });
  }
});

export default router;
