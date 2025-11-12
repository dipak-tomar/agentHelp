# Agent Help - Comprehensive Testing Guide

## 📋 Pre-Test Setup

### Installation

1. **Build the extension:**
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist/` folder

3. **Configure API Key:**
   - Click the extension icon
   - Options page opens automatically
   - Enter your OpenAI API key
   - Click "Save Settings"
   - ✅ Verify: Green success message appears

---

## 🧪 Test Suite

### 1. Options Page Tests

#### 1.1 API Configuration
- [ ] **Test:** Open options page (`chrome://extensions/` → Agent Help → Options)
- [ ] **Test:** Enter API key and save
  - ✅ Success message appears
  - ✅ Settings persist after refresh
- [ ] **Test:** Change model selection (GPT-4o-mini → GPT-4o)
  - ✅ Dropdown works correctly
  - ✅ Selection persists
- [ ] **Test:** Adjust temperature slider
  - ✅ Value updates in real-time
  - ✅ Range: 0.0 to 1.0
- [ ] **Test:** Try custom base URL
  - ✅ Accepts valid URLs
  - ✅ Error handling for invalid URLs

#### 1.2 Resume Upload Tests
- [ ] **Test:** Upload .txt resume
  - ✅ File accepted
  - ✅ Parsing completes
  - ✅ Preview shows: name, email, phone, skills
- [ ] **Test:** Upload .pdf resume
  - ✅ PDF parsing works
  - ✅ Text extracted correctly
  - ✅ Structured data displayed
- [ ] **Test:** Upload invalid file (e.g., .docx)
  - ✅ Error message: "Unsupported file type"
- [ ] **Test:** Delete resume data
  - ✅ Confirmation dialog appears
  - ✅ Resume data cleared
  - ✅ Upload button reappears

#### 1.3 Privacy Settings
- [ ] **Test:** Toggle conversation storage (session ↔ local)
  - ✅ Setting saves correctly
  - ✅ Behavior changes accordingly
- [ ] **Test:** Toggle auto-open sidebar
  - ✅ Checkbox works
  - ✅ Setting persists

---

### 2. Sidebar Chat Tests

#### 2.1 Basic Chat Functionality
- [ ] **Test:** Open sidebar on any webpage
  - Navigate to: https://www.nytimes.com/section/technology
  - Click extension icon
  - ✅ Sidebar opens on right side
  - ✅ Page title appears at top

- [ ] **Test:** Ask first question
  - Type: "What is this page about?"
  - Click "Send"
  - ✅ Loading indicator appears
  - ✅ Response streams token-by-token
  - ✅ Response relevant to page content

- [ ] **Test:** Follow-up question
  - Type: "Can you summarize the main points?"
  - ✅ AI uses conversation history
  - ✅ Response maintains context

- [ ] **Test:** Clear conversation
  - Click trash icon (🗑️)
  - ✅ All messages cleared
  - ✅ Fresh conversation starts

#### 2.2 Streaming Tests
- [ ] **Test:** Long response streaming
  - Ask: "Explain this article in detail with examples"
  - ✅ Tokens appear progressively
  - ✅ No lag or freezing
  - ✅ Auto-scroll to bottom
  - ✅ Complete message saved after stream ends

#### 2.3 Markdown Rendering
- [ ] **Test:** Request formatted response
  - Ask: "Create a bullet list of key takeaways"
  - ✅ Bullet points render correctly
  - ✅ Bold/italic formatting works

- [ ] **Test:** Code blocks
  - Ask: "Show me example code"
  - ✅ Code blocks have syntax highlighting
  - ✅ Monospace font applied

#### 2.4 Error Handling
- [ ] **Test:** Invalid API key
  - Change API key to invalid value in Options
  - Try chat
  - ✅ Error banner appears
  - ✅ Error message clear and helpful

- [ ] **Test:** Network error
  - Disable network
  - Send message
  - ✅ Error handled gracefully
  - ✅ Can retry after reconnecting

---

### 3. Page Content Extraction Tests

Test on various page types to ensure extraction quality:

#### 3.1 News Articles
- [ ] **Site:** https://www.nytimes.com/section/technology
  - ✅ Main article content extracted
  - ✅ No ads or navigation in content
  - ✅ Author name detected (if available)

- [ ] **Site:** https://www.bbc.com/news
  - ✅ Clean text extraction
  - ✅ Readability.js processes correctly

#### 3.2 Blog Posts
- [ ] **Site:** https://medium.com (any article)
  - ✅ Full article content captured
  - ✅ No sidebars or recommendations

- [ ] **Site:** https://dev.to (any post)
  - ✅ Code blocks extracted as text
  - ✅ Clean formatting

#### 3.3 Documentation
- [ ] **Site:** https://developer.mozilla.org/en-US/docs/Web/JavaScript
  - ✅ Technical content extracted
  - ✅ Code examples preserved
  - ✅ Navigation excluded

#### 3.4 Social Media
- [ ] **Site:** https://reddit.com (any post)
  - ✅ Post content + top comments
  - ✅ Reasonable content limits

#### 3.5 E-commerce
- [ ] **Site:** Any product page (Amazon, etc.)
  - ✅ Product description extracted
  - ✅ Key details captured
  - ✅ No excessive boilerplate

---

### 4. Form Autofill Tests

#### 4.1 Prerequisites
- Upload resume in Options page (must have name, email, phone, experience, skills)

#### 4.2 Simple Forms
- [ ] **Test:** Contact form
  - Navigate to any contact form
  - Open sidebar
  - ✅ "Autofill Form" button appears
  - Click "Autofill"
  - ✅ Name filled correctly
  - ✅ Email filled correctly
  - ✅ Phone filled correctly
  - ✅ Fields highlighted briefly (green flash)

#### 4.3 Job Applications
- [ ] **LinkedIn Easy Apply:**
  - Find LinkedIn job posting with Easy Apply
  - Click Easy Apply
  - Open sidebar → Click "Autofill Form"
  - ✅ Personal info filled
  - ✅ Experience fields populated
  - ✅ Skills added

- [ ] **Indeed Application:**
  - Navigate to Indeed job listing
  - Click "Apply Now"
  - Use autofill feature
  - ✅ Resume data mapped correctly
  - ✅ Essay questions answered intelligently
  - ✅ Can review before submitting

- [ ] **Greenhouse Application:**
  - Find Greenhouse-powered career page
  - Start application
  - ✅ Multi-step form handled
  - ✅ All relevant fields filled

#### 4.4 Edge Cases
- [ ] **Test:** Form with no resume uploaded
  - ✅ Error: "No resume data found"
  - ✅ Prompts to upload in Options

- [ ] **Test:** Complex form (dropdowns, checkboxes)
  - ✅ Text fields filled correctly
  - ✅ Dropdowns skipped or best-effort

- [ ] **Test:** Form preview before submit
  - ✅ Can edit autofilled values
  - ✅ Form validation still works

---

### 5. Conversation Memory Tests

#### 5.1 Session Storage
- [ ] **Setup:** Set storage to "Session" in Options
- [ ] **Test:** Have conversation
  - ✅ History maintained within session
- [ ] **Test:** Close browser → Reopen
  - ✅ History cleared

#### 5.2 Local Storage
- [ ] **Setup:** Set storage to "Local" in Options
- [ ] **Test:** Have conversation
- [ ] **Test:** Close browser → Reopen extension
  - ✅ History persists
  - ✅ Can continue conversation

#### 5.3 Page Navigation
- [ ] **Test:** Chat on Page A
  - Ask question about page
- [ ] **Test:** Navigate to Page B (different domain)
  - Open sidebar
  - ✅ New conversation started
  - ✅ Page A history not shown

- [ ] **Test:** Go back to Page A
  - ✅ Original conversation restored (if local storage enabled)

#### 5.4 History Limits
- [ ] **Test:** Send 15+ messages
  - ✅ Only last 10 messages kept
  - ✅ No performance degradation

---

### 6. Performance Tests

#### 6.1 Build Size
- [ ] **Check:** `ls -lh dist/`
  - background.js: ~567 KB ✅ (acceptable)
  - options.js: ~583 KB ✅ (acceptable)
  - sidebar.js: ~51 KB ✅ (good)
  - Total: ~1.2 MB ✅ (within limits)

#### 6.2 Loading Speed
- [ ] **Test:** Extension initialization
  - ✅ Loads in < 1 second
  - ✅ No noticeable delay on page load

#### 6.3 Memory Usage
- [ ] **Test:** Chrome Task Manager
  - Open sidebar on 5 different pages
  - Check `chrome://extensions/` → "Inspect views: background page"
  - ✅ Memory < 100 MB per tab
  - ✅ No memory leaks after 10+ interactions

#### 6.4 Streaming Performance
- [ ] **Test:** Large response
  - Ask for detailed explanation
  - ✅ Smooth token-by-token rendering
  - ✅ No UI freezing
  - ✅ Auto-scroll works

---

### 7. Cross-Browser Tests

#### 7.1 Chrome
- [ ] All features work ✅

#### 7.2 Edge
- [ ] Load extension in Edge
- [ ] Test sidebar, chat, autofill
- [ ] ✅ Compatible

#### 7.3 Brave
- [ ] Load extension in Brave
- [ ] Test core features
- [ ] ✅ Compatible

---

### 8. Security & Privacy Tests

#### 8.1 Data Storage
- [ ] **Test:** Open DevTools → Application → Storage
  - ✅ API key stored in `chrome.storage.local`
  - ✅ Resume data encrypted or local only
  - ✅ No data sent to third parties (except OpenAI API)

#### 8.2 Sensitive Fields
- [ ] **Test:** Form with password field
  - ✅ Password fields NOT autofilled
  - ✅ Credit card fields NOT autofilled

#### 8.3 Permissions
- [ ] **Test:** Check manifest permissions
  - ✅ Only necessary permissions requested
  - ✅ No excessive host permissions

---

### 9. Error Recovery Tests

#### 9.1 API Rate Limits
- [ ] **Test:** Send many rapid requests
  - ✅ Rate limit error handled
  - ✅ User informed clearly

#### 9.2 Invalid Page Content
- [ ] **Test:** Visit page with no extractable content (e.g., PDF viewer)
  - ✅ Graceful fallback
  - ✅ Error message helpful

#### 9.3 Extension Reload
- [ ] **Test:** Reload extension while chat active
  - ✅ Connection re-established
  - ✅ No data loss (if local storage)

---

## 🐛 Bug Reporting Template

If you find issues, report with:

```
**Bug Title:** [Short description]

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Result:**
...

**Actual Result:**
...

**Environment:**
- Browser: Chrome/Edge/Brave
- Version: ...
- Extension Version: 1.0.0

**Console Errors:**
[Paste errors from DevTools console]

**Screenshots:**
[If applicable]
```

---

## ✅ Sign-Off Checklist

Before release, verify:

- [ ] All 9 test categories passed
- [ ] No console errors in normal use
- [ ] Performance acceptable on 10+ different sites
- [ ] Memory usage stable over 1-hour session
- [ ] Autofill works on 3+ major job sites
- [ ] PDF and TXT resume parsing both work
- [ ] Streaming responses work smoothly
- [ ] Readability.js improves extraction quality
- [ ] Privacy audit passed (no data leaks)
- [ ] Documentation complete and accurate

---

**Happy Testing! 🎉**
