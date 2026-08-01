'use client';

// PROTOTYPE — Variant B: "Work log". Deliberately NOT a chat.
// No bubbles, no alignment games. A single flat timeline down a gutter rail,
// where a tool call is as much a first-class event as a sentence. Tool I/O is
// visible by default. Reads like a build log or an audit trail — which is what
// a procurement action actually is.

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import type { VariantProps } from './types';

export const variantName = 'Work log';

function Row({
  marker,
  label,
  children,
  tone = 'default',
}: {
  marker: React.ReactNode;
  label: string;
  children: React.ReactNode;
  tone?: 'default' | 'user' | 'warn';
}) {
  const labelTone = {
    default: 'text-gray-400 dark:text-gray-600',
    user: 'text-blue-600 dark:text-blue-400',
    warn: 'text-amber-600 dark:text-amber-500',
  }[tone];

  return (
    <div className="relative ps-8 pb-5">
      {/* gutter rail */}
      <span className="absolute inset-s-[9px] top-5 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />
      <span className="absolute inset-s-0 top-1 flex h-4 w-[19px] items-center justify-center">
        {marker}
      </span>
      <div className={`mb-1 font-mono text-[10px] uppercase tracking-widest ${labelTone}`}>
        {label}
      </div>
      {children}
    </div>
  );
}

export function VariantBTranscript({ chat, onClose }: VariantProps) {
  const locale = useLocale();
  const he = locale === 'he';
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const t = he
    ? {
        title: 'יומן עבודה',
        subtitle: 'כל פעולה מתועדת',
        placeholder: 'הוראה…',
        empty: 'נסה: "צור RFQ לתושבת של אלביט, 500 יחידות, ציפוי וחומר גלם"',
        you: 'אתה',
        agent: 'סוכן',
        tool: 'כלי',
        gate: 'שער אישור',
        approve: 'אשר והרץ',
        deny: 'דחה',
        approved: 'אושר · הכלי רץ',
        denied: 'נדחה · לא בוצע דבר',
        running: 'רץ…',
        send: 'שלח',
      }
    : {
        title: 'Work log',
        subtitle: 'every action recorded',
        placeholder: 'Instruction…',
        empty: 'Try: "Create an RFQ for the Elbit bracket, 500 units, coating and raw material"',
        you: 'you',
        agent: 'agent',
        tool: 'tool',
        gate: 'approval gate',
        approve: 'Approve & run',
        deny: 'Reject',
        approved: 'approved · tool ran',
        denied: 'rejected · nothing happened',
        running: 'running…',
        send: 'Send',
      };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-950">
      <header className="flex items-baseline justify-between border-b-2 border-gray-900 dark:border-gray-100 px-5 py-3 shrink-0">
        <div>
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-gray-100">
            {t.title}
          </h2>
          <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{t.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-xs text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          [esc]
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {chat.messages.length === 0 && (
          <p className="font-mono text-xs text-gray-400 dark:text-gray-600 leading-relaxed">
            {t.empty}
          </p>
        )}

        {chat.messages.map((m) =>
          m.role === 'user' ? (
            <Row
              key={m.id}
              tone="user"
              label={t.you}
              marker={<span className="h-2 w-2 rounded-full bg-blue-500" />}
            >
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {m.parts.map((p) => (p.type === 'text' ? p.text : null))}
              </p>
            </Row>
          ) : (
            <div key={m.id}>
              {m.parts.map((p) => {
                if (p.type === 'text')
                  return (
                    <Row
                      key={p.id}
                      label={t.agent}
                      marker={<span className="h-2 w-2 rounded-full bg-gray-400" />}
                    >
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {p.text}
                      </p>
                    </Row>
                  );

                if (p.type === 'tool')
                  return (
                    <Row
                      key={p.id}
                      label={t.tool}
                      marker={
                        p.status === 'running' ? (
                          <span className="h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                        ) : (
                          <span className="font-mono text-[11px] text-green-600">▸</span>
                        )
                      }
                    >
                      <div className="font-mono text-xs text-gray-900 dark:text-gray-100" dir="ltr">
                        {p.name}({JSON.stringify(p.input)})
                      </div>
                      {p.status === 'running' ? (
                        <div className="mt-1 font-mono text-[11px] text-gray-400">{t.running}</div>
                      ) : (
                        <pre
                          dir="ltr"
                          className="mt-1.5 max-h-40 overflow-auto border-s-2 border-gray-200 dark:border-gray-800 ps-3 font-mono text-[11px] leading-relaxed text-gray-500 dark:text-gray-500 text-left"
                        >
                          {JSON.stringify(p.output, null, 2)}
                        </pre>
                      )}
                    </Row>
                  );

                return (
                  <Row
                    key={p.id}
                    tone="warn"
                    label={t.gate}
                    marker={<span className="font-mono text-xs text-amber-500">⏸</span>}
                  >
                    <div className="border-s-4 border-amber-400 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/20 ps-4 pe-3 py-3">
                      <div className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {p.toolName}
                      </div>
                      <dl className="space-y-0.5 mb-3">
                        {p.lines.map((line) => (
                          <dd key={line} className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                            {line}
                          </dd>
                        ))}
                      </dl>
                      {p.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => chat.answerApproval(p.id, true)}
                            className="bg-gray-900 dark:bg-gray-100 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white dark:text-gray-900 hover:opacity-80 transition-opacity"
                          >
                            {t.approve}
                          </button>
                          <button
                            onClick={() => chat.answerApproval(p.id, false)}
                            className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            {t.deny}
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`font-mono text-[11px] uppercase tracking-wider ${p.status === 'approved' ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {p.status === 'approved' ? t.approved : t.denied}
                        </div>
                      )}
                    </div>
                  </Row>
                );
              })}
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
        className="border-t border-gray-200 dark:border-gray-800 p-3 shrink-0 flex gap-2"
      >
        <span className="self-center font-mono text-sm text-gray-400">›</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          disabled={chat.isStreaming || chat.isWaiting}
          className="flex-1 bg-transparent font-mono text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={chat.isStreaming || chat.isWaiting || !draft.trim()}
          className="font-mono text-[11px] uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 transition-colors"
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}
