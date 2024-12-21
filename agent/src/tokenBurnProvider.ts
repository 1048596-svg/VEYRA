import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IAgentRuntime, Memory, State } from '@ai16z/eliza';

// Reconstruct __dirname in an ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const tokenBurnProvider = {
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<string> => {
    try {
      const messagesFilePath = path.join(__dirname, '../../message-fetcher/messages.json');

      if (!fs.existsSync(messagesFilePath)) {
        console.warn('messages.json file not found.');
        return '';
      }

      const data = fs.readFileSync(messagesFilePath, 'utf-8');

      let messagesData: any[];
      try {
        messagesData = JSON.parse(data);
      } catch (parseError) {
        console.error('Error parsing messages.json:', parseError);
        return '';
      }

      if (!Array.isArray(messagesData)) {
        console.error('messages.json data is not an array. expected an array of messages.');
        return '';
      }

      const processedMessages = processTokenBurnMessages(messagesData);

      if (processedMessages.length === 0) {
        // no valid messages after processing
        // comply with style: lowercase, single line, no hashtags
        return 'user influences no valid burn messages found';
      }

      return formatTokenBurnContext(processedMessages);
    } catch (error) {
      console.error('Error in tokenBurnProvider:', error);
      return '';
    }
  },
};

function processTokenBurnMessages(messagesData: any[]): { message: string; weight: number }[] {
  return messagesData
    .filter((item) => {
      const hasMessage = typeof item.message === 'string' && item.message.trim() !== '';
      const hasAmount = typeof item.amount === 'string' && item.amount.trim() !== '';
      return hasMessage && hasAmount;
    })
    .map((item) => {
      const tokensBurned = parseFloat(item.amount);
      if (isNaN(tokensBurned)) {
        console.warn(`skipping message with invalid amount: "${item.amount}"`);
        return null;
      }

      const weight = calculateWeight(tokensBurned);
      return {
        message: sanitizeMessage(item.message).toLowerCase(),
        weight: weight,
      };
    })
    .filter((msg) => msg !== null) as { message: string; weight: number }[];
}

function calculateWeight(tokensBurned: number): number {
  // log-based weighting to emphasize larger burns
  return Math.log(tokensBurned + 1);
}

function sanitizeMessage(message: string): string {
  // remove potentially unsafe chars and keep it simple
  // allowed chars: letters, numbers, spaces, basic punctuation
  return message.replace(/[^a-zA-Z0-9 .,!?'"-]/g, '');
}

function formatTokenBurnContext(processedMessages: { message: string; weight: number }[]): string {
  // Sort by weight descending (highest influence first)
  processedMessages.sort((a, b) => b.weight - a.weight);

  // Take top 5 messages to avoid overwhelming output
  const topFive = processedMessages.slice(0, 5);

  const topMessage = topFive[0];
  const otherMessages = topFive.slice(1);

  // Check if the top message is significantly heavier than the next
  if (otherMessages.length > 0) {
    const secondMessage = otherMessages[0];
    // If top message weight is >= 3x second message weight, highlight it strongly
    if (topMessage.weight >= secondMessage.weight * 3) {
      return `user influences:\n- [HIGHEST BURN] "${topMessage.message}"`;
    }
  }

  // Otherwise, show top priority + others
  let influenceContext = `user influences:\n- top priority: "${topMessage.message}"`;

  if (otherMessages.length > 0) {
    const othersString = otherMessages.map(m => `"${m.message}"`).join(", ");
    influenceContext += `\n- others: ${othersString}`;
  }

  return influenceContext;
}
