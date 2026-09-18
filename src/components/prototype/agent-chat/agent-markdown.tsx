'use client';

// PROTOTYPE — remove with the rest of src/components/prototype/agent-chat/.
//
// Renders an agent text part as Markdown. The agent writes `**bold**`, `-`
// lists and the occasional table; before this, all three variants printed that
// as literal asterisks inside a `whitespace-pre-wrap` <p>.
//
// Two constraints shape the styling below:
//
//  1. Tailwind v4's preflight strips heading/list defaults and this project has
//     no @tailwindcss/typography, so every element is styled explicitly here
//     rather than inherited from a `prose` class.
//  2. The app is RTL for Hebrew and LTR for English, so spacing uses logical
//     properties (ps-*/ms-*/border-s) and never left/right. Code is the one
//     exception — it is forced LTR because a serial number or a JSON blob
//     reads backwards otherwise.
//
// Font size is deliberately not set at the root: each variant wraps this in its
// own sizing, and the children use `text-[0.95em]`-style relative sizes so they
// track whatever the caller chose.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AgentMarkdownPROTOTYPE({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // `break-words` throughout: supplier emails and long part serials
          // would otherwise push the chat panel wider than its column.
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed break-words">{children}</p>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => (
            <del className="line-through opacity-70">{children}</del>
          ),

          // `ps-5` not `pl-5` — the marker sits on the start edge, which flips
          // with direction. list-outside keeps multi-line items aligned.
          ul: ({ children }) => (
            <ul className="mb-2 last:mb-0 ps-5 list-disc list-outside space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 last:mb-0 ps-5 list-decimal list-outside space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed break-words">{children}</li>,

          h1: ({ children }) => (
            <h1 className="mt-3 first:mt-0 mb-1.5 text-[1.15em] font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 first:mt-0 mb-1.5 text-[1.1em] font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2.5 first:mt-0 mb-1 text-[1.05em] font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </h3>
          ),

          // Inline code and fenced blocks arrive through the same `code` slot;
          // react-markdown v10 marks the fenced one by a `language-*` class, and
          // anything multi-line is a block in practice too.
          code: ({ className: codeClassName, children }) => {
            const raw = String(children ?? '');
            const isBlock =
              /language-/.test(codeClassName ?? '') || raw.includes('\n');

            if (!isBlock) {
              return (
                <code
                  dir="ltr"
                  className="inline-block rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[0.9em] font-mono text-gray-800 dark:text-gray-200 break-all"
                >
                  {children}
                </code>
              );
            }

            return (
              <code
                dir="ltr"
                className="block overflow-x-auto rounded-lg bg-gray-900 dark:bg-black p-3 text-[0.85em] font-mono leading-relaxed text-gray-200 text-left"
              >
                {raw.replace(/\n$/, '')}
              </code>
            );
          },
          // The <pre> wrapper would double the code block's padding/background.
          pre: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              // noreferrer as well as noopener: agent output is model-written,
              // so don't leak this app's URL to whatever it linked to.
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 break-all"
            >
              {children}
            </a>
          ),

          blockquote: ({ children }) => (
            <blockquote className="mb-2 last:mb-0 border-s-2 border-gray-300 dark:border-gray-600 ps-3 text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),

          hr: () => (
            <hr className="my-3 border-gray-200 dark:border-gray-700" />
          ),

          // Tables come from remark-gfm. The wrapper scrolls rather than letting
          // a wide table stretch the panel.
          table: ({ children }) => (
            <div className="mb-2 last:mb-0 overflow-x-auto">
              <table className="w-full border-collapse text-[0.9em]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-gray-300 dark:border-gray-600">
              {children}
            </thead>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-200 dark:border-gray-800 last:border-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 text-start font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 text-start align-top">{children}</td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
