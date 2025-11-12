import { PageContext } from '../shared/types';
import { truncateText } from '../shared/utils';

// Extract page content using a simplified approach (Readability.js can be added later)
export function extractPageContent(): PageContext {
  try {
    // Get page metadata
    const metadata = {
      description: getMetaContent('description'),
      author: getMetaContent('author'),
      publishDate: getMetaContent('article:published_time'),
    };

    // Extract main content
    const content = extractMainContent();

    return {
      url: window.location.href,
      title: document.title,
      content: truncateText(content, 10000),
      metadata,
    };
  } catch (error) {
    console.error('Page extraction error:', error);
    return {
      url: window.location.href,
      title: document.title,
      content: 'Failed to extract page content',
    };
  }
}

// Get meta tag content
function getMetaContent(name: string): string | undefined {
  const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  return meta?.getAttribute('content') || undefined;
}

// Extract main content from the page
function extractMainContent(): string {
  // Try to find main content areas
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.article-content',
    '#content',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return cleanText(element.textContent || '');
    }
  }

  // Fallback: get body text but filter out navigation, headers, footers
  const body = document.body.cloneNode(true) as HTMLElement;

  // Remove unwanted elements
  const unwantedSelectors = [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    '.navigation',
    '.sidebar',
    '.menu',
    '#comments',
    '.ad',
    '.advertisement',
  ];

  unwantedSelectors.forEach((selector) => {
    body.querySelectorAll(selector).forEach((el) => el.remove());
  });

  return cleanText(body.textContent || '');
}

// Clean and normalize text
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}
