'use client';

// PROTOTYPE — Variant A: "Bubbles". The familiar messenger shape.
// Conversation is the primary object; the agent's machinery (tool calls) is
// tucked into small pills so it doesn't compete with the words.

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import type { Part, VariantProps } from './types';

export const variantName = 'Bubbles';

function ToolPill({ part }: { part: Extract<Part, { type: 'tool' }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        {part.status === 'running' ? (
          <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
        <span className="font-mono">{part.name}</span>
      </button>
      {open && part.output && (
        <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg bg-gray-900 dark:bg-black p-3 text-[11px] leading-relaxed text-gray-300 ltr:text-left rtl:text-left" dir="ltr">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ApprovalCard({
  part,
  onAnswer,
  t,
}: {
  part: Extract<Part, { type: 'approval' }>;
  onAnswer: (approved: boolean) => void;
  t: { approve: string; deny: string; approved: string; denied: string; needsApproval: string };
}) {
  return (
    <div className="my-2 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-500">
          {t.needsApproval}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{part.summary}</p>
      <ul className="space-y-1 mb-3">
        {part.lines.map((line) => (
          <li key={line} className="text-xs text-gray-600 dark:text-gray-400">
            {line}
          </li>
        ))}
      </ul>
      {part.status === 'pending' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onAnswer(true)}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {t.approve}
          </button>
          <button
            onClick={() => onAnswer(false)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t.deny}
          </button>
        </div>
      ) : (
        <p className={`text-xs font-medium ${part.status === 'approved' ? 'text-green-700 dark:text-green-500' : 'text-gray-500'}`}>
          {part.status === 'approved' ? t.approved : t.denied}
        </p>
      )}
    </div>
  );
}

export function VariantABubbles({ chat, onClose }: VariantProps) {
  const locale = useLocale();
  const he = locale === 'he';
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const t = he
    ? {
        title: 'מחירון AI',
        placeholder: 'שאל משהו…',
        empty: 'נסה: "צור הצעת מחיר לתושבת של אלביט, 500 יחידות, ציפוי וחומר גלם"',
        approve: 'אישור',
        deny: 'ביטול',
        approved: '✓ אושר',
        denied: '✕ בוטל',
        needsApproval: 'דורש אישור',
      }
    : {
        title: 'Mechiron AI',
        placeholder: 'Ask something…',
        empty: 'Try: "Create an RFQ for the Elbit bracket, 500 units, coating and raw material"',
        approve: 'Approve',
        deny: 'Deny',
        approved: '✓ Approved',
        denied: '✕ Denied',
        needsApproval: 'Needs approval',
      };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {chat.messages.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center px-6 pt-10 leading-relaxed">
            {t.empty}
          </p>
        )}

        {chat.messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-ee-md bg-blue-600 px-4 py-2.5 text-sm text-white">
                {m.parts.map((p) => (p.type === 'text' ? p.text : null))}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-es-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3">
                {m.parts.map((p) => {
                  if (p.type === 'text')
                    return (
                      <p key={p.id} className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {p.text}
                      </p>
                    );
                  if (p.type === 'tool') return <ToolPill key={p.id} part={p} />;
                  return (
                    <ApprovalCard
                      key={p.id}
                      part={p}
                      t={t}
                      onAnswer={(ok) => chat.answerApproval(p.id, ok)}
                    />
                  );
                })}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          chat.send(draft);
          setDraft('');
        }}
        className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shrink-0"
      >
        <div className="flex items-end gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.placeholder}
            disabled={chat.isStreaming || chat.isWaiting}
            className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={chat.isStreaming || chat.isWaiting || !draft.trim()}
            className="rounded-full bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            aria-label="send"
          >
            <svg className="w-5 h-5 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
