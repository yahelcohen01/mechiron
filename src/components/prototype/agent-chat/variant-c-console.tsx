'use client';

// PROTOTYPE — Variant C: "Command bar". Action-first, history second.
// The input sits at the TOP. The current turn gets the whole panel as one big
// focused card. Earlier turns collapse into a thin history strip at the bottom.
// A pending approval takes over the panel entirely — you cannot scroll past a
// decision, which is the opposite of how A and B treat it.

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import type { VariantProps } from './types';

export const variantName = 'Command bar';

export function VariantCConsole({ chat, onClose }: VariantProps) {
  const locale = useLocale();
  const he = locale === 'he';
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const t = he
    ? {
        title: 'פקודה',
        placeholder: 'מה לעשות?',
        hint: 'צור RFQ לתושבת של אלביט, 500 יחידות, ציפוי וחומר גלם',
        hintLabel: 'נסה',
        approve: 'אשר',
        deny: 'בטל',
        approved: 'אושר',
        denied: 'בוטל',
        confirm: 'נדרש אישור לפני ביצוע',
        working: 'עובד…',
        history: 'היסטוריה',
        empty: 'אין עדיין פעולות',
      }
    : {
        title: 'Command',
        placeholder: 'What should I do?',
        hint: 'Create an RFQ for the Elbit bracket, 500 units, coating and raw material',
        hintLabel: 'Try',
        approve: 'Approve',
        deny: 'Cancel',
        approved: 'Approved',
        denied: 'Cancelled',
        confirm: 'Confirm before this runs',
        working: 'Working…',
        history: 'History',
        empty: 'Nothing yet',
      };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const agentTurns = chat.messages.filter((m) => m.role === 'agent');
  const current = agentTurns.at(-1);
  const older = chat.messages.slice(0, chat.messages.length - (current ? 2 : 0));
  const pendingApproval = current?.parts.find(
    (p) => p.type === 'approval' && p.status === 'pending',
  );
  const lastUser = chat.messages.filter((m) => m.role === 'user').at(-1);

  return (
    <div className="flex h-full flex-col bg-gray-100 dark:bg-gray-900">
      {/* Command bar — pinned to the top, always the first thing you see */}
      <div className="shrink-0 bg-white dark:bg-gray-950 px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {t.title}
          </span>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            chat.send(draft);
            setDraft('');
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.placeholder}
            disabled={chat.isStreaming || chat.isWaiting}
            className="w-full rounded-xl border-2 border-gray-900 dark:border-gray-100 bg-transparent px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:border-blue-600 disabled:opacity-40 disabled:border-gray-300"
          />
        </form>
        {chat.messages.length === 0 && (
          <button
            onClick={() => chat.send(t.hint)}
            className="mt-2 w-full rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2 text-start text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="font-semibold text-gray-400 dark:text-gray-600">{t.hintLabel} · </span>
            {t.hint}
          </button>
        )}
      </div>

      {/* Current turn — one big card */}
      <div className="flex-1 overflow-y-auto p-4">
        {!current && (
          <p className="pt-16 text-center text-sm text-gray-400 dark:text-gray-600">{t.empty}</p>
        )}

        {current && (
          <div className="rounded-2xl bg-white dark:bg-gray-950 p-5 shadow-sm">
            {lastUser && (
              <p className="mb-4 border-s-2 border-blue-500 ps-3 text-xs text-gray-500 dark:text-gray-400">
                {lastUser.parts.map((p) => (p.type === 'text' ? p.text : null))}
              </p>
            )}

            {current.parts.map((p) => {
              if (p.type === 'text')
                return (
                  <p
                    key={p.id}
                    className="mb-3 text-[15px] leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap"
                  >
                    {p.text}
                  </p>
                );

              if (p.type === 'tool')
                return (
                  <div
                    key={p.id}
                    className="mb-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600"
                  >
                    {p.status === 'running' ? (
                      <span className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
                    ) : (
                      <span className="text-green-600">✓</span>
                    )}
                    <span className="font-mono">{p.name}</span>
                  </div>
                );

              if (p.status !== 'pending')
                return (
                  <div
                    key={p.id}
                    className={`mb-3 inline-block rounded-md px-2 py-1 text-[11px] font-semibold ${
                      p.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                    }`}
                  >
                    {p.status === 'approved' ? t.approved : t.denied} · {p.toolName}
                  </div>
                );

              return null; // pending approval renders in the takeover below
            })}

            {chat.isStreaming && (
              <span className="inline-block h-4 w-1.5 animate-pulse bg-gray-900 dark:bg-gray-100 align-middle" />
            )}
          </div>
        )}

        {older.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {t.history}
            </div>
            <div className="space-y-1">
              {older
                .filter((m) => m.role === 'user')
                .map((m) => (
                  <div
                    key={m.id}
                    className="truncate rounded-lg bg-white/60 dark:bg-gray-950/60 px-3 py-2 text-xs text-gray-500 dark:text-gray-500"
                  >
                    {m.parts.map((p) => (p.type === 'text' ? p.text : null))}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Approval takeover — you can't scroll past a decision */}
      {pendingApproval?.type === 'approval' && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-gray-900/40 backdrop-blur-[2px]">
          <div className="rounded-t-3xl bg-white dark:bg-gray-950 p-6 shadow-2xl">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500">
              {t.confirm}
            </div>
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">
              {pendingApproval.summary}
            </h3>
            <dl className="mb-5 space-y-2 border-y border-gray-100 dark:border-gray-800 py-4">
              {pendingApproval.lines.map((line) => (
                <dd key={line} className="text-sm text-gray-700 dark:text-gray-300">
                  {line}
                </dd>
              ))}
            </dl>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => chat.answerApproval(pendingApproval.id, true)}
                className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700 transition-colors"
              >
                {t.approve}
              </button>
              <button
                onClick={() => chat.answerApproval(pendingApproval.id, false)}
                className="w-full rounded-xl py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                {t.deny}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
