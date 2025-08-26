/**
 * Utility functions for filtering message content based on media types and attachments
 */

/**
 * Determines if a URL is likely a user attachment (uploaded file) vs user-typed embeddable URL
 * User attachments typically come from a specific domain pattern or are in markdown format
 */
export const isUserAttachmentUrl = (url: string, attachments: any[] = []): boolean => {
  // Check if this URL matches any of the message attachments
  if (attachments.some(att => att.url === url || att.downloadUrl === url)) {
    return true;
  }

  // Check for common attachment URL patterns from your backend
  // This would need to be adjusted based on your actual file storage URL patterns
  const attachmentPatterns = [
    /https?:\/\/192\.168\.0\.50.*\/attachments\//i, // Your local server attachment pattern
    /https?:\/\/.*\/uploads?\//i, // Common upload directory patterns
    /https?:\/\/.*\/files?\//i,   // Common file directory patterns
  ];

  return attachmentPatterns.some(pattern => pattern.test(url));
};

/**
 * Removes embeddable URLs from content when they have previews, but keeps user attachments
 */
export const filterContentForDisplay = (content: string, embeddableUrls: string[], attachments: any[] = []): string => {
  let filteredContent = content;

  // Only remove URLs that are embeddable and NOT user attachments
  embeddableUrls.forEach(url => {
    if (!isUserAttachmentUrl(url, attachments)) {
      // Remove the URL from content since we're showing a preview
      filteredContent = filteredContent.replace(new RegExp(escapeRegex(url), 'gi'), '');
    }
  });

  // Clean up extra whitespace
  return filteredContent
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
};

/**
 * Escape special regex characters in a string
 */
const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Extract only user-typed embeddable URLs (not attachments) for editing
 */
export const extractEditableUrls = (content: string, attachments: any[] = []): string[] => {
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  const urls: string[] = [];
  let match;

  while ((match = urlPattern.exec(content)) !== null) {
    const url = match[0];
    if (!isUserAttachmentUrl(url, attachments)) {
      urls.push(url);
    }
  }

  return urls;
};