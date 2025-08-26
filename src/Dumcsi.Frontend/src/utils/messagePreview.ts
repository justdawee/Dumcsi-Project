/**
 * Utility function to generate appropriate previews for message content in sidebars and lists
 */
export const getMessagePreview = (content: string): string => {
  if (!content || !content.trim()) {
    return '';
  }

  // Check for GIF URLs (Tenor, Giphy, etc.)
  if (content.match(/^https?:\/\/.*\.(gif)(\?.*)?$/i) || 
      content.includes('tenor.com') || 
      content.includes('giphy.com')) {
    return '🎬 GIF';
  }

  // Check for image URLs
  if (content.match(/^https?:\/\/.*\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i)) {
    return '📷 Photo';
  }

  // Check for video URLs
  if (content.match(/^https?:\/\/.*\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i)) {
    return '🎥 Video';
  }

  // Check for audio URLs
  if (content.match(/^https?:\/\/.*\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/i)) {
    return '🎵 Audio';
  }

  // Check for generic file URLs or if content looks like a file attachment
  if (content.match(/^https?:\/\/.*\/.*\.[a-zA-Z0-9]+(\?.*)?$/i)) {
    return '📎 Attachment';
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
      return '🎬 GIF';
    }
    if (url.match(/\.(png|jpg|jpeg|webp|svg)(\?.*)?$/i)) {
      return '📷 Photo';
    }
    if (url.match(/\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i)) {
      return '🎥 Video';
    }
    if (url.match(/\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/i)) {
      return '🎵 Audio';
    }
    if (url.match(/\.[a-zA-Z0-9]+(\?.*)?$/)) {
      return '📎 Attachment';
    }
    
    return '🔗 Link';
  }

  // Check for plain URLs
  if (content.match(/^https?:\/\/\S+$/)) {
    return '🔗 Link';
  }

  // For regular text messages, truncate and return as-is
  return content.length > 50 ? content.substring(0, 50) + '...' : content;
};