// Utilities to produce short, human-friendly previews for message content
// especially when content is just a media/link or consists of attachments.
import { i18n } from '@/i18n';

export type BasicAttachment = { contentType: string | null; fileUrl?: string; fileName?: string };

const URL_RE = /^(https?:\/\/[^\s]+)$/i;

function classifyByContentType(ct: string | null | undefined): 'gif' | 'image' | 'video' | 'audio' | 'attachment' {
  const t = (ct || '').toLowerCase();
  if (!t) return 'attachment';
  if (t.includes('gif')) return 'gif';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return 'attachment';
}

function classifyByUrl(url: string): 'gif' | 'image' | 'video' | 'audio' | 'attachment' {
  const u = url.toLowerCase();
  if (u.endsWith('.gif')) return 'gif';
  if (u.endsWith('.png') || u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.webp') || u.endsWith('.bmp')) return 'image';
  if (u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.mov') || u.endsWith('.mkv')) return 'video';
  if (u.endsWith('.mp3') || u.endsWith('.wav') || u.endsWith('.ogg') || u.endsWith('.m4a') || u.endsWith('.flac')) return 'audio';
  return 'attachment';
}

function titleForKind(kind: 'gif' | 'image' | 'video' | 'audio' | 'attachment'): string {
  const key =
    kind === 'gif' ? 'chat.summary.gif'
    : kind === 'image' ? 'chat.summary.image'
    : kind === 'video' ? 'chat.summary.video'
    : kind === 'audio' ? 'chat.summary.audio'
    : 'chat.summary.attachment';
  return i18n.global.t(key) as unknown as string;
}

export function summarizeMessagePreview(content: string, attachments?: BasicAttachment[] | null, maxLen = 140): string {
  const trimmed = (content || '').trim();

  // Prefer attachments when present
  if (attachments && attachments.length > 0) {
    // If multiple attachments, pick the first type but keep generic wording
    const kinds = attachments.map(a => classifyByContentType(a?.contentType)).filter(Boolean);
    const kind = kinds.includes('gif') ? 'gif'
      : kinds.includes('video') ? 'video'
      : kinds.includes('image') ? 'image'
      : kinds.includes('audio') ? 'audio'
      : 'attachment';
    return titleForKind(kind);
  }

  // If content is only a URL, try to classify by extension
  if (trimmed && URL_RE.test(trimmed)) {
    const kind = classifyByUrl(trimmed);
    return titleForKind(kind);
  }

  // Otherwise return truncated text content
  if (!trimmed) return '';
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + '…' : trimmed;
}
