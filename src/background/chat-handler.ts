import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createLLMClient } from './llm';
import { getConversation, saveConversation } from '../shared/storage';
import { PageContext, Message, Conversation } from '../shared/types';
import { truncateText } from '../shared/utils';

// Handle chat message with page context
export async function handleChatMessage(
  tabId: number,
  userMessage: string,
  pageContext: PageContext
): Promise<string> {
  try {
    // Get or create conversation
    let conversation = await getConversation(tabId);

    if (!conversation || conversation.pageContext.url !== pageContext.url) {
      // New conversation for this page
      conversation = {
        pageContext,
        messages: [],
        timestamp: Date.now(),
      };
    }

    // Add user message to history
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    conversation.messages.push(userMsg);

    // Build prompt with context
    const llm = await createLLMClient();
    const messages = buildChatPrompt(conversation);

    // Get AI response
    const response = await llm.invoke(messages);
    const assistantContent = response.content.toString();

    // Add assistant message to history
    const assistantMsg: Message = {
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now(),
    };
    conversation.messages.push(assistantMsg);

    // Keep only last 10 messages to manage token usage
    if (conversation.messages.length > 10) {
      conversation.messages = conversation.messages.slice(-10);
    }

    // Save conversation
    await saveConversation(tabId, conversation);

    return assistantContent;
  } catch (error) {
    console.error('Chat handler error:', error);
    throw error;
  }
}

// Build chat prompt with page context and history
function buildChatPrompt(conversation: Conversation) {
  const messages = [];

  // System message with page context
  const systemPrompt = `You are a helpful assistant that answers questions about web pages.

Page Context:
Title: ${conversation.pageContext.title}
URL: ${conversation.pageContext.url}
Content: ${truncateText(conversation.pageContext.content, 8000)}

Your task is to help the user understand and interact with the content of this page. Answer questions accurately based on the page content provided above.`;

  messages.push(new SystemMessage(systemPrompt));

  // Add conversation history
  for (const msg of conversation.messages) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  return messages;
}
