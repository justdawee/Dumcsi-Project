import type { MessageListItem } from '@/services/types';

export function formatMessageContent(message: MessageListItem): string {
  let content = message.content;
  
  // Replace user mentions
  if (message.mentionedUsers) {
    message.mentionedUsers.forEach(user => {
      const displayName = user.globalNickname || user.username;
      const mentionRegex = new RegExp(`@${displayName}`, 'g');
      content = content.replace(
        mentionRegex,
        `<span class="mention-user" data-user-id="${user.id}">@${displayName}</span>`
      );
    });
  }
  
  // Replace role mentions
  if (message.mentionedRoles) {
    message.mentionedRoles.forEach(role => {
      const mentionRegex = new RegExp(`@${role.name}`, 'g');
      content = content.replace(
        mentionRegex,
        `<span class="mention-role" data-role-id="${role.id}" style="color: ${role.color}">@${role.name}</span>`
      );
    });
  }
  
  return content;
}