import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { marked } from 'marked';
import { Message, PageContext } from '../shared/types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [hasForms, setHasForms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load page context on mount
  useEffect(() => {
    loadPageContext();
    checkForForms();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load page context from content script
  async function loadPageContext() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_PAGE_CONTENT',
      });

      if (response.success) {
        setPageContext(response.pageContext);
      } else {
        setError('Failed to load page content');
      }
    } catch (error) {
      console.error('Failed to load page context:', error);
      setError('Failed to connect to page');
    }
  }

  // Check if page has forms
  async function checkForForms() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'DETECT_FORMS',
      });

      if (response.success) {
        setHasForms(response.hasForms);
      }
    } catch (error) {
      console.error('Failed to check forms:', error);
    }
  }

  // Send chat message
  async function sendMessage() {
    if (!input.trim() || !pageContext || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await chrome.runtime.sendMessage({
        type: 'CHAT_MESSAGE',
        tabId: tab.id,
        payload: {
          userMessage: userMessage.content,
          pageContext,
        },
      });

      if (response.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setError(response.error || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setError(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  }

  // Handle autofill
  async function handleAutofill() {
    setLoading(true);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;

      // Get form fields
      const formsResponse = await chrome.tabs.sendMessage(tab.id, {
        type: 'DETECT_FORMS',
      });

      if (!formsResponse.success || !formsResponse.formFields.length) {
        setError('No fillable forms found on this page');
        return;
      }

      // Request autofill from background
      const autofillResponse = await chrome.runtime.sendMessage({
        type: 'AUTOFILL_FORM',
        payload: {
          formFields: formsResponse.formFields,
        },
      });

      if (autofillResponse.success) {
        // Send mappings to content script to fill
        await chrome.tabs.sendMessage(tab.id, {
          type: 'AUTOFILL_COMPLETE',
          payload: {
            mappings: autofillResponse.mappings,
          },
        });

        // Add success message
        const successMsg: Message = {
          role: 'assistant',
          content: '✅ Form filled successfully! Please review the values before submitting.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, successMsg]);
      } else {
        setError(autofillResponse.error || 'Failed to autofill form');
      }
    } catch (error: any) {
      console.error('Autofill error:', error);
      setError(error.message || 'Failed to autofill form');
    } finally {
      setLoading(false);
    }
  }

  // Clear conversation
  async function clearConversation() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await chrome.runtime.sendMessage({
        type: 'CLEAR_CONVERSATION',
        tabId: tab.id,
      });

      setMessages([]);
      setError(null);
    } catch (error) {
      console.error('Clear conversation error:', error);
    }
  }

  // Handle key press
  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="sidebar-container">
      <div className="header">
        <h2>Agent Help</h2>
        <button onClick={clearConversation} className="clear-btn" title="Clear conversation">
          🗑️
        </button>
      </div>

      {pageContext && (
        <div className="page-info">
          <div className="page-title">{pageContext.title}</div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>👋 Hi! I can help you understand this page.</p>
            <p>Try asking:</p>
            <ul>
              <li>"What's this page about?"</li>
              <li>"Summarize in 3 bullet points"</li>
              <li>"What's the main idea?"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-role">{msg.role === 'user' ? '👤' : '🤖'}</div>
            <div
              className="message-content"
              dangerouslySetInnerHTML={{
                __html: msg.role === 'assistant' ? marked(msg.content) : msg.content,
              }}
            />
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-role">🤖</div>
            <div className="message-content typing">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        {hasForms && (
          <button
            onClick={handleAutofill}
            className="autofill-btn"
            disabled={loading}
          >
            ✨ Autofill Form
          </button>
        )}

        <div className="input-wrapper">
          <textarea
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this page..."
            disabled={loading || !pageContext}
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !pageContext}
            className="send-btn"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Render the app
render(<App />, document.getElementById('app')!);
