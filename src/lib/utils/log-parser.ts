export interface ParsedLogSegment {
  type:
    | 'text'
    | 'error'
    | 'warning'
    | 'success'
    | 'command'
    | 'path'
    | 'url'
    | 'number'
    | 'time'
    | 'keyword';
  content: string;
  className?: string;
}

export interface ParsedLog {
  segments: ParsedLogSegment[];
  originalMessage: string;
  cleanedMessage: string;
}

export class LogParser {
  private static ansiRegex = /\u001b\[[0-9;]*m/g; // eslint-disable-line no-control-regex

  private static timestampPatterns = [
    /\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?/g,
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g,
    /^\d{1,2}:\d{2}:\d{2}(\.\d+)?\s*/g,
    /\[\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?\]/g
  ];

  static cleanMessage(message: string): string {
    if (!message) return '';

    let cleaned = String(message);

    // Remove ANSI codes
    cleaned = cleaned.replace(this.ansiRegex, '');

    // Remove timestamps
    this.timestampPatterns.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, '');
    });

    return cleaned.trim();
  }

  static parseMessage(message: string, searchQuery?: string): ParsedLog {
    const originalMessage = message || '';
    const cleanedMessage = this.cleanMessage(originalMessage);
    const segments: ParsedLogSegment[] = [];

    if (!cleanedMessage) {
      return { segments: [], originalMessage, cleanedMessage };
    }

    // Parse the cleaned message into segments
    const _remaining = cleanedMessage;
    const _lastIndex = 0;

    const patterns: Array<{
      regex: RegExp;
      type: ParsedLogSegment['type'];
      className?: string;
    }> = [
      // Error patterns
      {
        regex: /(ERROR|FAILED|Failed|error)/gi,
        type: 'error',
        className: 'text-red-400 font-bold bg-red-900/30 px-1 rounded'
      },
      // Warning patterns
      {
        regex: /(WARNING|WARN|Warning)/gi,
        type: 'warning',
        className: 'text-yellow-400 font-bold bg-yellow-900/30 px-1 rounded'
      },
      // Success patterns
      {
        regex: /(SUCCESS|SUCCEEDED|Succeeded|success|completed?|done|finished)/gi,
        type: 'success',
        className: 'text-green-400 font-bold'
      },
      // Command patterns
      {
        regex: /\b(npm|yarn|pnpm|node|git|docker|kubectl)\s+([a-z-]+)/gi,
        type: 'command',
        className: 'text-purple-400'
      },
      // File paths
      {
        regex: /((?:\/|\.\/|\.\.\/)[a-zA-Z0-9_\-.]+(?:\/[a-zA-Z0-9_\-.]+)*(?:\.[a-zA-Z0-9]+)?)/g,
        type: 'path',
        className: 'text-cyan-400'
      },
      // URLs
      {
        regex: /(https?:\/\/[^\s<>]+)/g,
        type: 'url',
        className: 'text-blue-400 underline'
      },
      // Numbers with units
      {
        regex: /(\d+(?:\.\d+)?)\s*(ms|s|sec|seconds?|minutes?|hours?|%)/gi,
        type: 'time',
        className: 'text-orange-300'
      },
      // Phase transitions
      {
        regex: /(Phase complete:|Entering phase)/g,
        type: 'keyword',
        className: 'text-blue-400'
      }
    ];

    // Process search query highlighting first if present
    if (searchQuery?.trim()) {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(`(${escapedQuery})`, 'gi');
      let match;
      const searchMatches: Array<{ start: number; end: number }> = [];

      while ((match = searchRegex.exec(cleanedMessage)) !== null) {
        searchMatches.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }

      // Store search matches for later highlighting
      if (searchMatches.length > 0) {
        let currentIndex = 0;

        searchMatches.forEach(({ start, end }) => {
          if (currentIndex < start) {
            segments.push({
              type: 'text',
              content: cleanedMessage.slice(currentIndex, start)
            });
          }

          segments.push({
            type: 'keyword',
            content: cleanedMessage.slice(start, end),
            className: 'bg-yellow-300 text-black px-0.5 rounded'
          });

          currentIndex = end;
        });

        if (currentIndex < cleanedMessage.length) {
          segments.push({
            type: 'text',
            content: cleanedMessage.slice(currentIndex)
          });
        }

        return { segments, originalMessage, cleanedMessage };
      }
    }

    // Apply pattern-based parsing
    const allMatches: Array<{
      start: number;
      end: number;
      type: ParsedLogSegment['type'];
      content: string;
      className?: string;
    }> = [];

    patterns.forEach(({ regex, type, className }) => {
      let match;
      const localRegex = new RegExp(regex.source, regex.flags);

      while ((match = localRegex.exec(cleanedMessage)) !== null) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type,
          content: match[0],
          className
        });
      }
    });

    // Sort matches by start position
    allMatches.sort((a, b) => a.start - b.start);

    // Build segments avoiding overlaps
    let currentIndex = 0;

    allMatches.forEach((match) => {
      // Add text before this match
      if (currentIndex < match.start) {
        const textContent = cleanedMessage.slice(currentIndex, match.start);
        if (textContent) {
          segments.push({
            type: 'text',
            content: textContent
          });
        }
      }

      // Add the match if it doesn't overlap with processed content
      if (currentIndex <= match.start) {
        segments.push({
          type: match.type,
          content: match.content,
          className: match.className
        });
        currentIndex = match.end;
      }
    });

    // Add remaining text
    if (currentIndex < cleanedMessage.length) {
      segments.push({
        type: 'text',
        content: cleanedMessage.slice(currentIndex)
      });
    }

    // If no segments were created, return the whole message as text
    if (segments.length === 0) {
      segments.push({
        type: 'text',
        content: cleanedMessage
      });
    }

    return { segments, originalMessage, cleanedMessage };
  }
}
