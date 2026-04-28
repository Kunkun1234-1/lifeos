/**
 * Thin DeepSeek (OpenAI-compatible) chat wrapper.
 *
 * Server-only. Do not import from client components.
 * Returns parsed text on success; throws LLMError on failure.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 800;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class LLMError extends Error {
  constructor(message: string, public status?: number, public detail?: unknown) {
    super(message);
    this.name = "LLMError";
  }
}

type ChatOptions = {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** When true, ask the model to return strict JSON (sets response_format). */
  json?: boolean;
};

type ChatResult = {
  text: string;
  tokensIn: number;
  tokensOut: number;
};

export function llmConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

/**
 * Run one chat completion.
 * - Throws LLMError if not configured / timeout / non-2xx / malformed response.
 */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new LLMError("DEEPSEEK_API_KEY is not configured", 503);
  }
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: opts.temperature ?? 0.7,
        ...(opts.json
          ? { response_format: { type: "json_object" } }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new LLMError(
        `DeepSeek returned ${res.status}`,
        res.status,
        detail.slice(0, 500)
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new LLMError("DeepSeek returned no content", 502, data);
    }
    return {
      text,
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
    };
  } catch (e) {
    if (e instanceof LLMError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new LLMError(`DeepSeek timeout after ${timeoutMs}ms`, 504);
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new LLMError(`DeepSeek request failed: ${msg}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Same as chat() but parses the response as JSON.
 * The prompt should explicitly request JSON output for reliability.
 */
export async function chatJSON<T = unknown>(opts: ChatOptions): Promise<T> {
  const result = await chat({ ...opts, json: true });
  try {
    return JSON.parse(result.text) as T;
  } catch (e) {
    throw new LLMError(
      "DeepSeek returned non-JSON content",
      502,
      result.text.slice(0, 500)
    );
  }
}
