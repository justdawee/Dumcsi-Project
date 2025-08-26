/**
 * Utility functions for handling message content, especially separating text from attachment URLs
 */
import { isUserAttachmentUrl } from './contentFiltering';

/**
 * Extracts the text content from a message, removing attachment URLs and file links
 * This is used when editing messages to show only the actual text content, not the attachment URLs
 */
export const extractTextContent = (content: string, attachments: any[] = []): string => {
  if (!content || !content.trim()) {
    return '';
  }

  let textContent = content;

  // Find all URLs in the content
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  let match;
  const urlsToRemove: string[] = [];

  while ((match = urlPattern.exec(content)) !== null) {
    const url = match[0];
    // Only remove URLs that are user attachments, keep embeddable URLs for editing
    if (isUserAttachmentUrl(url, attachments)) {
      urlsToRemove.push(url);
    }
  }

  // Remove user attachment URLs
  urlsToRemove.forEach(url => {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    textContent = textContent.replace(new RegExp(escapedUrl, 'gi'), '');
  });

  // Clean up multiple whitespaces and newlines left by URL removal
  textContent = textContent
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .replace(/\s*\n\s*/g, '\n') // Clean up spaces around newlines
    .trim();

  return textContent;
};

/**
 * Reconstructs the full message content by combining text with existing attachment URLs
 * This is used when saving edited messages to preserve attachments while updating text
 */
export const reconstructMessageContent = (originalContent: string, newTextContent: string): string => {
  // Get all the attachment URLs from the original content
  const attachmentPatterns = [
    // Markdown images
    /!\[.*?\]\((https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg).*?)\)/gi,
    
    // Markdown links to files
    /\[.*?\]\((https?:\/\/.*\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi|mkv|mp3|wav|ogg|aac|flac|m4a|pdf|doc|docx|txt|zip|rar|tar|gz).*?)\)/gi,
    
    // Known media service URLs
    /(https?:\/\/(?:tenor\.com|giphy\.com|media\.giphy\.com)\/[^\s]+)/gi,
    
    // Direct file URLs
    /(https?:\/\/[^\s]*\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi|mkv|mp3|wav|ogg|aac|flac|m4a|pdf|doc|docx|txt|zip|rar|tar|gz)(?:\?[^\s]*)?)/gi,
  ];

  const attachmentUrls: string[] = [];
  
  attachmentPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(originalContent)) !== null) {
      // For patterns with capture groups, use the first capture group
      // For patterns without capture groups, use the full match
      const url = match[1] || match[0];
      if (url && !attachmentUrls.includes(url)) {
        attachmentUrls.push(url);
      }
    }
  });

  // If there's new text content, combine it with the attachments
  if (newTextContent.trim()) {
    if (attachmentUrls.length > 0) {
      return `${newTextContent.trim()}\n${attachmentUrls.join('\n')}`;
    }
    return newTextContent.trim();
  }

  // If no text content but there are attachments, just return the attachments
  if (attachmentUrls.length > 0) {
    return attachmentUrls.join('\n');
  }

  // If no text and no attachments, return empty
  return '';
};

/**
 * Checks if a message content consists only of attachment URLs (no text)
 */
export const isAttachmentOnlyMessage = (content: string): boolean => {
  const textContent = extractTextContent(content);
  return textContent.trim() === '';
};