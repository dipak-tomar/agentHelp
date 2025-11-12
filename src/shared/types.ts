// Storage schema interfaces
export interface StorageSchema {
  // Settings
  openaiKey?: string;
  model: string;
  temperature: number;
  baseUrl: string;

  // Resume data
  resumeData?: ResumeData;

  // User preferences
  conversationStorage: 'session' | 'local';
  autoOpenSidebar: boolean;
}

export interface ResumeData {
  raw: string;
  parsed: ParsedResume;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

export interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  year: string;
}

// Conversation interfaces
export interface Conversation {
  pageContext: PageContext;
  messages: Message[];
  timestamp: number;
}

export interface PageContext {
  url: string;
  title: string;
  content: string;
  metadata?: {
    description?: string;
    author?: string;
    publishDate?: string;
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Form autofill interfaces
export interface FormField {
  selector: string;
  type: string;
  label?: string;
  name?: string;
  placeholder?: string;
  value?: string;
}

export interface FieldMapping {
  selector: string;
  value: string;
}

// Message types for communication between components
export type MessageType =
  | 'EXTRACT_PAGE_CONTENT'
  | 'PAGE_CONTENT_RESPONSE'
  | 'CHAT_MESSAGE'
  | 'CHAT_RESPONSE'
  | 'DETECT_FORMS'
  | 'FORMS_DETECTED'
  | 'AUTOFILL_FORM'
  | 'AUTOFILL_COMPLETE'
  | 'GET_SETTINGS'
  | 'SETTINGS_RESPONSE'
  | 'CLEAR_CONVERSATION';

export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
  tabId?: number;
}
