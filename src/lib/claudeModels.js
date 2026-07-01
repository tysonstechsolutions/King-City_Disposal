// ============================================
// CLAUDE MODEL CONFIGURATION WITH FALLBACKS
// ============================================
// Automatically tries multiple models if one fails
// Prevents website breakage when Claude updates models

// List of Claude models in priority order (newest to oldest)
// Claude frequently deprecates old models, so we have fallbacks.
// Updated 2026: the previous Sonnet 4 / Claude 3.5 / Claude 3 models were all
// retired by Anthropic (they now 404), which silently broke document parsing.
// These are the current vision-capable models — all support image + PDF input.
export const CLAUDE_MODELS = {
  // Primary models (try these first)
  PRIMARY: [
    'claude-sonnet-5',                 // Sonnet 5 (excellent vision, best balance)
    'claude-opus-4-8',                 // Opus 4.8 (most capable, vision) - accuracy fallback
  ],

  // Fallback models (try if primary fails)
  FALLBACK: [
    'claude-haiku-4-5',                // Haiku 4.5 (fast, cheap, vision-capable)
  ],
};

// Get the best available model
export function getBestClaudeModel() {
  // For now, return primary model
  // This can be expanded to check which models are actually available
  return CLAUDE_MODELS.PRIMARY[0];
}

/**
 * Call Claude API with automatic fallback to older models
 * @param {Object} params - Claude API parameters
 * @param {string} params.apiKey - Anthropic API key
 * @param {Array} params.messages - Messages to send
 * @param {number} params.maxTokens - Max tokens in response
 * @param {string} params.preferredModel - Preferred model to try first
 * @returns {Promise<Object>} - Claude API response
 */
export async function callClaudeWithFallback({
  apiKey,
  messages,
  maxTokens = 4000,
  preferredModel = null,
}) {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Try preferred model first, then primary, then fallbacks
  const modelsToTry = [
    ...(preferredModel ? [preferredModel] : []),
    ...CLAUDE_MODELS.PRIMARY,
    ...CLAUDE_MODELS.FALLBACK,
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Claude] Trying model: ${model}`);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // A 2xx with no usable text is NOT a success: the model may have
        // returned only thinking blocks, an empty content array, a refusal, or
        // hit the token limit (stop_reason 'max_tokens'/'end_turn') on a hard
        // image. Returning it as success gives the caller nothing to parse.
        // Fall through to the next model instead.
        const textLen = (result?.content || [])
          .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
          .reduce((n, b) => n + b.text.trim().length, 0);
        if (textLen === 0) {
          console.warn(`[Claude] ${model} returned 2xx with no text (stop_reason=${result?.stop_reason})`);
          lastError = { model, error: `Model returned no readable text (stop_reason=${result?.stop_reason || 'unknown'})`, status: 200 };
          continue;
        }
        console.log(`[Claude] Success with model: ${model}`);
        return { success: true, data: result, model };
      }

      // Check if it's a model error (404 or 400)
      const errorText = await response.text();
      const isModelError = errorText.includes('model') ||
                          errorText.includes('not found') ||
                          response.status === 404 ||
                          response.status === 400;

      if (isModelError) {
        console.warn(`[Claude] Model ${model} failed, trying next...`, errorText);
        lastError = { model, error: errorText, status: response.status };
        continue; // Try next model
      }

      // Other error (rate limit, auth, etc.) - still try next model
      console.warn(`[Claude] API error with ${model}:`, errorText);
      lastError = { model, error: errorText, status: response.status };
      // Continue to try next model

    } catch (error) {
      console.error(`[Claude] Error with model ${model}:`, error.message);
      lastError = { model, error: error.message };
      // Try next model
    }
  }

  // All models failed - return error object instead of throwing
  return {
    success: false,
    error: `All Claude models failed. Last error with ${lastError?.model}: ${lastError?.error}`,
    lastModel: lastError?.model,
  };
}

/**
 * Get recommended model for different use cases
 */
export function getModelForTask(task) {
  switch (task) {
    case 'document_parsing':
    case 'invoice_parsing':
      // Use vision-capable model
      return CLAUDE_MODELS.PRIMARY[0];

    case 'simple_text':
      // Can use any model
      return CLAUDE_MODELS.PRIMARY[0];

    default:
      return getBestClaudeModel();
  }
}

export default {
  CLAUDE_MODELS,
  getBestClaudeModel,
  callClaudeWithFallback,
  getModelForTask,
};
