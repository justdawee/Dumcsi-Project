/**
 * Utility function to generate appropriate previews for message content in sidebars and lists
 */
import { i18n } from '@/i18n';

export const getMessagePreview = (content: string): string => {
  const t = (key: string) => {
    return i18n.global.t(key) as unknown as string;
  };
  if (!content || !content.trim()) {
    return '';
  }

  // Check for GIF URLs (Tenor, Giphy, etc.)
  if (content.match(/^https?:\/\/.*\.(gif)(\?.*)?$/i) || 
      content.includes('tenor.com') || 
      content.includes('giphy.com')) {
    return t('chat.preview.gif');
  }

  // Check for image URLs
  if (content.match(/^https?:\/\/.*\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i)) {
    return t('chat.preview.image');
  }

  // Check for video URLs
  if (content.match(/^https?:\/\/.*\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i)) {
    return t('chat.preview.video');
  }

  // Check for audio URLs
  if (content.match(/^https?:\/\/.*\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/i)) {
    return t('chat.preview.audio');
  }

  // Check for generic file URLs or if content looks like a file attachment
  if (content.match(/^https?:\/\/.*\/.*\.[a-zA-Z0-9]+(\?.*)?$/i)) {
    return t('chat.preview.attachment');
  }

  // Check for markdown image syntax: ![alt](url)
  if (content.match(/!\[.*?\]\(.*?\)/)) {
    return '📷 Photo';
  }

  // Check for markdown link syntax: [text](url)
  const linkMatch = content.match(/\[.*?\]\((.*?)\)/);
  if (linkMatch) {
    const url = linkMatch[1];
    
    // Check what type of file the link points to
    if (url.match(/\.(gif)(\?.*)?$/i) || url.includes('tenor.com') || url.includes('giphy.com')) {
      return t('chat.preview.gif');
    }
    if (url.match(/\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i)) {
      return t('chat.preview.image');
    }
    if (url.match(/\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i)) {
      return t('chat.preview.video');
    }
    if (url.match(/\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/i)) {
      return t('chat.preview.audio');
    }
    if (url.match(/\.[a-zA-Z0-9]+(\?.*)?$/)) {
      return t('chat.preview.attachment');
    }
    
    return t('chat.preview.link');
  }

  // Check for plain URLs
  if (content.match(/^https?:\/\/\S+$/)) {
    return t('chat.preview.link');
  }

  // For regular text messages, truncate and return as-is
  return content.length > 50 ? content.substring(0, 50) + '...' : content;
};
