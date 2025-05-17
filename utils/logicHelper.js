// utils/logicHelper.js

/**
 * Apply custom logic to modify the prompt before sending to OpenAI
 * @param {string} prompt - The original prompt from the user
 * @returns {string} - The modified prompt
 */
export function applyCustomLogic(prompt) {
  if (!prompt) return '';
  
  let enhancedPrompt = prompt;
  const lowerPrompt = prompt.toLowerCase();

  try {
      // Add context based on keywords
      if (lowerPrompt.includes('help') || lowerPrompt.includes('how to')) {
          enhancedPrompt = `Please provide step-by-step instructions for: ${prompt}`;
      }
      else if (lowerPrompt.includes('explain') || lowerPrompt.includes('what is')) {
          enhancedPrompt = `Please explain in simple terms, with an example if relevant: ${prompt}`;
      }
      else if (lowerPrompt.includes('compare') || lowerPrompt.includes('difference')) {
          enhancedPrompt = `Please compare and contrast, using a clear structure: ${prompt}`;
      }
      else if (lowerPrompt.includes('problem') || lowerPrompt.includes('error') || lowerPrompt.includes('issue')) {
          enhancedPrompt = `Please provide a troubleshooting approach for: ${prompt}\n\nInclude:\n1. Potential causes\n2. Step-by-step solutions\n3. Prevention tips`;
      }
      else if (lowerPrompt.includes('best practice') || lowerPrompt.includes('recommend')) {
          enhancedPrompt = `Please provide best practices and recommendations for: ${prompt}\n\nInclude:\n1. Industry standards\n2. Common pitfalls to avoid\n3. Practical examples`;
      }

      // Add general instruction for better responses
      // enhancedPrompt += '\n\nPlease ensure your response is:\n' +
      //     '1. Clear and concise\n' +
      //     '2. Practical and actionable\n' +
      //     '3. Includes relevant examples when helpful';

      // console.log('Enhanced prompt:', enhancedPrompt);
      return enhancedPrompt;
  } catch (error) {
      console.error('Error in applyCustomLogic:', error);
      return prompt; // Return original prompt if there's an error
  }
}