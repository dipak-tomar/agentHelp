# Agent Help - Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Chrome, Edge, or Brave browser
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Build the extension:**
```bash
npm run build
```

3. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist/` folder from this project

4. **Configure API Key:**
   - Click the extension icon in Chrome toolbar
   - It will open the Options page automatically
   - Enter your OpenAI API key
   - Click "Save Settings"

### Development Workflow

**Watch mode** (rebuilds on file changes):
```bash
npm run watch
```

**One-time build:**
```bash
npm run build
```

**Clean build artifacts:**
```bash
npm run clean
```

After making changes:
1. Save your files (watch mode rebuilds automatically)
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Agent Help extension
4. Reload any open tabs where you want to test

## 📁 Project Structure

```
agent-help/
├── src/
│   ├── background/          # Service worker (LangChain + AI logic)
│   │   ├── background.ts    # Main background script
│   │   ├── llm.ts          # LangChain client
│   │   ├── chat-handler.ts # Page-aware chat
│   │   ├── autofill-handler.ts # Form autofill
│   │   └── resume-parser.ts # Resume parsing
│   ├── content/            # Content scripts (injected into pages)
│   │   ├── content.ts      # Main content script
│   │   ├── extractor.ts    # Page content extraction
│   │   └── form-detector.ts # Form field detection
│   ├── sidebar/            # Sidebar UI (Preact)
│   │   ├── sidebar.html
│   │   ├── sidebar.tsx     # Main sidebar component
│   │   └── sidebar.css
│   ├── options/            # Options page (Preact)
│   │   ├── options.html
│   │   ├── options.tsx     # Settings & resume upload
│   │   └── options.css
│   └── shared/             # Shared utilities
│       ├── types.ts        # TypeScript interfaces
│       ├── storage.ts      # Chrome storage helpers
│       └── utils.ts        # Utility functions
├── dist/                   # Built extension (load this in Chrome)
├── manifest.json           # Extension manifest
├── package.json
├── tsconfig.json
└── esbuild.config.js
```

## 🧪 Testing

### Manual Testing Checklist

#### Chat Feature
- [ ] Open sidebar on any webpage (click extension icon)
- [ ] Ask "What's this page about?"
- [ ] Verify AI responds with page context
- [ ] Ask follow-up question
- [ ] Verify conversation history is maintained
- [ ] Navigate to different page
- [ ] Verify new conversation starts
- [ ] Clear conversation and verify history is cleared

#### Form Autofill
- [ ] Upload resume (.txt) in Options page
- [ ] Verify resume is parsed correctly
- [ ] Visit a job application page (e.g., LinkedIn, Indeed)
- [ ] Open sidebar
- [ ] Click "Autofill Form" button
- [ ] Verify form fields are filled
- [ ] Check that filled fields have correct values
- [ ] Review and edit values if needed

#### Settings
- [ ] Open Options page
- [ ] Configure API key
- [ ] Change model (try GPT-4o-mini, GPT-4o)
- [ ] Adjust temperature slider
- [ ] Toggle conversation storage (session vs local)
- [ ] Save settings and verify they persist

### Test Sites

**News/Articles:**
- https://www.nytimes.com (any article)
- https://medium.com (any post)
- https://developer.mozilla.org (MDN docs)

**Job Applications:**
- https://www.linkedin.com/jobs
- https://www.indeed.com
- Company career pages with application forms

**Complex Pages:**
- https://github.com (repository pages)
- https://stackoverflow.com (questions)
- https://www.reddit.com (posts)

## 🐛 Debugging

### View Logs

**Background Service Worker:**
1. Go to `chrome://extensions/`
2. Click "Inspect views: background page" under Agent Help
3. Check Console tab

**Content Script:**
1. Open Developer Tools on any page (F12)
2. Check Console tab
3. Look for "Agent Help content script loaded"

**Sidebar:**
1. Open sidebar
2. Right-click in sidebar → "Inspect"
3. Check Console tab

### Common Issues

**"OpenAI API key not configured"**
- Make sure you've saved your API key in Options page
- Refresh the extension after saving

**"Failed to extract page content"**
- Some pages block content scripts (e.g., chrome://, chrome-extension://)
- Try a regular webpage (e.g., news article, blog post)

**Form autofill not working**
- Ensure resume is uploaded in Options
- Check that page has detectable form fields
- Try refreshing the page after loading extension

**Build errors**
- Delete `node_modules/` and run `npm install` again
- Make sure you're using Node.js 18+

## 🔧 Configuration

### API Settings

Default model: `gpt-4o-mini` (fast and cheap)

For better quality:
- Use `gpt-4o` (balanced)
- Use `gpt-4-turbo` (more capable)

For custom endpoints:
- Change Base URL in Options
- Works with OpenAI-compatible APIs

### Privacy Settings

**Conversation Storage:**
- `session`: Cleared when browser closes (more private)
- `local`: Persists across sessions (better UX)

All data is stored locally in Chrome's storage. Nothing is sent to third parties except your chosen OpenAI API endpoint.

## 📦 Building for Production

1. Update version in `manifest.json` and `package.json`
2. Build with minification:
```bash
npm run build
```
3. Test thoroughly
4. Zip the `dist/` folder
5. Submit to Chrome Web Store

## 🔮 Next Steps (TODO)

- [ ] Add PDF support for resume parsing (currently .txt only)
- [ ] Implement streaming responses (token-by-token)
- [ ] Add Readability.js for better page extraction
- [ ] Optimize bundle size (tree-shaking, code splitting)
- [ ] Add proper icons (currently placeholder)
- [ ] Implement conversation export (markdown)
- [ ] Add more autofill strategies (hybrid preview)
- [ ] Support for multiple resume profiles
- [ ] Add tests (unit + integration)

## 📚 Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [LangChain JS Docs](https://js.langchain.com/)
- [Preact Docs](https://preactjs.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)

## 🆘 Getting Help

If you encounter issues:
1. Check the debugging section above
2. Review logs in developer console
3. Ensure API key is valid and has credits
4. Try on a simple webpage first (e.g., news article)
