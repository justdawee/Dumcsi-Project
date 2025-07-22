export interface ParsedNode {
    type: 'text' | 'bold' | 'italic' | 'bolditalic' | 'strikethrough' |
        'code' | 'codeblock' | 'blockquote' | 'spoiler' | 'link' |
        'user-mention' | 'role-mention' | 'channel-mention' | 'emoji' | 'linebreak';
    content: string;
    children?: ParsedNode[];
    data?: any; // Additional data for mentions, links, etc.
}

interface ParseContext {
    mentionedUserIds?: number[];
    mentionedRoleIds?: number[];
    userMap?: Map<string, any>;
    roleMap?: Map<string, any>;
    channelMap?: Map<string, any>;
}

export class MarkdownParser {
    private static readonly patterns = {
        // Inline patterns (order matters!)
        bolditalic: /\*\*\*(.*?)\*\*\*/g,
        bold: /\*\*(.*?)\*\*|__(.*?)__/g,
        italic: /\*(.*?)\*|_(.*?)_/g,
        strikethrough: /~~(.*?)~~/g,
        spoiler: /\|\|(.*?)\|\|/g,
        inlineCode: /`([^`]+)`/g,

        // Block patterns
        codeBlock: /```([\s\S]*?)```/g,
        blockquote: /^> (.*)$/gm,

        // Special patterns - javítva a felesleges escape karakterek
        userMention: /<@(\d+)>|@([a-zA-Z0-9_-]+)/g,
        roleMention: /<@&(\d+)>|@([a-zA-Z0-9_-]+)/g,
        channelMention: /<#(\d+)>|#([a-zA-Z0-9_-]+)/g,

        // Links and URLs - javítva a felesleges escape karakter
        link: /\[([^\]]+)]\(([^)]+)\)/g,
        autoLink: /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g,

        // Emoji
        customEmoji: /<:(\w+):(\d+)>/g,
        animatedEmoji: /<a:(\w+):(\d+)>/g,

        // Line breaks
        lineBreak: /\n/g,
    };

    static parse(text: string, context?: ParseContext): ParsedNode[] {
        if (!text) return [];

        // First, handle code blocks to prevent parsing inside them
        const codeBlockMap = new Map<string, string>();
        let codeBlockIndex = 0;

        text = text.replace(this.patterns.codeBlock, (_match: string, content: string) => {
            const placeholder = `__CODEBLOCK_${codeBlockIndex}__`;
            codeBlockMap.set(placeholder, content);
            codeBlockIndex++;
            return placeholder;
        });

        // Parse block elements first
        const lines = text.split('\n');
        const nodes: ParsedNode[] = [];
        let inBlockquote = false;
        let blockquoteContent: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for blockquote
            if (line.startsWith('> ')) {
                if (!inBlockquote) {
                    inBlockquote = true;
                    blockquoteContent = [];
                }
                blockquoteContent.push(line.substring(2));
            } else {
                // End blockquote if we were in one
                if (inBlockquote) {
                    nodes.push({
                        type: 'blockquote',
                        content: '',
                        children: this.parseInline(blockquoteContent.join('\n'), context, codeBlockMap)
                    });
                    inBlockquote = false;
                    blockquoteContent = [];
                }

                // Parse regular line
                if (line || i < lines.length - 1) {
                    nodes.push(...this.parseInline(line, context, codeBlockMap));
                    if (i < lines.length - 1) {
                        nodes.push({ type: 'linebreak', content: '\n' });
                    }
                }
            }
        }

        // Handle remaining blockquote
        if (inBlockquote && blockquoteContent.length > 0) {
            nodes.push({
                type: 'blockquote',
                content: '',
                children: this.parseInline(blockquoteContent.join('\n'), context, codeBlockMap)
            });
        }

        return this.mergeTextNodes(nodes);
    }

    private static parseInline(
        text: string,
        context?: ParseContext,
        codeBlockMap?: Map<string, string>
    ): ParsedNode[] {
        const nodes: ParsedNode[] = [];
        const tokens: Array<{start: number; end: number; node: ParsedNode}> = [];

        // Handle code blocks placeholders
        if (codeBlockMap) {
            const codeBlockPattern = /__CODEBLOCK_(\d+)__/g;
            let match: RegExpExecArray | null;
            while ((match = codeBlockPattern.exec(text)) !== null) {
                const placeholder = match[0];
                const content = codeBlockMap.get(placeholder) || '';
                tokens.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    node: { type: 'codeblock', content: content.trim() }
                });
            }
        }

        // Parse mentions with context
        if (context) {
            let match: RegExpExecArray | null;
            // User mentions
            this.patterns.userMention.lastIndex = 0;
            while ((match = this.patterns.userMention.exec(text)) !== null) {
                const userId = match[1];
                const username = match[2];

                if (userId || (username && context.userMap?.has(username.toLowerCase()))) {
                    tokens.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        node: {
                            type: 'user-mention',
                            content: match[0],
                            data: {
                                userId: userId ? parseInt(userId) : context.userMap?.get(username.toLowerCase())?.id,
                                username: username || context.userMap?.get(username.toLowerCase())?.username
                            }
                        }
                    });
                }
            }

            // Role mentions
            this.patterns.roleMention.lastIndex = 0;
            while ((match = this.patterns.roleMention.exec(text)) !== null) {
                const roleId = match[1];
                const roleName = match[2];

                if (roleId || (roleName && (roleName === 'everyone' || context.roleMap?.has(roleName.toLowerCase())))) {
                    tokens.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        node: {
                            type: 'role-mention',
                            content: match[0],
                            data: {
                                roleId: roleId ? parseInt(roleId) : context.roleMap?.get(roleName.toLowerCase())?.id,
                                roleName: roleName || context.roleMap?.get(roleName.toLowerCase())?.name
                            }
                        }
                    });
                }
            }

            // Channel mentions
            this.patterns.channelMention.lastIndex = 0;
            while ((match = this.patterns.channelMention.exec(text)) !== null) {
                const channelId = match[1];
                const channelName = match[2];

                if (channelId || (channelName && context.channelMap?.has(channelName.toLowerCase()))) {
                    tokens.push({
                        start: match.index,
                        end: match.index + match[0].length,
                        node: {
                            type: 'channel-mention',
                            content: match[0],
                            data: {
                                channelId: channelId ? parseInt(channelId) : context.channelMap?.get(channelName.toLowerCase())?.id,
                                channelName: channelName || context.channelMap?.get(channelName.toLowerCase())?.name
                            }
                        }
                    });
                }
            }
        }

        let match: RegExpExecArray | null;
        // Parse inline code (before other formatting)
        this.patterns.inlineCode.lastIndex = 0;
        while ((match = this.patterns.inlineCode.exec(text)) !== null) {
            tokens.push({
                start: match.index,
                end: match.index + match[0].length,
                node: { type: 'code', content: match[1] }
            });
        }

        // Parse links
        this.patterns.link.lastIndex = 0;
        while ((match = this.patterns.link.exec(text)) !== null) {
            tokens.push({
                start: match.index,
                end: match.index + match[0].length,
                node: {
                    type: 'link',
                    content: match[1],
                    data: { href: match[2] }
                }
            });
        }

        // Parse auto-links
        this.patterns.autoLink.lastIndex = 0;
        while ((match = this.patterns.autoLink.exec(text)) !== null) {
            // Check if this URL is already part of a markdown link
            const isInLink = tokens.some(t =>
                t.node.type === 'link' &&
                match!.index >= t.start &&
                match!.index < t.end
            );

            if (!isInLink) {
                tokens.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    node: {
                        type: 'link',
                        content: match[1],
                        data: { href: match[1] }
                    }
                });
            }
        }

        // Parse emoji
        this.patterns.customEmoji.lastIndex = 0;
        while ((match = this.patterns.customEmoji.exec(text)) !== null) {
            tokens.push({
                start: match.index,
                end: match.index + match[0].length,
                node: {
                    type: 'emoji',
                    content: match[0],
                    data: { name: match[1], id: match[2], animated: false }
                }
            });
        }

        this.patterns.animatedEmoji.lastIndex = 0;
        while ((match = this.patterns.animatedEmoji.exec(text)) !== null) {
            tokens.push({
                start: match.index,
                end: match.index + match[0].length,
                node: {
                    type: 'emoji',
                    content: match[0],
                    data: { name: match[1], id: match[2], animated: true }
                }
            });
        }

        // Parse formatting (in specific order)
        this.parseFormatting(text, tokens, 'spoiler', this.patterns.spoiler, context, codeBlockMap);
        this.parseFormatting(text, tokens, 'bolditalic', this.patterns.bolditalic, context, codeBlockMap);
        this.parseFormatting(text, tokens, 'bold', this.patterns.bold, context, codeBlockMap);
        this.parseFormatting(text, tokens, 'italic', this.patterns.italic, context, codeBlockMap);
        this.parseFormatting(text, tokens, 'strikethrough', this.patterns.strikethrough, context, codeBlockMap);

        // Sort tokens by start position
        tokens.sort((a, b) => a.start - b.start);

        // Build final nodes array
        let lastEnd = 0;
        for (const token of tokens) {
            // Add text before this token
            if (token.start > lastEnd) {
                nodes.push({
                    type: 'text',
                    content: text.substring(lastEnd, token.start)
                });
            }

            nodes.push(token.node);
            lastEnd = token.end;
        }

        // Add remaining text
        if (lastEnd < text.length) {
            nodes.push({
                type: 'text',
                content: text.substring(lastEnd)
            });
        }

        return nodes;
    }

    private static parseFormatting(
        text: string,
        tokens: Array<{start: number; end: number; node: ParsedNode}>,
        type: ParsedNode['type'],
        pattern: RegExp,
        context?: ParseContext, // Hozzáadva
        codeBlockMap?: Map<string, string> // Hozzáadva
    ): void {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)) !== null) {
            // Check if this match overlaps with existing tokens
            const overlaps = tokens.some(token =>
                (match!.index >= token.start && match!.index < token.end) ||
                (match!.index + match![0].length > token.start && match!.index + match![0].length <= token.end) ||
                (match!.index <= token.start && match!.index + match![0].length >= token.end)
            );

            if (!overlaps) {
                const content = match[1] || match[2] || ''; // Handle multiple capture groups
                tokens.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    node: {
                        type,
                        content,
                        children: type !== 'code' ? this.parseInline(content, context, codeBlockMap) : undefined // Átadva a context és a map
                    }
                });
            }
        }
    }

    private static mergeTextNodes(nodes: ParsedNode[]): ParsedNode[] {
        const merged: ParsedNode[] = [];

        for (const node of nodes) {
            const last = merged[merged.length - 1];
            if (last && last.type === 'text' && node.type === 'text') {
                last.content += node.content;
            } else {
                merged.push(node);
            }
        }

        return merged;
    }

    // Helper method to extract mentions from text for the message input
    static extractMentions(text: string): { userIds: number[]; roleIds: number[]; hasEveryoneMention: boolean } {
        const userIds = new Set<number>();
        const roleIds = new Set<number>();
        let hasEveryoneMention = false;

        // Extract user mentions
        const userMatches = text.matchAll(/<@(\d+)>/g);
        for (const match of userMatches) {
            userIds.add(parseInt(match[1]));
        }

        // Extract role mentions
        const roleMatches = text.matchAll(/<@&(\d+)>/g);
        for (const match of roleMatches) {
            roleIds.add(parseInt(match[1]));
        }

        // Check for @everyone
        if (/@everyone\b/.test(text)) {
            hasEveryoneMention = true;
        }

        return {
            userIds: Array.from(userIds),
            roleIds: Array.from(roleIds),
            hasEveryoneMention
        };
    }
}