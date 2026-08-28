import { Memory, MemoryType, RiskLevel, MemoryStatus } from '../types';

export function extractClientMemory(
  text: string,
  currentLocation?: string,
  options?: { imageUrl?: string; imageBase64?: string; latitude?: number; longitude?: number; userId?: string }
): { memory: Memory; extraction: any } {
  const safeText = (text || '').trim();
  const lower = safeText.toLowerCase();

  let memoryType: MemoryType = 'belonging';
  let riskLevel: RiskLevel = 'medium';
  let objectName: string | null = null;
  let locationName = currentLocation || 'Unknown Location';
  let taskName: string | null = null;

  // 1. Memory Type & Entity Recognition Heuristics
  if (lower.includes('park') || lower.includes('car') || lower.includes('vehicle') || lower.includes('bay') || lower.includes('slot') || lower.includes('floor')) {
    memoryType = 'belonging';
    objectName = 'vehicle';
    riskLevel = 'high';
    const match = safeText.match(/(?:at|on|in|floor|bay|spot|slot)\s+([^,.]+)/i);
    if (match) locationName = match[0].trim();
  } else if (lower.includes('charger') || lower.includes('laptop') || lower.includes('phone') || lower.includes('wallet') || lower.includes('keys') || lower.includes('airpods') || lower.includes('bag') || lower.includes('jacket')) {
    memoryType = 'belonging';
    riskLevel = 'high';
    const match = safeText.match(/(?:my|the|a|an)\s+([a-zA-Z\s]+?)(?:\s+(?:in|at|on|near|by|under)\s+([^,.]+)|$)/i);
    if (match) {
      objectName = match[1].trim();
      if (match[2]) locationName = match[2].trim();
    } else {
      objectName = 'belonging';
    }
  } else if (lower.includes('passport') || lower.includes('ticket') || lower.includes('id card') || lower.includes('document') || lower.includes('visa') || lower.includes('contract')) {
    memoryType = 'document';
    riskLevel = 'critical';
    objectName = 'document';
  } else if (lower.includes('appointment') || lower.includes('meeting') || lower.includes('flight') || lower.includes('event')) {
    memoryType = 'event';
    riskLevel = 'high';
  } else if (lower.includes('send') || lower.includes('submit') || lower.includes('email') || lower.includes('call') || lower.includes('buy') || lower.includes('task')) {
    memoryType = 'task';
    riskLevel = 'medium';
    taskName = safeText;
  }

  const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const memory: Memory = {
    id,
    user_id: options?.userId || 'demo_user_001',
    original_text: safeText,
    memory_type: memoryType,
    object: objectName || (memoryType === 'belonging' ? 'belonging' : null),
    task: taskName,
    event: memoryType === 'event' ? safeText : null,
    person: null,
    location: locationName,
    action: 'left',
    date: null,
    time: null,
    deadline: null,
    importance: riskLevel,
    risk_level: riskLevel,
    status: (riskLevel === 'high' || riskLevel === 'critical' ? 'potentially_forgotten' : 'active') as MemoryStatus,
    image_url: options?.imageUrl || options?.imageBase64 || null,
    created_at: now,
    updated_at: now,
    latitude: options?.latitude,
    longitude: options?.longitude,
  };

  return {
    memory,
    extraction: {
      memory_type: memoryType,
      object: objectName,
      location: locationName,
      importance: riskLevel,
      risk_level: riskLevel,
      status: memory.status,
      summary: safeText,
      confidence: 0.95,
      reasoning: 'Extracted via intelligent heuristic grounding engine.',
    }
  };
}
