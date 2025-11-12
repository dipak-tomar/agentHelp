# Agent Help (Browser‑Only) — Technical Plan

> Scope: **Chrome/Edge/Brave extension (MV3)** powered by **OpenAI via LangChainJS**.  
> Goal: Writing assistance (rewrite, grammar, tone), selection “explain”, and a foundation for future features (streaming autocomplete, page Q&A).

---

## 1) Goals & Non‑Goals

### Goals (v1)
- Inline rewrite / grammar / tone adjustments for any editable field.
- “Explain selection” for highlighted text (jargon, code, legal, etc.).
- Keyboard first UX: **⌘/Ctrl+Enter** to improve, context‑menu action, and a subtle inline button.
- Configurable **OpenAI model + base URL** (supports Azure/OpenRouter/proxy) via **LangChainJS**.
- Minimal, private-by-default: key stored locally; page context limited to what’s needed.

### Non‑Goals (v1)
- No cloud storage or user accounts.
- No long‑term memory vector DB (will come in v1.3).
- No multi‑provider UI beyond OpenAI-compatible APIs (v1 focuses on OpenAI surface with baseURL override).

---

## 2) User Stories

- *As a user*, I can press ⌘/Ctrl+Enter in any text box to get a cleaner, concise rewrite without changing intent.
- *As a user*, I can select any text on a page, right‑click → "Explain with Agent Help" to get a plain‑English summary.
- *As a user*, I can pick model (`gpt-5`, `gpt-5-mini`, etc.) and temperature in an Options page.
- *As a user*, I can trust the extension to never read passwords or secret fields and to avoid sending data from blocked domains.

---

## 3) Architecture Overview

### MV3 Components
- **Background Service Worker (`background.ts`)**
  - Owns the **LangChain ChatOpenAI** client.
  - Receives requests from content scripts; invokes LLM; returns answer.
  - Holds no secret other than user‑provided key in `chrome.storage.local`.
- **Content Script (`content.ts`)**
  - Detects editable fields & selection; injects quick‑action button; binds hotkeys.
  - Marshals payload `{mode, text, url, title, lang}` to background.
  - Writes model output back into the focused field (or shows an alert on error).
- **Options Page (`options.html/js`)**
  - Saves **API key**, **model**, **temperature**, **baseURL**, **redaction & policy** flags.

### Data Flow
1. User types in an input/textarea and presses ⌘/Ctrl+Enter.
2. Content script reads value/selection → sends message `{mode, text, url, title}` to background.
3. Background builds **prompt messages** → **LangChain** `ChatOpenAI.invoke(messages)`.
4. Response returned to content → content replaces text (or shows a choice UI in v1.1).

### Permissions
```json
{
  "permissions": ["storage", "activeTab", "scripting", "contextMenus"],
  "host_permissions": ["https://api.openai.com/*"]
}
```
Optionally add proxy host to `host_permissions` if you deploy one.

### Storage
- `chrome.storage.local`: `{ openaiKey, model, temperature, baseUrl, policy }`.
- No Chrome sync by default (privacy). Toggleable later.

---

## 4) OpenAI + LangChain Integration

### Library
- `@langchain/openai` + `@langchain/core` (ESM). Backed by OpenAI JS SDK internally.

### Model Abstraction
- Primary: `ChatOpenAI` with settings:
  ```ts
  const llm = new ChatOpenAI({
    model: settings.model,           // e.g., "gpt-5-mini"
    temperature: settings.temperature,
    apiKey: settings.openaiKey,
    baseURL: settings.baseUrl        // default: "https://api.openai.com/v1"
  });
  ```
- Allows Azure/OpenRouter/self‑hosted proxy by changing `baseURL` and `model` alias.

### Request Shape (Messages)
```ts
const messages = [
  { role: "system", content: "You are a precise writing assistant. Improve clarity, fix grammar, keep intent. Be concise." },
  { role: "user", content: `Page: ${title} ${url}

Text to improve:
${text}

Rewrite:` }
];
const result = await llm.invoke(messages as any);
```

### Streaming (v1.1)
- Swap `invoke` for `stream()` to support token streaming → surface as ghost text in the content script.

---

## 5) Features & Prompts

### Modes
- **rewrite**: clarity, brevity, same intent.
- **fix**: grammar & punctuation only; keep wording.
- **tone**: target tone (e.g., friendly, formal, assertive).
- **explain**: plain‑English explanation; 3–5 bullets max.

### Prompt Templates (v1)
- **Rewrite**
  ```text
  System: You are a precise writing assistant. Improve clarity, fix grammar, keep the same intent. Be concise.
  User: Page: <title> <url>
  Text to improve:
  <text>
  Rewrite:
  ```
- **Fix**
  ```text
  System: You are a helpful proofreader. Correct grammar/spelling/punctuation without changing tone or meaning.
  User: <text>
  Return only the corrected text.
  ```
- **Tone**
  ```text
  System: You rewrite text to match the requested tone while preserving meaning.
  User: Tone: <friendly|formal|confident|neutral>
  Text: <text>
  Return only the rewritten text.
  ```
- **Explain**
  ```text
  System: You explain things in simple language with concrete examples when useful.
  User: Context: <title> <url>
  Explain this, keeping to ≤5 short bullets:
  <text>
  ```

### Language Detection
- Content script sends `document.documentElement.lang || navigator.language` to choose response language automatically.

---

## 6) Context Collection & Limits

- **Inputs**: selected text **OR** current field value; page `title`, `url`, `lang`.
- **Sanitization**: collapse whitespace, strip HTML, cut at safe token limit (e.g., 4k chars for v1).
- **PII Redaction** (toggleable): mask emails, phone numbers, credit‑card‑like patterns via regex before sending to API.
- **Blocklist**: never send from password/credit‑card fields; allowlist/denylist per domain (e.g., corporate domains = local only later).

---

## 7) Security & Privacy

- **Keys**: stored in `chrome.storage.local` only. No anonymous telemetry by default.
- **Network**: direct to OpenAI OR via user‑operated proxy (Cloudflare/Vercel). HTTPS only.
- **No background data hoarding**: messages are ephemeral per request; no logging of prompts or results.
- **Future**: per‑site privacy policy UI, granular consent banners for first‑time domains.

---

## 8) Error Handling & Resilience

- **API errors**: surface friendly messages; show raw code in Dev Mode.
- **429 rate limits**: exponential backoff (jitter), up to 3 retries.
- **Service worker lifetime**: keep warm via message activity; avoid long‑running tasks; chunk big prompts.
- **Offline**: detect `navigator.onLine`; show “offline” banner; skip network calls.

---

## 9) Performance

- **Bundle**: esbuild with minify + tree‑shaking; avoid large deps in content script.
- **Messaging**: small payloads only (text + small metadata); no binary.
- **UI**: button injected lazily; MutationObserver throttled; avoid layout jank.

---

## 10) Configuration (Options UI)

Fields:
- `openaiKey` (password field)
- `model` (text, e.g., `gpt-5-mini`)
- `temperature` (0–2; default 0.2)
- `baseUrl` (default `https://api.openai.com/v1`)
- `redactionEnabled` (boolean)
- `domainPolicy` (JSON textarea for allow/deny rules)

Validation:
- Mask key in UI; test credentials by calling `/models` (optional proxy) or a tiny “hello” request.

---

## 11) File Layout

```
agent-help/
  manifest.json
  package.json
  src/
    background.ts     # LangChain client + request handler
    content.ts        # injects UI, hotkeys, message bridge
    options.html
    options.js
  dist/               # build output
```

**Build**
```bash
npm run build
# Chrome → chrome://extensions → Developer mode → Load unpacked → ./dist
```

---

## 12) Testing & QA

### Unit
- Functions: prompt builders, redaction, domain policy matching.
- Mock LangChain `ChatOpenAI` to test call shapes.

### E2E
- **Puppeteer**: load extension, navigate to Gmail/Slack/Docs clones, type in fields, assert transformed output.
- **Manual matrix**: Gmail, Outlook Web, Twitter/X, LinkedIn, Notion, Google Docs, GitHub PR comment.

### Security
- Attempt to extract values from password fields → must fail.
- Verify PII masking when enabled.

---

## 13) Release & Distribution

- Bump `version` in `manifest.json` and `package.json`.
- `npm run build` → zip `dist/` for Chrome Web Store.
- Provide a privacy policy page (state no data collection; API calls contain only user text).

---

## 14) Roadmap

- **v1.0**: Rewrite/Fix/Tone/Explain, hotkeys, options, basic redaction.
- **v1.1**: Streaming autocomplete (ghost text), multi‑candidate review UI.
- **v1.2**: Page Q&A (Readability extraction + chunking), inline answers in a popover.
- **v1.3**: Personal memory snippets (local SQLite via WASM), style learning (opt‑in).
- **v2.0**: macOS app bridge (menu bar, global palette), shared agent.

---

## 15) Acceptance Criteria (v1)

- Can load extension and set API key/model in Options.
- Pressing ⌘/Ctrl+Enter in a textarea replaces the text with a cleaner rewrite within 1–2s (typical).
- Context menu "Explain with Agent Help" returns ≤5 understandable bullets.
- Redaction toggle masks emails/phones in prompts.
- No data read from password/credit‑card fields.
- Works on: Gmail compose, Twitter/X post box, LinkedIn message, GitHub comment box, and Notion page.

---

## 16) Open Questions

- Should we add a **model dropdown** populated via proxy (safer) vs free‑text model id?
- Do we want per‑site **always‑local** rules from day one?
- How strict should default redaction be (risk of over‑masking code/IDs)?
- Local caching of last N prompts/outputs (purely in-memory) for undo?

---

## 17) Pseudocode: Background Handler

```ts
import { ChatOpenAI } from "@langchain/openai";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "AGENT_HELP") return;
  (async () => {
    const settings = await chrome.storage.local.get(["openaiKey","model","temperature","baseUrl","redactionEnabled","domainPolicy"]);
    const { mode, text, title, url, lang } = msg.payload;

    // Policy & redaction (simplified)
    const policy = parsePolicy(settings.domainPolicy);
    if (policy?.deny?.some((p:string)=> url.includes(p))) throw new Error("Domain blocked by policy.");
    const safeText = settings.redactionEnabled ? redact(text) : text;

    const llm = new ChatOpenAI({
      model: settings.model || "gpt-5-mini",
      temperature: Number(settings.temperature ?? 0.2),
      apiKey: settings.openaiKey,
      baseURL: settings.baseUrl || "https://api.openai.com/v1"
    });

    const messages = buildMessages(mode, safeText, { title, url, lang });
    const ai = await llm.invoke(messages as any);
    sendResponse({ ok: true, text: toStringContent(ai) });
  })().catch(err => sendResponse({ ok: false, error: err.message }));
  return true;
});
```

---

## 18) Metrics (Opt‑in, later)

- Local counters: successes, errors, avg latency (no content logging).
- If enabled, send anonymous aggregates to your own endpoint (with user consent).

---

## 19) Cost Controls

- Temperature default 0.2; keep prompts lean; truncate inputs.
- Optional “economy mode” model (e.g., `gpt-5-mini`) vs “quality mode”.

---

## 20) Compliance Notes

- Provide GDPR/CCPA‑style toggle: “Do not send data to third‑party AI” (disables calls unless proxy marked first‑party).
- Clear privacy policy describing data handling.

---

**End of Plan**
