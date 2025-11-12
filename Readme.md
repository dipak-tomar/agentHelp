# Agent Help (Browser‑Only) — Technical Plan v2

> **Scope**: Chrome/Edge/Brave extension (MV3) powered by OpenAI via LangChainJS
> **Core Features**:
> - 🤖 **Page-aware AI chat** (sidebar) - Ask questions about any webpage
> - 📝 **Smart form autofill** - Fill applications using your resume/profile
> - 💬 **Conversation memory** - Contextual follow-up questions

---

## 1) Vision & Goals

### Goals (v1)
- **Sidebar AI Assistant**: Chat interface that understands the current page
  - User asks: "What's this page about?", "Summarize the main points"
  - AI responds with page context
- **Intelligent Form Autofill**:
  - Upload resume once → autofill job applications automatically
  - AI maps resume data to form fields intelligently
- **Conversation Memory**:
  - Remember chat history within session
  - Follow-up questions use prior context
- **Privacy-first**:
  - All data local (API key, resume, chat history)
  - No telemetry, no cloud storage

### Non‑Goals (v1)
- No long-term RAG memory (v1.3 will add vector DB)
- No YouTube-specific features (keep generic for now)
- No multi-provider UI beyond OpenAI-compatible APIs
- No cloud sync or user accounts

---

## 2) User Stories

### Page Understanding
- *As a user*, I can click the extension icon to open a sidebar
- *As a user*, I can ask "What's the main point of this article?" and get an answer based on the page content
- *As a user*, I can ask follow-up questions and the AI remembers our conversation
- *As a user*, I can switch pages and start fresh conversations with new context

### Form Autofill
- *As a user*, I can upload my resume (PDF/text) in the Options page
- *As a user*, when I visit a job application, I can click "Autofill with AI"
- *As a user*, the extension intelligently fills my name, contact, experience, skills, and even essay questions
- *As a user*, I can review and edit before submitting

### Configuration
- *As a user*, I can configure OpenAI API key, model, temperature, and baseURL
- *As a user*, I can trust my data stays local and is never sent to third parties

---

## 3) Architecture Overview

### MV3 Components

#### **Sidebar UI (`sidebar.html/js`)**
- Injected iframe on the right side of the page
- Chat interface (messages + input)
- Shows typing indicators, message history
- "Autofill Form" button (when forms detected)

#### **Background Service Worker (`background.ts`)**
- Owns **LangChain ChatOpenAI** client
- Handles two types of requests:
  1. **Page chat**: `{pageContent, conversationHistory, userMessage}` → AI response
  2. **Form autofill**: `{formFields, resumeData}` → filled values
- Manages conversation history per tab
- Stores resume data and parsed fields

#### **Content Script (`content.ts`)**
- Extracts page content (title, main text, metadata)
- Detects forms and their fields
- Injects sidebar iframe
- Bridges messages between sidebar ↔ background

#### **Options Page (`options.html/js`)**
- API key configuration
- Model settings (model name, temperature, baseURL)
- Resume upload + preview
- Privacy settings

### Data Flow

#### Chat Flow
```
1. User clicks extension icon
2. Content script injects sidebar
3. Sidebar loads, requests page content from content script
4. Content script extracts page text → sends to sidebar
5. User types: "Summarize this page"
6. Sidebar → Background: {pageContent, history, userMsg}
7. Background → LangChain: builds prompt with full context
8. AI response → Sidebar displays
9. Conversation continues with history
```

#### Autofill Flow
```
1. User uploads resume in Options page
2. Background parses resume → extracts structured data
3. User visits job application form
4. Content script detects form fields
5. User clicks "Autofill" in sidebar
6. Sidebar → Background: {formFields, resumeData}
7. Background → LangChain: "Map resume to these fields"
8. AI generates field values
9. Content script fills form
10. User reviews and submits
```

### Permissions
```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "sidePanel"
  ],
  "host_permissions": ["<all_urls>"]
}
```

### Storage Schema
```typescript
interface StorageSchema {
  // Settings
  openaiKey: string;
  model: string;           // e.g., "gpt-4o-mini"
  temperature: number;
  baseUrl: string;

  // Resume data (parsed)
  resumeData: {
    raw: string;
    parsed: {
      name: string;
      email: string;
      phone: string;
      summary: string;
      experience: Array<{company, role, duration, description}>;
      education: Array<{school, degree, year}>;
      skills: string[];
    }
  };

  // Conversation history (per tab)
  conversations: {
    [tabId: string]: {
      pageContext: {url, title, content};
      messages: Array<{role: 'user' | 'assistant', content: string}>;
      timestamp: number;
    }
  };
}
```

---

## 4) Core Features Breakdown

### 4.1) Page Content Extraction

**Goal**: Extract clean, relevant text from any webpage

```typescript
function extractPageContent() {
  // Use Readability.js or custom extraction
  const article = new Readability(document).parse();

  return {
    url: window.location.href,
    title: document.title,
    mainContent: article?.textContent || fallbackExtraction(),
    metadata: {
      description: getMeta('description'),
      author: getMeta('author'),
      publishDate: getMeta('article:published_time')
    }
  };
}

function fallbackExtraction() {
  // Remove scripts, styles, nav, footer
  // Get text from main, article, or body
  // Truncate to reasonable size (10k chars)
}
```

**Handling Large Pages**:
- Truncate to ~10k characters for v1
- Prioritize: article content > headings > paragraphs
- v1.1: Implement chunking + map-reduce for very long pages

### 4.2) Sidebar Chat Interface

**UI Components**:
- Header: Page title + "Clear conversation" button
- Message list: User/Assistant messages with timestamps
- Input: Text box + send button
- Footer: Token usage, "Autofill" button (if form detected)

**Features**:
- Auto-scroll to latest message
- Typing indicator while AI responds
- Copy message button
- Markdown rendering (for code, lists, etc.)

**Sample Prompts** (for user inspiration):
- "Summarize this page in 3 bullet points"
- "What's the main argument?"
- "Explain this like I'm 5"
- "Find contact information"
- "What's the conclusion?"

### 4.3) Conversation Memory (v1)

**Implementation**:
```typescript
// In background worker
const conversations = new Map<number, Conversation>();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CHAT') {
    const tabId = sender.tab?.id;
    let conv = conversations.get(tabId) || createNewConversation(msg.pageContext);

    // Add user message
    conv.messages.push({role: 'user', content: msg.userMessage});

    // Build prompt with history
    const prompt = buildChatPrompt(conv);

    // Get AI response
    const response = await llm.invoke(prompt);

    // Add assistant message
    conv.messages.push({role: 'assistant', content: response});

    // Update conversation
    conversations.set(tabId, conv);

    return response;
  }
});
```

**Prompt Structure**:
```
System: You are a helpful assistant that answers questions about web pages.

Page Context:
Title: {title}
URL: {url}
Content: {truncated page text}

Conversation History:
User: {previous question 1}
Assistant: {previous answer 1}
User: {previous question 2}
Assistant: {previous answer 2}

User: {current question}
Assistant:
```

**Memory Management**:
- Keep last 10 messages per tab
- Clear conversation when user navigates to different domain
- Persist in chrome.storage.session (cleared on browser close)

### 4.4) Form Autofill System

**Step 1: Resume Parsing**
```typescript
// When user uploads resume
async function parseResume(file: File) {
  const text = await extractText(file); // PDF.js or plain text

  // Use LLM to structure data
  const prompt = `
  Extract structured information from this resume:
  ${text}

  Return JSON with: name, email, phone, summary, experience[], education[], skills[]
  `;

  const structured = await llm.invoke(prompt);

  // Store in chrome.storage.local
  await chrome.storage.local.set({resumeData: JSON.parse(structured)});
}
```

**Step 2: Form Field Detection**
```typescript
// Content script detects all form fields
function detectFormFields() {
  const fields = [];

  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'hidden' || el.type === 'password') return;

    fields.push({
      selector: getUniqueSelector(el),
      type: el.type || el.tagName,
      label: findLabel(el),
      name: el.name,
      placeholder: el.placeholder,
      value: el.value
    });
  });

  return fields;
}
```

**Step 3: AI-Powered Mapping**
```typescript
// Background worker
async function autofillForm(formFields, resumeData) {
  const prompt = `
  You are an expert at filling job application forms.

  Resume Data:
  ${JSON.stringify(resumeData, null, 2)}

  Form Fields to Fill:
  ${formFields.map(f => `${f.label || f.name}: ${f.type}`).join('\n')}

  For each field, provide the appropriate value from the resume.
  For essay questions (e.g., "Why do you want this job?"), write a brief, professional response.

  Return JSON: [{selector, value}, ...]
  `;

  const filled = await llm.invoke(prompt);
  return JSON.parse(filled);
}
```

**Step 4: Fill & Preview**
```typescript
// Content script fills form
function fillForm(mappings) {
  mappings.forEach(({selector, value}) => {
    const el = document.querySelector(selector);
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('input', {bubbles: true}));
    }
  });

  // Highlight filled fields
  // Show preview in sidebar
}
```

---

## 5) Technology Stack

### Core Libraries
- **Preact**: Lightweight UI framework for sidebar and options page
- **Plain JavaScript**: Vanilla JS for content scripts and background worker
- **@langchain/openai** + **@langchain/core**: LLM integration
- **Readability.js**: Page content extraction
- **PDF.js**: Resume PDF parsing (optional, could use API)
- **Marked.js**: Markdown rendering in sidebar
- **TypeScript** + **esbuild**: Build system

### Optional (v1.3)
- **LangChain VectorStore**: For RAG memory
- **ChromaDB** or **LanceDB**: Vector DB (WASM version)
- **Embeddings**: OpenAI embeddings for semantic search

---

## 6) Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup (manifest, tsconfig, esbuild)
- [ ] Options page (API key config)
- [ ] Background worker + LangChain integration
- [ ] Basic chat: hardcoded context, no memory

### Phase 2: Sidebar Chat (Week 2)
- [ ] Sidebar UI (HTML/CSS/JS)
- [ ] Content extraction module
- [ ] Message passing: sidebar ↔ content ↔ background
- [ ] Display page-aware responses
- [ ] Add conversation memory

### Phase 3: Form Autofill (Week 3)
- [ ] Resume upload in Options
- [ ] Resume parser (LLM-based)
- [ ] Form field detector
- [ ] Autofill logic (AI mapping)
- [ ] Preview & fill UI

### Phase 4: Polish & Test (Week 4)
- [ ] Error handling & loading states
- [ ] Test on real sites (LinkedIn, Indeed, company career pages)
- [ ] Performance optimization (token limits, chunking)
- [ ] Privacy audit (no leaks, secure storage)
- [ ] Documentation & packaging

---

## 7) Security & Privacy

### Data Privacy
- **Local-first**: All data in `chrome.storage.local` (never synced)
- **No telemetry**: Zero analytics, no tracking
- **Secure transmission**: HTTPS only to OpenAI (or user's baseURL)
- **Sensitive fields**: Never read password, credit card fields

### Resume Data
- Stored encrypted (optional: user can set passphrase)
- Clear data button in Options
- Never sent to third parties (only to user's OpenAI API)

### Page Content
- Only send visible text (no scripts, no hidden content)
- User can exclude domains (blocklist)
- Per-domain consent (optional: ask before first use on site)

---

## 8) User Experience

### First-Time Setup
1. Install extension
2. Click icon → prompted to set API key
3. Navigate to Options → paste OpenAI key
4. (Optional) Upload resume for autofill
5. Visit any page → click icon → sidebar opens
6. Start chatting!

### Daily Use
- Browse normally
- Need help understanding page? → Open sidebar → Ask question
- Filling job application? → Open sidebar → "Autofill Form"
- Switch pages → Fresh conversation with new context

---

## 9) Testing Strategy

### Manual Testing Sites
- **News articles**: NYTimes, Medium, Substack
- **Documentation**: MDN, React docs, API docs
- **Social media**: Twitter/X threads, Reddit posts
- **Job applications**: LinkedIn, Indeed, Greenhouse forms
- **E-commerce**: Product pages, checkout forms

### Test Cases
- Long pages (10k+ words) → truncation works
- Pages with little content → graceful handling
- Complex forms (multi-step, conditional fields)
- Resume parsing (PDF, DOCX, plain text)
- Follow-up questions use conversation history
- API errors (rate limits, invalid key)

---

## 10) Roadmap

### v1.0 (MVP) - 4 weeks
- ✅ Sidebar chat with page context
- ✅ Conversation memory (session-based)
- ✅ Form autofill from resume
- ✅ Options page (API key, resume upload)

### v1.1 - Add intelligence
- Stream responses (token-by-token)
- Better page extraction (handle dynamic content, SPAs)
- Form field validation before fill
- Multiple resume profiles (personal, professional)

### v1.2 - Enhanced context
- Page summarization on open
- Quick actions: "Summarize", "Key Points", "TLDR"
- Export conversation as markdown
- Support for images in page context (vision models)

### v1.3 - Long-term memory (RAG)
- Vector DB integration (ChromaDB)
- Store: past conversations, user preferences, documents
- Semantic search across history
- "Remember that article about X we discussed"

### v2.0 - Advanced features
- Multi-model support (Claude, local LLMs)
- Browser action automation (click, navigate)
- Workflow builder (if X then Y)
- Desktop app sync (optional)

---

## 11) Decisions Made

### Technical
- [x] **How to handle very large pages (50k+ chars)?**
  - **Decision**: Use GPT-4o-128k (Option C) - Simple and handles large contexts natively

- [x] **Resume parsing: LLM-based or rule-based?**
  - **Decision**: Rule-based (Option B) - Cheaper and faster for structured resume data

- [x] **Conversation storage: session vs local?**
  - **Decision**: User choice (Option C) - Toggle in Options for flexibility

### UX
- [x] **Should sidebar auto-open on page load?**
  - **Decision**: Yes, but minimized (just icon visible) - Discoverable without being intrusive

- [x] **Autofill UX: automatic or preview-first?**
  - **Decision**: Hybrid - Auto-fill simple fields, preview essays before submission

### UI Framework
- [x] **Frontend framework choice?**
  - **Decision**: Plain JavaScript + Preact - Lightweight, fast, minimal bundle size

---

## 12) Cost Optimization

### Token Usage
- Average page: ~3k tokens (content) + ~500 (conversation)
- Average response: ~300 tokens
- Cost per interaction: ~$0.01 (GPT-4o-mini)
- With autofill: ~$0.05 per form (more complex prompt)

### Optimization Strategies
- Use `gpt-4o-mini` as default (cheaper, fast)
- Truncate page content aggressively
- Cache page content (don't re-send on every message)
- User setting: "Economy mode" (shorter responses)

---

## 13) File Structure

```
agent-help/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.js
├── src/
│   ├── background/
│   │   ├── background.ts       # Main service worker
│   │   ├── llm.ts              # LangChain client
│   │   ├── chat-handler.ts     # Page chat logic
│   │   ├── autofill-handler.ts # Form autofill logic
│   │   └── resume-parser.ts    # Resume parsing
│   ├── content/
│   │   ├── content.ts          # Main content script
│   │   ├── extractor.ts        # Page content extraction
│   │   ├── form-detector.ts    # Form field detection
│   │   └── sidebar-injector.ts # Sidebar injection
│   ├── sidebar/
│   │   ├── sidebar.html
│   │   ├── sidebar.ts
│   │   ├── chat-ui.ts          # Chat interface
│   │   └── sidebar.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│   └── shared/
│       ├── types.ts            # TypeScript interfaces
│       ├── storage.ts          # Storage helpers
│       └── utils.ts            # Shared utilities
├── dist/                       # Build output
└── README.md
```

---

## 14) Acceptance Criteria (v1)

### Chat
- [ ] Can open sidebar on any webpage
- [ ] Can ask "What's this page about?" and get relevant answer
- [ ] Can ask follow-up questions using conversation history
- [ ] Responses appear within 2-3 seconds
- [ ] Chat history persists within tab session

### Autofill
- [ ] Can upload resume (PDF/text) in Options
- [ ] Resume is parsed and stored successfully
- [ ] On job application page, "Autofill" button appears
- [ ] Clicking autofill populates form fields correctly
- [ ] Can review and edit before submitting
- [ ] Works on 3+ major job sites (LinkedIn, Indeed, Greenhouse)

### General
- [ ] API key saved securely in Options
- [ ] Works on 10+ different websites (news, docs, social, e-commerce)
- [ ] No crashes or errors in normal use
- [ ] Extension size < 5MB
- [ ] No memory leaks (tested with 10+ tabs open)

---

## 15) Success Metrics

### User Engagement (if we track locally)
- Sidebar opens per session
- Messages sent per session
- Autofill uses per week
- Returning users (if we had accounts)

### Quality
- Response relevance (user feedback: 👍/👎)
- Autofill accuracy (fields filled correctly)
- API errors (should be < 1%)

---

**End of Plan v2**

---

## Next Steps

1. **Review & Approve**: Does this align with your vision?
2. **Start Phase 1**: Set up project structure
3. **Build MVP**: Focus on sidebar chat first, then autofill
4. **Iterate**: Test, gather feedback, improve

Ready to start building! 🚀
