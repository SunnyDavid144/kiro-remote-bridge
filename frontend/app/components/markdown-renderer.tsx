"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useCallback, useRef, useState } from "react";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--accent)] animate-pulse-dot rounded-sm align-middle" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Markdown Components — Console/Hardware Aesthetic
// ---------------------------------------------------------------------------

const markdownComponents: Components = {
  // Code blocks with copy button and language badge
  pre({ children }) {
    return (
      <div className="group relative my-3 rounded-lg overflow-hidden border border-[var(--border-dim)] bg-[#08080e]">
        {children}
      </div>
    );
  },

  code({ className, children, ...props }) {
    const isInline = !className;
    const language = className?.replace("hljs language-", "").replace("language-", "") || "";

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-dim)] text-[var(--accent)] text-[12px] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="relative">
        {language && (
          <div className="absolute top-0 right-0 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-tertiary)] rounded-bl border-b border-l border-[var(--border-dim)]">
            {language}
          </div>
        )}
        <CopyButton content={String(children)} />
        <code
          className={`${className || ""} block overflow-x-auto p-3 text-[12px] leading-relaxed font-mono`}
          {...props}
        >
          {children}
        </code>
      </div>
    );
  },

  // Headings
  h1({ children }) {
    return (
      <h1 className="text-base font-bold mt-4 mb-2 text-[var(--text-primary)] border-b border-[var(--border-dim)] pb-1">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-sm font-bold mt-3 mb-1.5 text-[var(--text-primary)]">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-sm font-semibold mt-2 mb-1 text-[var(--text-primary)]">
        {children}
      </h3>
    );
  },

  // Paragraphs
  p({ children }) {
    return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
  },

  // Lists
  ul({ children }) {
    return <ul className="text-sm pl-4 mb-2 space-y-0.5 list-disc list-outside marker:text-[var(--accent)]">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="text-sm pl-4 mb-2 space-y-0.5 list-decimal list-outside marker:text-[var(--text-muted)]">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },

  // Blockquote
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-[var(--accent)] pl-3 my-2 text-[var(--text-secondary)] italic text-sm">
        {children}
      </blockquote>
    );
  },

  // Tables
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2 rounded border border-[var(--border-dim)]">
        <table className="w-full text-[12px]">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{children}</thead>;
  },
  th({ children }) {
    return <th className="px-2 py-1.5 text-left font-semibold border-b border-[var(--border-dim)]">{children}</th>;
  },
  td({ children }) {
    return <td className="px-2 py-1.5 border-b border-[var(--border-dim)]">{children}</td>;
  },

  // Horizontal rule
  hr() {
    return <hr className="my-3 border-[var(--border-dim)]" />;
  },

  // Links
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 hover:decoration-[var(--accent)]"
      >
        {children}
      </a>
    );
  },

  // Strong / emphasis
  strong({ children }) {
    return <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic text-[var(--text-secondary)]">{children}</em>;
  },
};

// ---------------------------------------------------------------------------
// Copy Button Component
// ---------------------------------------------------------------------------

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content.trim());
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-[var(--bg-tertiary)] border border-[var(--border-dim)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]"
      aria-label="Copy code"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
