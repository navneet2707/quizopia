import { useMemo } from 'react';

interface QuestionContentProps {
  text: string;
  className?: string;
  inline?: boolean;
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'inline-code'; value: string }
  | { type: 'code-block'; value: string; lang?: string };

/**
 * Parses a string and splits it into text / inline `code` / fenced ```code``` segments.
 * Supports markdown-style fences with optional language hint.
 */
function parseSegments(input: string): Segment[] {
  if (!input) return [];
  const segments: Segment[] = [];
  // Match ```lang\n...``` (multi-line) OR `inline`
  const regex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```|`([^`\n]+)`/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(input)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, m.index) });
    }
    if (m[3] !== undefined) {
      segments.push({ type: 'inline-code', value: m[3] });
    } else {
      segments.push({ type: 'code-block', value: m[2].replace(/\n$/, ''), lang: m[1] || undefined });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) });
  }
  return segments;
}

const QuestionContent = ({ text, className, inline }: QuestionContentProps) => {
  const segments = useMemo(() => parseSegments(text || ''), [text]);

  if (segments.length === 0) return null;

  // For options (inline contexts), render code blocks inline-ish too
  return (
    <div className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {seg.value}
            </span>
          );
        }
        if (seg.type === 'inline-code') {
          return (
            <code
              key={i}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
            >
              {seg.value}
            </code>
          );
        }
        // code-block
        if (inline) {
          return (
            <code
              key={i}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
            >
              {seg.value}
            </code>
          );
        }
        return (
          <pre
            key={i}
            className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-sm leading-relaxed text-foreground"
          >
            {seg.lang && (
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                {seg.lang}
              </div>
            )}
            <code>{seg.value}</code>
          </pre>
        );
      })}
    </div>
  );
};

export default QuestionContent;
