import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { config } from '../config';
import { Memory, MemoryType, RiskLevel, MemoryStatus } from '../database/memoryRepo';
import { metricsTracker } from './metricsTracker';
import { rankCandidateMemories, generateGeminiEmbedding } from './vectorRetrieval';

export interface ExtractedMemory {
  memory_type: MemoryType;
  object: string | null;
  task: string | null;
  event: string | null;
  person: string | null;
  location: string | null;
  action: string | null;
  date: string | null;
  time: string | null;
  deadline: string | null;
  importance: RiskLevel;
  risk_level: RiskLevel;
  status: MemoryStatus;
  image_url?: string | null;
  summary: string;
  confidence: number;
  reasoning: string;
}

export interface AskResult {
  answer: string;
  has_match: boolean;
  confidence: number;
  relevant_memory_ids: string[];
  follow_up_hint?: string;
}

// ─── Zod Schema Definitions for Deterministic Validation ───────────

const MemoryTypeEnum = z.enum([
  'belonging',
  'location',
  'task',
  'event',
  'person',
  'document',
  'idea',
  'other',
]);

const RiskLevelEnum = z.enum(['low', 'medium', 'high', 'critical']);

const MemoryStatusEnum = z.enum([
  'active',
  'potentially_forgotten',
  'retrieved',
  'completed',
  'archived',
]);

export const ExtractedMemorySchema = z.object({
  memory_type: MemoryTypeEnum.catch('belonging'),
  object: z.string().nullable().catch(null),
  task: z.string().nullable().catch(null),
  event: z.string().nullable().catch(null),
  person: z.string().nullable().catch(null),
  location: z.string().nullable().catch(null),
  action: z.string().nullable().catch(null),
  date: z.string().nullable().catch(null),
  time: z.string().nullable().catch(null),
  deadline: z.string().nullable().catch(null),
  importance: RiskLevelEnum.catch('medium'),
  risk_level: RiskLevelEnum.catch('medium'),
  status: MemoryStatusEnum.catch('active'),
  image_url: z.string().nullable().optional(),
  summary: z.string().catch(''),
  confidence: z.number().min(0).max(1).catch(0.9),
  reasoning: z.string().catch(''),
});

export const AskResultSchema = z.object({
  answer: z.string().min(1),
  has_match: z.boolean().catch(false),
  confidence: z.number().min(0).max(1).catch(0.85),
  relevant_memory_ids: z.array(z.string()).catch([]),
  follow_up_hint: z.string().optional().nullable(),
});

// ─── Robust JSON Parsing & Markdown Sanitizer ──────────────────────

/**
 * Safely extracts and parses JSON from raw LLM output, handling markdown codeblocks,
 * surrounding conversational text, and whitespace.
 */
export function parseAndSanitizeJSON(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or non-string model response received.');
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences (e.g. ```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // If there is still extraneous text before or after the JSON block, extract { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

// ─── Fallback Rule-Based Heuristic Extractor ────────────────────────

export function fallbackExtract(text: string, userLocation?: string, imageUrl?: string): ExtractedMemory {
  const safeText = (text || '').trim();
  const lower = safeText.toLowerCase();

  // High risk item keywords
  const criticalKeywords = ['passport', 'medication', 'medicine', 'prescription', 'wallet', 'credit card', 'id card', 'driver license', 'keys', 'car keys', 'house keys', 'car', 'vehicle'];
  const highKeywords = ['laptop', 'charger', 'macbook', 'phone', 'iphone', 'airpods', 'headphones', 'watch', 'ipad', 'tablet', 'backpack', 'purse', 'folder', 'documents', 'contract', 'presentation'];

  let risk: RiskLevel = 'low';
  if (criticalKeywords.some(k => lower.includes(k))) {
    risk = 'critical';
  } else if (highKeywords.some(k => lower.includes(k))) {
    risk = 'high';
  } else if (lower.includes('important') || lower.includes('urgent') || lower.includes('tomorrow') || lower.includes('deadline')) {
    risk = 'medium';
  }

  // Parking spot detection
  let detectedLocation: string | null = null;
  if (lower.includes('parked') || lower.includes('parking')) {
    const bayMatch = safeText.match(/(?:bay|spot|slot|section|pillar)\s*([a-z0-9\-]+)/i) ||
                     safeText.match(/(?:level|floor)\s*([a-z0-9\-]+)/i);
    if (bayMatch) {
      detectedLocation = `Parking Spot ${bayMatch[1].toUpperCase()}`;
    } else {
      detectedLocation = userLocation || 'Parking Garage / Street';
    }
  }

  // Location extraction
  if (!detectedLocation) {
    const locPatterns = [
      /(?:in|at|on|inside|near|by)\s+(?:the\s+)?([a-z0-9\s\-]+?)(?:\.|$|,|and\s|tomorrow|today|yesterday)/i,
      /(?:conference room|meeting room|library|cafeteria|office|desk|car|hotel|airport|bedroom|kitchen|living room|blue folder|cabinet|drawer)/i
    ];

    for (const pattern of locPatterns) {
      const match = safeText.match(pattern);
      if (match && match[1]) {
        detectedLocation = match[1].trim();
        break;
      } else if (match && match[0]) {
        detectedLocation = match[0].trim();
        break;
      }
    }
  }

  // Object extraction
  let detectedObject: string | null = null;
  if (lower.includes('car') || lower.includes('vehicle') || lower.includes('parked')) {
    detectedObject = 'Parked Car / Vehicle';
  } else {
    const objMatch = safeText.match(/(?:my|the|a|an)\s+([a-z0-9\s]+?)(?:\s+(?:in|at|on|is|was|left|to|for|with)|$|\.)/i);
    if (objMatch && objMatch[1]) {
      detectedObject = objMatch[1].trim();
    }
  }

  // Detect Type
  let type: MemoryType = 'belonging';
  let task: string | null = null;
  let event: string | null = null;
  let person: string | null = null;
  let date: string | null = null;
  let deadline: string | null = null;

  if (lower.includes('need to') || lower.includes('have to') || lower.includes('must') || lower.includes('todo') || lower.includes('submit') || lower.includes('send')) {
    type = 'task';
    task = safeText.replace(/^(i need to|i have to|must|todo|remember to)\s+/i, '').trim();
    if (lower.includes('tomorrow')) deadline = 'tomorrow';
    if (lower.includes('friday')) deadline = 'Friday';
    if (lower.includes('5 pm') || lower.includes('5pm')) deadline = '5:00 PM';
    if (lower.includes('8 pm') || lower.includes('8pm')) deadline = '8:00 PM';
  } else if (lower.includes('meeting') || lower.includes('appointment') || lower.includes('interview') || lower.includes('flight') || lower.includes('presentation')) {
    type = 'event';
    event = safeText;
    if (lower.includes('tomorrow')) date = 'Tomorrow';
  } else if (lower.includes('folder') || lower.includes('passport') || lower.includes('visa') || lower.includes('file') || lower.includes('document')) {
    type = 'document';
  } else if (lower.includes('left') || lower.includes('charger') || lower.includes('wallet') || lower.includes('keys') || lower.includes('airpods') || lower.includes('laptop') || lower.includes('parked')) {
    type = 'belonging';
  }

  // Detect Person
  const personMatch = safeText.match(/(?:to|with|for|from|dr\.|prof\.|professor|mr\.|ms\.)\s+([A-Z][a-z]+)/);
  if (personMatch) {
    person = personMatch[1];
  } else if (lower.includes('professor')) {
    person = 'Professor';
  }

  // Determine status
  let status: MemoryStatus = 'active';
  if ((lower.includes('left') || lower.includes('parked')) && (risk === 'high' || risk === 'critical')) {
    status = 'potentially_forgotten';
  }

  return {
    memory_type: type,
    object: detectedObject || (type === 'belonging' ? (safeText || 'Item') : null),
    task: task,
    event: event,
    person: person,
    location: detectedLocation || userLocation || null,
    action: lower.includes('left') ? 'left' : (lower.includes('parked') ? 'parked' : 'placed'),
    date: date,
    time: null,
    deadline: deadline,
    importance: risk,
    risk_level: risk,
    status: status,
    image_url: imageUrl || null,
    summary: safeText || 'Recorded memory',
    confidence: 0.88,
    reasoning: 'Extracted via deterministic heuristic parsing engine (Offline fallback).'
  };
}

// ─── Gemini Multimodal Extraction with Schema Validation ────────────

export async function extractMemoryWithGemini(
  text: string,
  currentLocation?: string,
  imageBase64?: string,
  mimeType = 'image/jpeg',
  imageUrl?: string
): Promise<ExtractedMemory> {
  const safeText = (text || '').trim();

  // If input text and image are both completely empty, return safe default
  if (!safeText && !imageBase64 && !imageUrl) {
    return fallbackExtract('Unspecified item', currentLocation, imageUrl);
  }

  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey.trim() === '') {
    return fallbackExtract(safeText, currentLocation, imageUrl || imageBase64);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const textPrompt = `
You are the AI multimodal extraction engine for "AfterMe", an intelligent proactive memory assistant.
Analyze the user's natural language memory statement:
"${safeText}"
Current location context: ${currentLocation || 'Unknown'}

Extract structured information. Strict Rules:
1. memory_type must be one of: "belonging", "location", "task", "event", "person", "document", "idea", "other".
2. If the user mentions leaving an item or parking a vehicle (e.g. "I left my black charger in conference room" or "Parked car at Bay B4"), memory_type is "belonging", object is the item/car, location is the place/bay, action is "left" or "parked".
3. If an image is attached, inspect the image to identify objects, visual text (like parking spot numbers, locker IDs, shelf levels), and describe exact location.
4. importance & risk_level: "low", "medium", "high", "critical". Critical items: passports, medications, wallets, keys, parked vehicles. High items: chargers, laptops, phones, official documents, headphones.
5. status: If user explicitly mentions leaving an item somewhere unattended or parking, set status to "potentially_forgotten", otherwise "active".
6. Extract exact entities: object, task, event, person, location, date, time, deadline.
7. Provide a clean, short summary and 1-sentence reasoning for the classification.

Respond ONLY with valid JSON matching this schema:
{
  "memory_type": "belonging",
  "object": "string or null",
  "task": "string or null",
  "event": "string or null",
  "person": "string or null",
  "location": "string or null",
  "action": "string or null",
  "date": "string or null",
  "time": "string or null",
  "deadline": "string or null",
  "importance": "low | medium | high | critical",
  "risk_level": "low | medium | high | critical",
  "status": "active | potentially_forgotten",
  "summary": "concise description",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}
`;

    let contents: any = textPrompt;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents = [
        textPrompt,
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          }
        }
      ];
    }

    const t0 = Date.now();
    const response = await ai.models.generateContent({
      model: config.geminiModel || 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
      }
    });
    const latencyMs = Date.now() - t0;

    const outputText = response.text;
    if (outputText) {
      metricsTracker.recordExtraction(latencyMs, true, safeText.length, outputText.length);
      const rawJson = parseAndSanitizeJSON(outputText);
      const validated = ExtractedMemorySchema.parse(rawJson);

      return {
        memory_type: validated.memory_type as MemoryType,
        object: validated.object || null,
        task: validated.task || null,
        event: validated.event || null,
        person: validated.person || null,
        location: validated.location || null,
        action: validated.action || null,
        date: validated.date || null,
        time: validated.time || null,
        deadline: validated.deadline || null,
        importance: validated.importance as RiskLevel,
        risk_level: validated.risk_level as RiskLevel,
        status: (validated.status || (validated.risk_level === 'high' || validated.risk_level === 'critical' ? 'potentially_forgotten' : 'active')) as MemoryStatus,
        image_url: imageUrl || imageBase64 || null,
        summary: validated.summary || safeText,
        confidence: typeof validated.confidence === 'number' ? Math.min(Math.max(validated.confidence, 0), 1) : 0.95,
        reasoning: validated.reasoning || 'Extracted via Google Gemini Multimodal Vision.'
      };
    }
  } catch (error: any) {
    console.warn('[Gemini API Warning] Multimodal extraction failed or output was malformed. Falling back to heuristic engine.', error?.message || error);
  }

  const fallbackT0 = Date.now();
  const fallbackResult = fallbackExtract(safeText, currentLocation, imageUrl || imageBase64);
  metricsTracker.recordExtraction(Date.now() - fallbackT0, false, safeText.length, fallbackResult.summary.length);
  return fallbackResult;
}

// ─── Gemini Grounded Retrieval with Citation Validation ─────────────

export async function askAfterMeWithGemini(
  question: string,
  memories: Memory[],
  currentLocation?: string
): Promise<AskResult> {
  const safeQuestion = (question || '').trim();
  const lowerQ = safeQuestion.toLowerCase();

  if (!safeQuestion) {
    return {
      answer: 'Please ask a question about your belongings, commitments, or recorded places.',
      has_match: false,
      confidence: 1.0,
      relevant_memory_ids: []
    };
  }

  if (!memories || memories.length === 0) {
    return {
      answer: `I don't have any saved memories yet. Tell me what you'd like me to remember (e.g., "I left my charger in the conference room").`,
      has_match: false,
      confidence: 1.0,
      relevant_memory_ids: [],
      follow_up_hint: 'Try creating a memory first.'
    };
  }

  const validMemoryIdSet = new Set(memories.map(m => m.id));

  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey.trim() === '') {
    // Offline heuristic matching
    const matching = memories.filter(m => {
      const text = `${m.original_text} ${m.object || ''} ${m.location || ''} ${m.task || ''} ${m.person || ''}`.toLowerCase();
      const words = lowerQ.replace(/[?.,!]/g, '').split(/\s+/).filter(w => w.length > 2 && !['where', 'what', 'did', 'leave', 'have', 'the', 'my', 'is', 'are'].includes(w));
      return words.some(w => text.includes(w));
    });

    if (matching.length === 0) {
      return {
        answer: `I don't have a memory matching "${safeQuestion}". I only recall what you have explicitly recorded.`,
        has_match: false,
        confidence: 0.9,
        relevant_memory_ids: [],
        follow_up_hint: 'Check your saved memories list or record a new one.'
      };
    }

    const primary = matching[0];
    let answerText = '';
    if (primary.object?.toLowerCase().includes('car') || primary.location?.toLowerCase().includes('parking')) {
      answerText = `Your vehicle is parked at **${primary.location || 'your recorded parking spot'}**.`;
    } else if (primary.memory_type === 'belonging' && primary.location) {
      answerText = `You previously mentioned leaving your ${primary.object || 'item'} in the **${primary.location}**.`;
    } else if (primary.memory_type === 'document' && primary.location) {
      answerText = `Your ${primary.object || 'document'} is stored in **${primary.location}**.`;
    } else if (primary.memory_type === 'task') {
      answerText = `You have a pending task: **${primary.task || primary.original_text}**${primary.deadline ? ` (Deadline: ${primary.deadline})` : ''}.`;
    } else {
      answerText = `Based on your memory: "${primary.original_text}".`;
    }

    return {
      answer: answerText,
      has_match: true,
      confidence: 0.9,
      relevant_memory_ids: matching.map(m => m.id),
      follow_up_hint: matching.length > 1 ? `Found ${matching.length} related records.` : undefined
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Semantic Vector + BM25 Hybrid Pre-filtering (scales efficiently to thousands of memories)
    const rankedCandidates = await rankCandidateMemories(safeQuestion, memories, 8);
    const candidateMemories = rankedCandidates.length > 0 ? rankedCandidates.map(rc => rc.memory) : memories;

    const memoryContext = candidateMemories.map((m, idx) => ({
      index: idx + 1,
      id: m.id,
      original_text: m.original_text,
      type: m.memory_type,
      object: m.object,
      location: m.location,
      task: m.task,
      person: m.person,
      date: m.date,
      time: m.time,
      deadline: m.deadline,
      status: m.status,
      has_photo: Boolean(m.image_url),
      created_at: m.created_at
    }));

    const prompt = `
You are "AfterMe", an AI personal memory retrieval layer.
User Question: "${safeQuestion}"
Current User Location: ${currentLocation || 'Unknown'}

Available Stored Memories:
${JSON.stringify(memoryContext, null, 2)}

STRICT GROUNDING & HALLUCINATION-MITIGATION RULES:
1. ONLY answer based on the stored memories provided above.
2. If the user asks about an item, location, or task that DOES NOT exist in the stored memories, DO NOT GUESS OR INVENT ANY INFORMATION.
   Instead, explicitly respond: "I don't have a memory of [subject]. You haven't mentioned it yet."
3. When matching memories exist, synthesize a clear, helpful, direct response citing the location, object, or commitment accurately.
4. If multiple memories connect (e.g. passport in blue folder and a visa appointment), explain the connection!
5. Identify the exact matching memory IDs from the list provided.

Return JSON in this format:
{
  "answer": "Clear grounded answer",
  "has_match": true,
  "confidence": 0.95,
  "relevant_memory_ids": ["id1", "id2"],
  "follow_up_hint": "optional hint or null"
}
`;

    const t0 = Date.now();
    const response = await ai.models.generateContent({
      model: config.geminiModel || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });
    const latencyMs = Date.now() - t0;

    const outputText = response.text;
    if (outputText) {
      metricsTracker.recordAskQuery(latencyMs, true, memories.length, outputText.length);
      const rawJson = parseAndSanitizeJSON(outputText);
      const validated = AskResultSchema.parse(rawJson);

      // Strict Citation Filter: Only keep IDs that actually exist in the passed memory array
      const verifiedMemoryIds = (validated.relevant_memory_ids || []).filter(id => validMemoryIdSet.has(id));

      const hasValidMatch = Boolean(validated.has_match && verifiedMemoryIds.length > 0);

      return {
        answer: validated.answer,
        has_match: hasValidMatch,
        confidence: typeof validated.confidence === 'number' ? Math.min(Math.max(validated.confidence, 0), 1) : 0.95,
        relevant_memory_ids: verifiedMemoryIds,
        follow_up_hint: validated.follow_up_hint || undefined,
      };
    }
  } catch (error: any) {
    console.warn('[Gemini Ask Warning] API retrieval call failed or output was malformed. Falling back to grounded heuristics.', error?.message || error);
  }

  const fallbackT0 = Date.now();
  // Fallback heuristic retrieval if API fails or returns invalid response
  const matching = memories.filter(m => {
    const text = `${m.original_text} ${m.object || ''} ${m.location || ''} ${m.task || ''}`.toLowerCase();
    const words = lowerQ.replace(/[?.,!]/g, '').split(/\s+/).filter(w => w.length > 2 && !['where', 'what', 'did', 'leave', 'have', 'the', 'my', 'is', 'are'].includes(w));
    return words.some(w => text.includes(w));
  });

  if (matching.length === 0) {
    const res: AskResult = {
      answer: `I don't have a memory matching "${safeQuestion}".`,
      has_match: false,
      confidence: 0.8,
      relevant_memory_ids: []
    };
    metricsTracker.recordAskQuery(Date.now() - fallbackT0, false, memories.length, res.answer.length);
    return res;
  }

  const fallbackAnswer = `Based on your memory: "${matching[0].original_text}".`;
  const res: AskResult = {
    answer: fallbackAnswer,
    has_match: true,
    confidence: 0.85,
    relevant_memory_ids: matching.map(m => m.id).filter(id => validMemoryIdSet.has(id))
  };
  metricsTracker.recordAskQuery(Date.now() - fallbackT0, false, memories.length, fallbackAnswer.length);
  return res;
}
