/**
 * AfterMe System Telemetry, Performance & Cost Observability Service
 */

export interface SystemTelemetry {
  uptime_seconds: number;
  total_requests: number;
  total_extractions: number;
  total_ask_queries: number;
  total_geofence_checks: number;
  total_alerts_generated: number;
  gemini_api_calls: number;
  fallback_heuristic_calls: number;
  performance: {
    avg_extraction_latency_ms: number;
    avg_ask_latency_ms: number;
    avg_geofence_latency_ms: number;
    p95_extraction_latency_ms: number;
    p95_ask_latency_ms: number;
  };
  cost_observability: {
    model: string;
    estimated_input_tokens: number;
    estimated_output_tokens: number;
    estimated_total_tokens: number;
    estimated_cost_usd: number;
    pricing_tier: string;
  };
  timestamp: string;
}

const startTime = Date.now();
let totalRequests = 0;
let totalExtractions = 0;
let totalAskQueries = 0;
let totalGeofenceChecks = 0;
let totalAlertsGenerated = 0;
let geminiApiCalls = 0;
let fallbackHeuristicCalls = 0;

let estimatedInputTokens = 0;
let estimatedOutputTokens = 0;

const extractionLatencies: number[] = [];
const askLatencies: number[] = [];
const geofenceLatencies: number[] = [];

// Keep only the most recent 100 latency samples
const MAX_SAMPLES = 100;

function pushSample(arr: number[], val: number) {
  arr.push(val);
  if (arr.length > MAX_SAMPLES) arr.shift();
}

function calculateAverage(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function calculateP95(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.95);
  return Math.round(sorted[Math.min(idx, sorted.length - 1)]);
}

export const metricsTracker = {
  recordRequest() {
    totalRequests++;
  },

  recordExtraction(latencyMs: number, isGemini: boolean, inputLength: number, outputLength: number) {
    totalExtractions++;
    pushSample(extractionLatencies, latencyMs);
    if (isGemini) {
      geminiApiCalls++;
      // Rough token estimation: ~4 chars per token + prompt template
      estimatedInputTokens += Math.round((inputLength + 800) / 4);
      estimatedOutputTokens += Math.round((outputLength + 150) / 4);
    } else {
      fallbackHeuristicCalls++;
    }
  },

  recordAskQuery(latencyMs: number, isGemini: boolean, memoryCount: number, answerLength: number) {
    totalAskQueries++;
    pushSample(askLatencies, latencyMs);
    if (isGemini) {
      geminiApiCalls++;
      estimatedInputTokens += Math.round((memoryCount * 120 + 600) / 4);
      estimatedOutputTokens += Math.round((answerLength + 100) / 4);
    } else {
      fallbackHeuristicCalls++;
    }
  },

  recordGeofenceCheck(latencyMs: number, alertsCreated: number) {
    totalGeofenceChecks++;
    totalAlertsGenerated += alertsCreated;
    pushSample(geofenceLatencies, latencyMs);
  },

  getMetrics(): SystemTelemetry {
    // Gemini 2.5 Flash Pricing (per million tokens): Input: $0.075, Output: $0.30
    const inputCost = (estimatedInputTokens / 1_000_000) * 0.075;
    const outputCost = (estimatedOutputTokens / 1_000_000) * 0.30;
    const totalCost = Number((inputCost + outputCost).toFixed(6));

    return {
      uptime_seconds: Math.round((Date.now() - startTime) / 1000),
      total_requests: totalRequests,
      total_extractions: totalExtractions,
      total_ask_queries: totalAskQueries,
      total_geofence_checks: totalGeofenceChecks,
      total_alerts_generated: totalAlertsGenerated,
      gemini_api_calls: geminiApiCalls,
      fallback_heuristic_calls: fallbackHeuristicCalls,
      performance: {
        avg_extraction_latency_ms: calculateAverage(extractionLatencies),
        avg_ask_latency_ms: calculateAverage(askLatencies),
        avg_geofence_latency_ms: calculateAverage(geofenceLatencies),
        p95_extraction_latency_ms: calculateP95(extractionLatencies),
        p95_ask_latency_ms: calculateP95(askLatencies),
      },
      cost_observability: {
        model: 'gemini-2.5-flash',
        estimated_input_tokens: estimatedInputTokens,
        estimated_output_tokens: estimatedOutputTokens,
        estimated_total_tokens: estimatedInputTokens + estimatedOutputTokens,
        estimated_cost_usd: totalCost,
        pricing_tier: 'Google Gemini Flash Pay-as-you-go ($0.075 / 1M In, $0.30 / 1M Out)',
      },
      timestamp: new Date().toISOString(),
    };
  }
};
