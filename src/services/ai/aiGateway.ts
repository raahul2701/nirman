// Centralized AI gateway over the Gemini client/proxy.
import { runAiCompletion } from './geminiClient';

interface AIRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  content: string;
  tokensUsed: number;
  confidence: number;
}

class AIGateway {
  private requestCache = new Map<string, { response: AIResponse; expiry: number }>();
  private cacheMaxAge = 10 * 60 * 1000; // 10 minutes
  private requestThrottle = new Map<string, number>();
  private throttleWindow = 60000; // 1 minute
  private maxRequestsPerWindow = 10;

  async request(req: AIRequest): Promise<AIResponse> {
    // Check throttling
    this.checkThrottle('global');

    // Check cache (client-side only for now)
    const cacheKey = req.prompt.substring(0, 100);
    const cached = this.requestCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.debug('[AI Gateway] Cache hit');
      return cached.response;
    }

    try {
      // Call Gemini through the configured AI proxy.
      const response = await runAiCompletion({
        messages: [{ role: 'user', content: req.prompt }],
        maxTokens: req.maxTokens || 500,
        temperature: req.temperature || 0.7,
      });

      const aiResponse: AIResponse = {
        content: response,
        tokensUsed: Math.ceil(response.length / 4), // Rough estimate
        confidence: 0.85,
      };

      // Cache response
      this.requestCache.set(cacheKey, {
        response: aiResponse,
        expiry: Date.now() + this.cacheMaxAge,
      });

      return aiResponse;
    } catch (error) {
      console.error('[AI Gateway] Request failed:', error);

      // Fallback: return safe default
      return {
        content: 'Analysis unavailable. Please try again later.',
        tokensUsed: 0,
        confidence: 0,
      };
    }
  }

  private checkThrottle(key: string): void {
    const now = Date.now();
    const lastRequest = this.requestThrottle.get(key) || 0;

    if (now - lastRequest < this.throttleWindow) {
      const requestCount = Array.from(this.requestThrottle.values()).filter(
        time => now - time < this.throttleWindow
      ).length;

      if (requestCount > this.maxRequestsPerWindow) {
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      }
    }

    this.requestThrottle.set(key, now);
  }

  clearCache(): void {
    this.requestCache.clear();
  }

  // Compatibility wrapper for callers that already expect proxy semantics.
  async requestViaProxy(req: AIRequest): Promise<AIResponse> {
    // Placeholder for future server-side proxy
    // const res = await fetch('/api/ai/analyze', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(req),
    // });
    // return res.json();

    // Delegate to the configured Gemini client/proxy.
    return this.request(req);
  }
}

export const aiGateway = new AIGateway();
