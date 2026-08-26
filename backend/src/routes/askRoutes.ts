import { Router, Response } from 'express';
import { firestoreRepo } from '../database/firestoreRepo';
import { askAfterMeWithGemini } from '../services/gemini';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { config } from '../config';

const router = Router();
router.use(authMiddleware);

// POST /api/ask - Grounded Conversational Memory Retrieval
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question, current_location } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const userId = req.userId || config.defaultUserId;
    const userLocState = await firestoreRepo.getUserLocation(userId);
    const userLoc = current_location || userLocState.current_location;

    // Fetch user memories from Firestore
    const memories = await firestoreRepo.getAll(userId);

    // Call Gemini with strict anti-hallucination grounding
    const askResult = await askAfterMeWithGemini(question.trim(), memories, userLoc);

    // Resolve memory objects for citations
    const relevantMemories = [];
    for (const id of askResult.relevant_memory_ids) {
      const m = await firestoreRepo.getById(id);
      if (m) relevantMemories.push(m);
    }

    return res.json({
      answer: askResult.answer,
      relevant_memories: relevantMemories,
      has_match: askResult.has_match,
      confidence: askResult.confidence,
      follow_up_hint: askResult.follow_up_hint,
    });
  } catch (error: any) {
    console.error('Error in ask retrieval:', error);
    return res.status(500).json({
      error: 'Failed to process retrieval question.',
      details: error.message,
      answer: `I encountered an issue searching your Firestore memories. Please try again.`,
      relevant_memories: [],
      has_match: false,
    });
  }
});

export default router;
