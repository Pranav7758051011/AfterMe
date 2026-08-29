/**
 * AfterMe — Dense Vector Embedding & Hybrid RAG Retrieval Engine
 * 
 * Provides semantic vector embeddings via Google Gemini text-embedding-004
 * with cosine similarity matching and BM25-style keyword hybrid reranking.
 * Includes a built-in deterministic TF-IDF fallback vectorizer for offline execution.
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { Memory } from '../database/memoryRepo';

export interface ScoredMemory {
  memory: Memory;
  similarityScore: number;
  keywordScore: number;
  combinedScore: number;
}

// ─── Mathematical Vector Utilities ───────────────────────────────────

/**
 * Computes cosine similarity between two normalized or raw floating-point vectors:
 * cos(theta) = (u . v) / (||u|| * ||v||)
 */
export function computeCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!vectorA || !vectorB || vectorA.length === 0 || vectorB.length === 0) return 0;
  if (vectorA.length !== vectorB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Deterministic TF-IDF Fallback Vectorizer ─────────────────────────

const VOCAB_STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'my', 'i', 'you', 'he', 'she', 'it',
  'where', 'what', 'did', 'leave', 'left', 'put', 'have', 'has', 'had', 'and', 'or'
]);

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !VOCAB_STOPWORDS.has(token));
}

/**
 * Computes deterministic TF-IDF term frequency vector over a hash space (64-dim)
 */
export function generateLocalFallbackEmbedding(text: string, dimensions = 64): number[] {
  const tokens = tokenize(text);
  const vector = new Array(dimensions).fill(0);
  if (tokens.length === 0) return vector;

  tokens.forEach(token => {
    // Simple fast DJB2-style hash modulo dimensions
    let hash = 5381;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) + hash) + token.charCodeAt(i);
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  });

  // L2-normalize vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) norm += vector[i] * vector[i];
  if (norm > 0) {
    const sqrtNorm = Math.sqrt(norm);
    for (let i = 0; i < dimensions; i++) vector[i] /= sqrtNorm;
  }

  return vector;
}

// ─── Gemini Live Embeddings ──────────────────────────────────────────

/**
 * Generates dense 768-dimensional vector embedding using Google Gemini
 */
export async function generateGeminiEmbedding(text: string): Promise<number[]> {
  const safeText = (text || '').trim();
  if (!safeText) return new Array(768).fill(0);

  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey.trim() === '') {
    return generateLocalFallbackEmbedding(safeText, 64);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response: any = await (ai.models as any).embedContent({
      model: 'text-embedding-004',
      content: {
        parts: [{ text: safeText }]
      }
    });

    if (response?.embedding?.values && Array.isArray(response.embedding.values)) {
      return response.embedding.values;
    }
  } catch (err: any) {
    console.warn('[VectorRetrieval] Gemini embedding API call failed, using fallback:', err?.message || err);
  }

  return generateLocalFallbackEmbedding(safeText, 64);
}

// ─── Hybrid Reranker (Semantic Vector + BM25 Keyword) ─────────────────

/**
 * Computes BM25-style keyword overlap score between query and memory text
 */
export function computeKeywordOverlapScore(query: string, memory: Memory): number {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return 0;

  const memText = `${memory.original_text} ${memory.object || ''} ${memory.location || ''} ${memory.task || ''}`;
  const memoryTokens = tokenize(memText);
  if (memoryTokens.length === 0) return 0;

  let matches = 0;
  memoryTokens.forEach(t => {
    if (queryTokens.has(t)) matches++;
  });

  return Math.min(matches / queryTokens.size, 1.0);
}

/**
 * Hybrid Semantic & Keyword Pre-Filter:
 * Ranks candidate memories by combined score:
 * Combined = (0.70 * VectorSimilarity) + (0.30 * KeywordScore)
 */
export async function rankCandidateMemories(
  query: string,
  memories: Memory[],
  topK = 5
): Promise<ScoredMemory[]> {
  if (!memories || memories.length === 0) return [];
  if (memories.length <= topK) {
    return memories.map(m => ({
      memory: m,
      similarityScore: 1.0,
      keywordScore: computeKeywordOverlapScore(query, m),
      combinedScore: 1.0
    }));
  }

  const queryEmbedding = await generateGeminiEmbedding(query);

  const scored: ScoredMemory[] = [];

  for (const mem of memories) {
    const memText = `${mem.original_text} ${mem.object || ''} ${mem.location || ''}`;
    // If memory already has cached embedding in document, use it, else compute
    const memEmbedding = (mem as any).vector_embedding || generateLocalFallbackEmbedding(memText, queryEmbedding.length);
    
    // Calculate vector similarity
    const simScore = computeCosineSimilarity(queryEmbedding, memEmbedding);
    const kwScore = computeKeywordOverlapScore(query, mem);
    const combined = (0.70 * simScore) + (0.30 * kwScore);

    scored.push({
      memory: mem,
      similarityScore: simScore,
      keywordScore: kwScore,
      combinedScore: combined
    });
  }

  // Sort descending by combined score
  scored.sort((a, b) => b.combinedScore - a.combinedScore);

  return scored.slice(0, topK);
}
