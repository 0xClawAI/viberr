"use client";

import React from "react";

interface SimpleMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer for chat messages.
 * Supports: **bold**, *italic*, - bullet lists, numbered lists, `code`, [links](url)
 */
export function SimpleMarkdown({ content, className = "" }: SimpleMarkdownProps) {
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split("\n");
    const result: React.ReactNode[] = [];
    let listItems: string[] = [];
    let listType: "ul" | "ol" | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        result.push(
          <ListTag key={`list-${result.length}`} className={listType === "ul" ? "list-disc ml-4 space-y-1" : "list-decimal ml-4 space-y-1"}>
            {listItems.map((item, i) => (
              <li key={i}>{parseInline(item)}</li>
            ))}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };

    lines.forEach((line, idx) => {
      // Check for bullet list
      const bulletMatch = line.match(/^[-*]\s+(.+)$/);
      if (bulletMatch) {
        if (listType !== "ul") {
          flushList();
          listType = "ul";
        }
        listItems.push(bulletMatch[1]);
        return;
      }

      // Check for numbered list
      const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numberedMatch) {
        if (listType !== "ol") {
          flushList();
          listType = "ol";
        }
        listItems.push(numberedMatch[1]);
        return;
      }

      // Not a list item - flush any pending list
      flushList();

      // Empty line
      if (!line.trim()) {
        result.push(<br key={`br-${idx}`} />);
        return;
      }

      // Regular paragraph
      result.push(
        <p key={`p-${idx}`} className="mb-1 last:mb-0">
          {parseInline(line)}
        </p>
      );
    });

    // Flush any remaining list
    flushList();

    return result;
  };

  const parseInline = (text: string): React.ReactNode => {
    // Process inline markdown: **bold**, *italic*, `code`, [link](url)
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* (but not **)
      const italicMatch = remaining.match(/^\*([^*]+?)\*/);
      if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code key={key++} className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 text-sm font-mono">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Link: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a 
            key={key++} 
            href={linkMatch[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Emoji shortcodes don't need special handling - they render as-is

      // No match - take next character
      const nextSpecial = remaining.search(/[*`\[]/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        // Special char but no pattern match - treat as literal
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  return <div className={className}>{parseMarkdown(content)}</div>;
}
