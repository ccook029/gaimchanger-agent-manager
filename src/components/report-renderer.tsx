'use client';

import React from 'react';

interface ReportRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown-like report content with styled sections.
 */
export function ReportRenderer({ content, className = '' }: ReportRendererProps) {
  const lines = content.split('\n');

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="text-sm font-semibold text-white mt-4 mb-1">
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="text-base font-bold text-white mt-6 mb-2 border-b border-neutral-800 pb-1">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="text-lg font-bold text-white mt-4 mb-3">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }

        // Critical alerts
        if (trimmed.includes('🔴') || trimmed.includes('🚨')) {
          return (
            <div key={i} className="bg-red-950/50 border-l-3 border-red-500 px-3 py-2 text-red-200 rounded-r">
              {trimmed}
            </div>
          );
        }

        // Warning alerts
        if (trimmed.includes('🟡')) {
          return (
            <div key={i} className="bg-amber-950/50 border-l-3 border-amber-500 px-3 py-2 text-amber-200 rounded-r">
              {trimmed}
            </div>
          );
        }

        // Info alerts
        if (trimmed.includes('ℹ️') || trimmed.includes('🟢')) {
          return (
            <div key={i} className="bg-blue-950/50 border-l-3 border-blue-500 px-3 py-2 text-blue-200 rounded-r">
              {trimmed}
            </div>
          );
        }

        // Table rows
        if (trimmed.startsWith('|')) {
          if (trimmed.includes('---')) return null; // separator
          const cells = trimmed.split('|').filter(Boolean).map((c) => c.trim());
          const isHeader = i > 0 && lines[i + 1]?.includes('---');
          return (
            <div key={i} className={`grid gap-2 px-2 py-1 text-xs ${isHeader ? 'font-semibold text-neutral-300 border-b border-neutral-700' : 'text-neutral-400'}`}
              style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
              {cells.map((cell, j) => (
                <span key={j}>{cell}</span>
              ))}
            </div>
          );
        }

        // Bold text
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return (
            <p key={i} className="font-semibold text-neutral-200">
              {trimmed.replace(/\*\*/g, '')}
            </p>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 text-neutral-400 pl-2">
              <span className="text-green-500 shrink-0">-</span>
              <span>{formatInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Default paragraph
        return (
          <p key={i} className="text-neutral-400">
            {formatInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Simple bold handling
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-neutral-200">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
