import { StorageSchema, Conversation } from './types';

// Default settings
export const DEFAULT_SETTINGS: Partial<StorageSchema> = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  baseUrl: 'https://api.openai.com/v1',
  conversationStorage: 'session',
  autoOpenSidebar: true,
};

// Get settings from storage
export async function getSettings(): Promise<Partial<StorageSchema>> {
  const data = await chrome.storage.local.get([
    'openaiKey',
    'model',
    'temperature',
    'baseUrl',
    'conversationStorage',
    'autoOpenSidebar',
  ]);

  return {
    ...DEFAULT_SETTINGS,
    ...data,
  };
}

// Save settings to storage
export async function saveSettings(settings: Partial<StorageSchema>): Promise<void> {
  await chrome.storage.local.set(settings);
}

// Get resume data
export async function getResumeData() {
  const { resumeData } = await chrome.storage.local.get('resumeData');
  return resumeData;
}

// Save resume data
export async function saveResumeData(resumeData: any): Promise<void> {
  await chrome.storage.local.set({ resumeData });
}

// Conversation storage helpers
export async function getConversation(tabId: number): Promise<Conversation | null> {
  const settings = await getSettings();
  const storageArea = settings.conversationStorage === 'local'
    ? chrome.storage.local
    : chrome.storage.session;

  const key = `conversation_${tabId}`;
  const data = await storageArea.get(key);
  return data[key] || null;
}

export async function saveConversation(tabId: number, conversation: Conversation): Promise<void> {
  const settings = await getSettings();
  const storageArea = settings.conversationStorage === 'local'
    ? chrome.storage.local
    : chrome.storage.session;

  const key = `conversation_${tabId}`;
  await storageArea.set({ [key]: conversation });
}

export async function clearConversation(tabId: number): Promise<void> {
  const settings = await getSettings();
  const storageArea = settings.conversationStorage === 'local'
    ? chrome.storage.local
    : chrome.storage.session;

  const key = `conversation_${tabId}`;
  await storageArea.remove(key);
}
