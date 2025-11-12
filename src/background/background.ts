import { handleChatMessage, handleChatMessageStream } from './chat-handler';
import { handleAutofillForm } from './autofill-handler';
import { parseResume, extractTextFromFile } from './resume-parser';
import { clearConversation, getSettings } from '../shared/storage';
import { ExtensionMessage } from '../shared/types';

console.log('Agent Help background service worker initialized');

// Handle long-lived connections for streaming
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat-stream') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'CHAT_MESSAGE_STREAM') {
        try {
          const { tabId, userMessage, pageContext } = message.payload;

          await handleChatMessageStream(
            tabId,
            userMessage,
            pageContext,
            (chunk: string) => {
              // Send each chunk as it arrives
              port.postMessage({
                type: 'STREAM_CHUNK',
                chunk,
              });
            }
          );

          // Signal completion
          port.postMessage({
            type: 'STREAM_COMPLETE',
          });
        } catch (error: any) {
          port.postMessage({
            type: 'STREAM_ERROR',
            error: error.message || 'Failed to process chat message',
          });
        }
      }
    });
  }
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Handle messages from content scripts and sidebar
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id || message.tabId;

  switch (message.type) {
    case 'CHAT_MESSAGE':
      handleChatRequest(tabId!, message.payload, sendResponse);
      return true; // Keep channel open for async response

    case 'AUTOFILL_FORM':
      handleAutofillRequest(message.payload, sendResponse);
      return true;

    case 'CLEAR_CONVERSATION':
      handleClearConversation(tabId!, sendResponse);
      return true;

    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return false;
});

// Handle chat message request
async function handleChatRequest(
  tabId: number,
  payload: { userMessage: string; pageContext: any },
  sendResponse: (response: any) => void
) {
  try {
    const response = await handleChatMessage(
      tabId,
      payload.userMessage,
      payload.pageContext
    );

    sendResponse({ success: true, response });
  } catch (error: any) {
    console.error('Chat error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to process chat message',
    });
  }
}

// Handle autofill request
async function handleAutofillRequest(
  payload: { formFields: any[] },
  sendResponse: (response: any) => void
) {
  try {
    const mappings = await handleAutofillForm(payload.formFields);
    sendResponse({ success: true, mappings });
  } catch (error: any) {
    console.error('Autofill error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to autofill form',
    });
  }
}

// Handle clear conversation request
async function handleClearConversation(
  tabId: number,
  sendResponse: (response: any) => void
) {
  try {
    await clearConversation(tabId);
    sendResponse({ success: true });
  } catch (error: any) {
    console.error('Clear conversation error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to clear conversation',
    });
  }
}

// Handle get settings request
async function handleGetSettings(sendResponse: (response: any) => void) {
  try {
    const settings = await getSettings();
    sendResponse({ success: true, settings });
  } catch (error: any) {
    console.error('Get settings error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to get settings',
    });
  }
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Agent Help installed');
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});
