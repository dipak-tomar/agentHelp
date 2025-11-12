import { extractPageContent } from './extractor';
import { detectFormFields, hasFormsOnPage, fillFormFields } from './form-detector';
import { ExtensionMessage } from '../shared/types';

console.log('Agent Help content script loaded');

// Listen for messages from sidebar or background
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  switch (message.type) {
    case 'EXTRACT_PAGE_CONTENT':
      handleExtractPageContent(sendResponse);
      return true;

    case 'DETECT_FORMS':
      handleDetectForms(sendResponse);
      return true;

    case 'AUTOFILL_COMPLETE':
      handleAutofillComplete(message.payload, sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return false;
});

// Handle page content extraction request
function handleExtractPageContent(sendResponse: (response: any) => void) {
  try {
    const pageContext = extractPageContent();
    sendResponse({ success: true, pageContext });
  } catch (error: any) {
    console.error('Extract page content error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to extract page content',
    });
  }
}

// Handle form detection request
function handleDetectForms(sendResponse: (response: any) => void) {
  try {
    const hasForms = hasFormsOnPage();
    const formFields = hasForms ? detectFormFields() : [];

    sendResponse({
      success: true,
      hasForms,
      formFields,
    });
  } catch (error: any) {
    console.error('Detect forms error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to detect forms',
    });
  }
}

// Handle autofill completion (fill the form with mappings)
function handleAutofillComplete(
  payload: { mappings: any[] },
  sendResponse: (response: any) => void
) {
  try {
    fillFormFields(payload.mappings);
    sendResponse({ success: true });
  } catch (error: any) {
    console.error('Autofill complete error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to fill form fields',
    });
  }
}

// Notify sidebar when page loads (if auto-open is enabled)
window.addEventListener('load', () => {
  console.log('Page loaded, content script ready');
});
