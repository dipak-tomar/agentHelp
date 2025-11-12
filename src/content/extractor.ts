import { Readability } from '@mozilla/readability';
import { PageContext } from '../shared/types';
import { truncateText } from '../shared/utils';

// Extract page content using Readability.js with fallback
export function extractPageContent(): PageContext {
  try {
    // Get page metadata
    const metadata = {
      description: getMetaContent('description'),
      author: getMetaContent('author'),
      publishDate: getMetaContent('article:published_time'),
    };

    // Try using Readability for article extraction
    let content = '';
    let title = document.title;

    try {
      // Clone document for Readability
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (article) {
        content = article.textContent || article.content || '';
        title = article.title || document.title;

        // Update metadata if available
        if (article.byline && !metadata.author) {
          metadata.author = article.byline;
        }
      }
    } catch (readabilityError) {
      console.warn('Readability failed, falling back to manual extraction:', readabilityError);
    }

    // Fallback to manual extraction if Readability failed or returned empty
    if (!content.trim()) {
      content = extractMainContent();
    }

    return {
      url: window.location.href,
      title: title,
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
