'use client';

// PROTOTYPE — throwaway. Wraps the dashboard so the whole app shell slides
// aside when the agent panel opens.
//
// Direction: the panel always occupies the logical END side.
//   Hebrew (RTL) → panel enters from the LEFT, content pushed RIGHT.
//   English (LTR) → panel enters from the RIGHT, content pushed LEFT.
//
// Three variants live behind ?agent=A|B|C. Switch with the floating bar or ←/→.

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n/locale-context';
import { useEveChat } from './use-eve-chat';
import { useFakeAgentStream } from './use-fake-agent-stream';
import { VariantABubbles, variantName as nameA } from './variant-a-bubbles';
import { VariantBTranscript, variantName as nameB } from './variant-b-transcript';
import { VariantCConsole, variantName as nameC } from './variant-c-console';
import type { VariantProps } from './types';

const VARIANTS: Record<string, { name: string; Component: (p: VariantProps) => React.ReactNode }> = {
  A: { name: nameA, Component: VariantABubbles },
  B: { name: nameB, Component: VariantBTranscript },
  C: { name: nameC, Component: VariantCConsole },
};
const KEYS = Object.keys(VARIANTS);

const PANEL_WIDTH = 420;

export function AgentChatShellPROTOTYPE({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const isRtl = locale === 'he';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Live by default; ?mock=1 falls back to the scripted stream so the layout is
  // still judgeable with the agent down or no credential configured. Both hooks
  // always run — the URL param only decides which controller the variants get.
  const mock = searchParams.get('mock') === '1';
  const live = useEveChat();
  const fake = useFakeAgentStream(locale);
  const chat = mock ? fake : live;

  const [open, setOpen] = useState(false);
  const variantKey = KEYS.includes(searchParams.get('agent') ?? '')
    ? (searchParams.get('agent') as string)
    : 'A';
  const { name, Component } = VARIANTS[variantKey];

  const setVariant = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('agent', key);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const cycle = useCallback(
    (delta: number) => {
      const i = KEYS.indexOf(variantKey);
      setVariant(KEYS[(i + delta + KEYS.length) % KEYS.length]);
    },
    [setVariant, variantKey],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);

      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (typing) return;
      if (e.key === 'ArrowLeft') cycle(isRtl ? 1 : -1);
      if (e.key === 'ArrowRight') cycle(isRtl ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycle, isRtl, open]);

  // Narrow viewports can't spare 420px, so there the panel overlays instead of
  // reflowing the shell.
  const [overlay, setOverlay] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PANEL_WIDTH * 2}px)`);
    const sync = () => setOverlay(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Reserve the panel's width on the shell's end side so the page *reflows*
  // into what's left, rather than sliding out of the viewport.
  const reserved = open && !overlay ? PANEL_WIDTH : 0;

  return (
    <div className="relative">
      <div
        className="motion-reduce:transition-none"
        style={{
          paddingInlineEnd: reserved,
          transition: 'padding-inline-end 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {children}
      </div>

      {/* The panel sits just outside the viewport on the end side and is
          revealed by the shell moving, not by moving itself. */}
      <aside
        className="fixed top-0 bottom-0 z-40 overflow-hidden border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{
          width: PANEL_WIDTH,
          insetInlineEnd: -PANEL_WIDTH,
          borderInlineStartWidth: 1,
          transform: open
            ? `translateX(${isRtl ? PANEL_WIDTH : -PANEL_WIDTH}px)`
            : 'translateX(0)',
        }}
        aria-hidden={!open}
      >
        <div className="relative h-full">
          <Component chat={chat} onClose={() => setOpen(false)} />
        </div>
      </aside>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 z-30 flex items-center gap-2 rounded-full bg-gray-900 dark:bg-gray-100 px-4 py-3 text-sm font-medium text-white dark:text-gray-900 shadow-lg hover:scale-105 transition-transform"
          style={{ insetInlineEnd: 24 }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {isRtl ? 'עוזר' : 'Assistant'}
          <kbd className="rounded bg-white/20 dark:bg-black/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
      )}

      {process.env.NODE_ENV !== 'production' && (
        <div
          dir="ltr"
          className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-gray-900 px-2 py-1.5 text-white shadow-2xl"
        >
          <button
            onClick={() => cycle(-1)}
            className="rounded-full px-2 py-1 text-sm hover:bg-white/10 transition-colors"
            aria-label="previous variant"
          >
            ←
          </button>
          <span className="px-2 font-mono text-xs whitespace-nowrap">
            {variantKey} — {name}
          </span>
          <button
            onClick={() => cycle(1)}
            className="rounded-full px-2 py-1 text-sm hover:bg-white/10 transition-colors"
            aria-label="next variant"
          >
            →
          </button>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams.toString());
              if (mock) next.delete('mock');
              else next.set('mock', '1');
              router.replace(`${pathname}?${next.toString()}`, { scroll: false });
            }}
            className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
              mock
                ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                : 'text-green-400 hover:bg-white/10'
            }`}
            title={mock ? 'scripted mock — click for the real agent' : 'live eve agent'}
          >
            {mock ? 'mock' : 'live'}
          </button>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button
            onClick={() => {
              chat.reset();
              setOpen(true);
            }}
            className="rounded-full px-2 py-1 text-[10px] uppercase tracking-wider text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            reset
          </button>
        </div>
      )}
    </div>
  );
}
