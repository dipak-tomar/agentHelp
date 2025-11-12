import { ChatOpenAI } from '@langchain/openai';
import { getSettings } from '../shared/storage';

// Create and configure LangChain client
export async function createLLMClient() {
  const settings = await getSettings();

  if (!settings.openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  return new ChatOpenAI({
    openAIApiKey: settings.openaiKey,
    modelName: settings.model || 'gpt-4o-mini',
    temperature: settings.temperature || 0.7,
    configuration: {
      baseURL: settings.baseUrl || 'https://api.openai.com/v1',
    },
  });
}
