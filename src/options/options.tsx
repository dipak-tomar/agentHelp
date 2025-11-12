import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { getSettings, saveSettings, getResumeData, saveResumeData } from '../shared/storage';
import { extractTextFromFile, parseResume } from '../background/resume-parser';

function OptionsApp() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [conversationStorage, setConversationStorage] = useState<'session' | 'local'>('session');
  const [autoOpenSidebar, setAutoOpenSidebar] = useState(true);
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadResume();
  }, []);

  async function loadSettings() {
    const settings = await getSettings();
    setOpenaiKey(settings.openaiKey || '');
    setModel(settings.model || 'gpt-4o-mini');
    setTemperature(settings.temperature || 0.7);
    setBaseUrl(settings.baseUrl || 'https://api.openai.com/v1');
    setConversationStorage(settings.conversationStorage || 'session');
    setAutoOpenSidebar(settings.autoOpenSidebar !== false);
  }

  async function loadResume() {
    const data = await getResumeData();
    setResumeData(data);
  }

  async function handleSaveSettings() {
    setLoading(true);
    setMessage(null);

    try {
      await saveSettings({
        openaiKey,
        model,
        temperature,
        baseUrl,
        conversationStorage,
        autoOpenSidebar,
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResumeUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      // Extract text from file
      const text = await extractTextFromFile(file);

      // Parse resume using background script
      const response = await chrome.runtime.sendMessage({
        type: 'PARSE_RESUME',
        payload: { text },
      });

      if (response?.success) {
        setResumeData(response.resumeData);
        setMessage({ type: 'success', text: 'Resume uploaded and parsed successfully!' });
      } else {
        // Parse locally as fallback
        const data = await parseResume(text);
        setResumeData(data);
        setMessage({ type: 'success', text: 'Resume uploaded and parsed successfully!' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload resume' });
    } finally {
      setLoading(false);
    }
  }

  async function handleClearResume() {
    if (confirm('Are you sure you want to delete your resume data?')) {
      await saveResumeData(null);
      setResumeData(null);
      setMessage({ type: 'success', text: 'Resume data cleared' });
    }
  }

  return (
    <div className="options-container">
      <header className="header">
        <h1>⚙️ Agent Help Settings</h1>
      </header>

      <div className="content">
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
            <button onClick={() => setMessage(null)}>✕</button>
          </div>
        )}

        {/* API Settings */}
        <section className="section">
          <h2>🔑 API Configuration</h2>
          <p className="description">
            Configure your OpenAI API settings. Your API key is stored locally and never shared.
          </p>

          <div className="form-group">
            <label>OpenAI API Key *</label>
            <input
              type="password"
              value={openaiKey}
              onInput={(e) => setOpenaiKey((e.target as HTMLInputElement).value)}
              placeholder="sk-..."
              required
            />
            <small>
              Get your API key from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank">
                OpenAI Platform
              </a>
            </small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Model</label>
              <select value={model} onChange={(e) => setModel((e.target as HTMLSelectElement).value)}>
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                <option value="gpt-4o">GPT-4o (Balanced)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
              </select>
            </div>

            <div className="form-group">
              <label>Temperature: {temperature}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onInput={(e) => setTemperature(parseFloat((e.target as HTMLInputElement).value))}
              />
              <small>Lower = more focused, Higher = more creative</small>
            </div>
          </div>

          <div className="form-group">
            <label>Base URL (Advanced)</label>
            <input
              type="url"
              value={baseUrl}
              onInput={(e) => setBaseUrl((e.target as HTMLInputElement).value)}
              placeholder="https://api.openai.com/v1"
            />
            <small>Use a custom API endpoint (for proxies or OpenAI-compatible APIs)</small>
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="section">
          <h2>🔒 Privacy & Behavior</h2>

          <div className="form-group">
            <label>Conversation Storage</label>
            <select
              value={conversationStorage}
              onChange={(e) =>
                setConversationStorage((e.target as HTMLSelectElement).value as 'session' | 'local')
              }
            >
              <option value="session">Session (Cleared on browser close)</option>
              <option value="local">Local (Persists across sessions)</option>
            </select>
            <small>Choose how conversation history is stored</small>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={autoOpenSidebar}
                onChange={(e) => setAutoOpenSidebar((e.target as HTMLInputElement).checked)}
              />
              Auto-open sidebar (minimized) when visiting pages
            </label>
          </div>
        </section>

        {/* Resume Upload */}
        <section className="section">
          <h2>📄 Resume Data</h2>
          <p className="description">
            Upload your resume for intelligent form autofill. Currently supports .txt files only.
          </p>

          {!resumeData ? (
            <div className="form-group">
              <label className="upload-btn">
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleResumeUpload}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                📤 Upload Resume (.txt)
              </label>
            </div>
          ) : (
            <div className="resume-preview">
              <div className="resume-header">
                <strong>✅ Resume Uploaded</strong>
                <button onClick={handleClearResume} className="danger-btn">
                  Delete
                </button>
              </div>
              <div className="resume-data">
                <p>
                  <strong>Name:</strong> {resumeData.parsed.name}
                </p>
                <p>
                  <strong>Email:</strong> {resumeData.parsed.email}
                </p>
                <p>
                  <strong>Phone:</strong> {resumeData.parsed.phone}
                </p>
                <p>
                  <strong>Skills:</strong> {resumeData.parsed.skills.join(', ')}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Save Button */}
        <div className="actions">
          <button onClick={handleSaveSettings} disabled={loading || !openaiKey} className="save-btn">
            {loading ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      <footer className="footer">
        <p>Agent Help v1.0.0 • Privacy-first AI assistant for your browser</p>
      </footer>
    </div>
  );
}

render(<OptionsApp />, document.getElementById('app')!);
