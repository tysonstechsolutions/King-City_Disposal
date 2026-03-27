// ============================================
// CLAUDE MODEL CONFIGURATION WITH FALLBACKS
// ============================================
// Automatically tries multiple models if one fails
// Prevents website breakage when Claude updates models

// List of Claude models in priority order (newest to oldest)
// Claude frequently deprecates old models, so we have fallbacks
export const CLAUDE_MODELS = {
  // Primary models (try these first)
  PRIMARY: [
    'claude-sonnet-4-20250514',        // Sonnet 4 (newest, best balance)
    'claude-3-5-sonnet-20241022',      // Sonnet 3.5 v2 (excellent vision)
  ],

  // Fallback models (try if primary fails)
  FALLBACK: [
    'claude-3-5-haiku-20241022',       // Haiku 3.5 (fast, cheap)
    'claude-3-haiku-20240307',         // Haiku 3 (legacy fallback)
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
        console.log(`[Claude] Success with model: ${model}`);
        const result = await response.json();
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
