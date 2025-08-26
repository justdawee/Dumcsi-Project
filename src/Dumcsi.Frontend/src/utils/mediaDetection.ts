/**
 * Utilities for detecting and extracting embeddable media content from text
 */
import { isUserAttachmentUrl } from './contentFiltering';

export interface EmbeddableMedia {
  type: 'image' | 'gif' | 'video' | 'youtube' | 'audio' | 'twitter' | 'link';
  url: string;
  title?: string;
  thumbnail?: string;
  embedUrl?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
  isUserAttachment?: boolean; // Distinguishes user uploads vs embeddable URLs
}

/**
 * Extract all embeddable media from text content
 */
export const extractEmbeddableMedia = (content: string, attachments: any[] = []): EmbeddableMedia[] => {
  const media: EmbeddableMedia[] = [];
  
  // URL patterns to match
  const patterns = {
    // YouTube URLs
    youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi,
    
    // Image URLs (including GIFs)
    image: /https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s<>"']*)?/gi,
    
    // Video URLs
    video: /https?:\/\/[^\s<>"']+\.(?:mp4|webm|mov|avi|mkv|m4v|3gp|flv)(?:\?[^\s<>"']*)?/gi,
    
    // Audio URLs
    audio: /https?:\/\/[^\s<>"']+\.(?:mp3|wav|ogg|aac|flac|m4a|opus|weba)(?:\?[^\s<>"']*)?/gi,
    
    // GIF services
    giphy: /https?:\/\/(?:media\.)?giphy\.com\/[^\s<>"']+/gi,
    tenor: /https?:\/\/tenor\.com\/[^\s<>"']+/gi,
    
    // Twitter/X URLs
    twitter: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\/\s]+\/status\/\d+/gi,
    
    // Generic links (processed last)
    link: /https?:\/\/[^\s<>"']+/gi
  };

  // Process YouTube URLs
  let match;
  while ((match = patterns.youtube.exec(content)) !== null) {
    const videoId = match[1];
    const url = match[0];
    media.push({
      type: 'youtube',
      url,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      metadata: { videoId },
      isUserAttachment: isUserAttachmentUrl(url, attachments)
    });
  }

  // Process direct image URLs
  patterns.image.lastIndex = 0;
  while ((match = patterns.image.exec(content)) !== null) {
    const url = match[0];
    const isGif = url.toLowerCase().includes('.gif');
    media.push({
      type: isGif ? 'gif' : 'image',
      url,
      isUserAttachment: isUserAttachmentUrl(url, attachments)
    });
  }

  // Process direct video URLs
  patterns.video.lastIndex = 0;
  while ((match = patterns.video.exec(content)) !== null) {
    const url = match[0];
    media.push({
      type: 'video',
      url,
      isUserAttachment: isUserAttachmentUrl(url, attachments)
    });
  }

  // Process direct audio URLs
  patterns.audio.lastIndex = 0;
  while ((match = patterns.audio.exec(content)) !== null) {
    const url = match[0];
    media.push({
      type: 'audio',
      url,
      isUserAttachment: isUserAttachmentUrl(url, attachments)
    });
  }

  // Process Giphy URLs
  patterns.giphy.lastIndex = 0;
  while ((match = patterns.giphy.exec(content)) !== null) {
    const url = match[0];
    media.push({
      type: 'gif',
      url,
      isUserAttachment: isUserAttachmentUrl(url, attachments)
    });
  }

  // Process Tenor URLs
  patterns.tenor.lastIndex = 0;
  while ((match = patterns.tenor.exec(content)) !== null) {
    const url = match[0];
    media.push({
      type: 'gif',
      url,
      isUserAttachment: isUserAttachmentUrl(url, attachments)
    });
  }

  // Process Twitter URLs
  patterns.twitter.lastIndex = 0;
  while ((match = patterns.twitter.exec(content)) !== null) {
    const url = match[0];
    media.push({
      type: 'twitter',
      url,
      isUserAttachment: isUserAttachmentUrl(url, attachments)
    });
  }

  // Remove duplicates based on URL
  const uniqueMedia = media.filter((item, index, array) => 
    array.findIndex(i => i.url === item.url) === index
  );

  return uniqueMedia;
};

/**
 * Get YouTube video ID from URL
 */
export const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Check if URL is a supported embeddable media type
 */
export const isEmbeddableUrl = (url: string): boolean => {
  const patterns = [
    // YouTube
    /(?:youtube\.com|youtu\.be)/i,
    
    // Images and GIFs
    /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i,
    
    // Videos
    /\.(mp4|webm|mov|avi|mkv|m4v|3gp|flv)(\?.*)?$/i,
    
    // Audio
    /\.(mp3|wav|ogg|aac|flac|m4a|opus|weba)(\?.*)?$/i,
    
    // GIF services
    /(?:giphy\.com|tenor\.com)/i,
    
    // Twitter/X
    /(?:twitter\.com|x\.com)\/[^\/\s]+\/status\/\d+/i
  ];

  return patterns.some(pattern => pattern.test(url));
};

/**
 * Get appropriate dimensions for different media types
 */
export const getMediaDimensions = (type: EmbeddableMedia['type']): { width: number; height: number } => {
  switch (type) {
    case 'youtube':
      return { width: 560, height: 315 };
    case 'image':
    case 'gif':
      return { width: 400, height: 300 };
    case 'video':
      return { width: 480, height: 360 };
    case 'audio':
      return { width: 350, height: 50 };
    case 'twitter':
      return { width: 550, height: 400 };
    default:
      return { width: 400, height: 200 };
  }
};