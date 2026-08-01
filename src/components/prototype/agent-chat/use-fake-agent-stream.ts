'use client';

// PROTOTYPE — throwaway. Scripted stand-in for the eve agent in
// prototypes/mechiron-agent-prototype. No network, no model, no DB.
// It replays one canned run so all three UI variants can be judged against the
// same content: streamed text, tool calls, and a human approval gate.

import { useCallback, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import type { ApprovalPart, ChatController, Message, Part } from './types';

type Step =
  | { t: 'text'; value: string }
  | {
      t: 'tool';
      name: string;
      input: Record<string, unknown>;
      output: Record<string, unknown>;
      ms?: number;
    }
  | {
      t: 'approval';
      toolName: string;
      summary: string;
      lines: string[];
      /** What runs once approved. */
      then: { output: Record<string, unknown>; text: string };
      /** What the agent says if denied. */
      denied: string;
    };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let counter = 0;
const uid = () => `p${++counter}`;

const SCRIPTS: Record<Locale, Step[]> = {
  he: [
    { t: 'text', value: 'מחפש את הלקוח והחלק…' },
    {
      t: 'tool',
      name: 'find_client',
      input: { query: 'אלביט' },
      output: {
        matches: [
          {
            id: 'cl_1',
            name: 'אלביט מערכות',
            parts: [{ id: 'pt_1', serial_number: 'ELB-4471-A', latest_revision: 3 }],
            approved_supplier_ids: ['sp_1', 'sp_3', 'sp_5'],
          },
        ],
      },
      ms: 700,
    },
    {
      t: 'text',
      value:
        'מצאתי את ELB-4471-A (תושבת אלומיניום), רוויזיה 3. ה-RFQ ייווצר ברוויזיה 4 עבור ציפוי וחומר גלם.',
    },
    {
      t: 'approval',
      toolName: 'create_rfq',
      summary: 'יצירת RFQ חדש',
      lines: [
        'חלק · ELB-4471-A (תושבת אלומיניום)',
        'לקוח · אלביט מערכות',
        'רוויזיה · 4 (הקודמת: 3)',
        'כמות · 500 יחידות',
        'תחומים · ציפוי, חומר גלם',
      ],
      then: {
        output: { rfq: { id: 'rfq_101', status: 'draft', revision_number: 4 } },
        text:
          'נוצר RFQ‏ rfq_101 בסטטוס טיוטה.\n\nלציפוי יש שני ספקים מאושרים לאלביט — ציפויים מתקדמים ואנודייז ישראל. רוצה שאשלח לשניהם?',
      },
      denied: 'בוטל. לא נוצר RFQ ולא בוצע שינוי בנתונים.',
    },
  ],
  en: [
    { t: 'text', value: 'Looking up the client and the part…' },
    {
      t: 'tool',
      name: 'find_client',
      input: { query: 'Elbit' },
      output: {
        matches: [
          {
            id: 'cl_1',
            name: 'Elbit Systems',
            parts: [{ id: 'pt_1', serial_number: 'ELB-4471-A', latest_revision: 3 }],
            approved_supplier_ids: ['sp_1', 'sp_3', 'sp_5'],
          },
        ],
      },
      ms: 700,
    },
    {
      t: 'text',
      value:
        'Found ELB-4471-A (aluminium bracket) at revision 3. The RFQ will be created at revision 4 for coating and raw material.',
    },
    {
      t: 'approval',
      toolName: 'create_rfq',
      summary: 'Create a new RFQ',
      lines: [
        'Part · ELB-4471-A (aluminium bracket)',
        'Client · Elbit Systems',
        'Revision · 4 (was 3)',
        'Quantity · 500 units',
        'Domains · coating, raw material',
      ],
      then: {
        output: { rfq: { id: 'rfq_101', status: 'draft', revision_number: 4 } },
        text:
          'Created rfq_101 as a draft.\n\nCoating has two suppliers approved for Elbit — Advanced Coating and Anodize Israel. Want me to send to both?',
      },
      denied: 'Cancelled. No RFQ was created and nothing was written.',
    },
  ],
};

const FOLLOWUP: Record<Locale, Step[]> = {
  he: [
    { t: 'text', value: 'רגע, בודק…' },
    {
      t: 'tool',
      name: 'rfq_status',
      input: {},
      output: { rfqs: [{ id: 'rfq_101', status: 'draft', requests: [] }] },
      ms: 500,
    },
    { t: 'text', value: 'יש RFQ אחד פתוח: rfq_101, טיוטה, בלי פניות שנשלחו עדיין.' },
  ],
  en: [
    { t: 'text', value: 'One moment…' },
    {
      t: 'tool',
      name: 'rfq_status',
      input: {},
      output: { rfqs: [{ id: 'rfq_101', status: 'draft', requests: [] }] },
      ms: 500,
    },
    { t: 'text', value: 'One open RFQ: rfq_101, draft, no requests sent yet.' },
  ],
};

const GREETING: Record<Locale, Step[]> = {
  he: [
    {
      t: 'text',
      value:
        'היי. אני יכול למצוא לקוחות וספקים, ליצור הצעת מחיר ולשלוח פניות לספקים. מה צריך?',
    },
  ],
  en: [
    {
      t: 'text',
      value:
        'Hi. I can look up clients and suppliers, create an RFQ, and send requests to suppliers. What do you need?',
    },
  ],
};

const UNKNOWN: Record<Locale, Step[]> = {
  he: [
    {
      t: 'text',
      value:
        'זה אב-טיפוס — התשובות מוקלטות מראש ואין כאן מודל אמיתי. נסה "היי", "צור הצעת מחיר לתושבת של אלביט, 500 יחידות, ציפוי וחומר גלם", או "מה הסטטוס?".',
    },
  ],
  en: [
    {
      t: 'text',
      value:
        'This is a prototype — the answers are pre-recorded and there is no real model behind it. Try "hi", "create an RFQ for the Elbit bracket, 500 units, coating and raw material", or "what is the status?".',
    },
  ],
};

/**
 * Crude keyword routing so the canned runs at least land on the right prompt.
 * There is no model here — this is a lookup table, not intent detection.
 */
function pickScript(text: string, locale: Locale): Step[] {
  const q = text.trim().toLowerCase();

  // No \b here: Hebrew letters aren't ASCII word chars, so a word boundary
  // never matches after them. Anchor the whole message instead.
  if (
    /^(היי+|הי|שלום|אהלן|מה נשמע|מה קורה|בוקר טוב|ערב טוב|hi+|hey+|hello|yo|good morning)[\s!.,?]*$/.test(
      q,
    )
  )
    return GREETING[locale];

  if (/(הצעת מחיר|הצעה|בקשה|rfq|צור|תיצור|create|new quote)/.test(q))
    return SCRIPTS[locale];

  if (/(סטטוס|מצב|מה קורה|status|open|list)/.test(q)) return FOLLOWUP[locale];

  return UNKNOWN[locale];
}

export function useFakeAgentStream(locale: Locale): ChatController {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  /** Resolves when the person answers the parked approval. */
  const pending = useRef<((approved: boolean) => void) | null>(null);

  const patch = useCallback((msgId: string, fn: (parts: Part[]) => Part[]) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, parts: fn(m.parts) } : m)),
    );
  }, []);

  const streamText = useCallback(
    async (msgId: string, text: string) => {
      const partId = uid();
      patch(msgId, (parts) => [...parts, { type: 'text', id: partId, text: '' }]);
      // Chunk on word boundaries so Hebrew doesn't render mid-word.
      const chunks = text.match(/\S+\s*/g) ?? [text];
      let acc = '';
      for (const chunk of chunks) {
        acc += chunk;
        const snapshot = acc;
        patch(msgId, (parts) =>
          parts.map((p) =>
            p.id === partId && p.type === 'text' ? { ...p, text: snapshot } : p,
          ),
        );
        await sleep(18 + Math.random() * 40);
      }
    },
    [patch],
  );

  const run = useCallback(
    async (steps: Step[]) => {
      const msgId = uid();
      setMessages((prev) => [...prev, { id: msgId, role: 'agent', parts: [] }]);
      setIsStreaming(true);

      for (const step of steps) {
        if (step.t === 'text') {
          await streamText(msgId, step.value);
          continue;
        }

        if (step.t === 'tool') {
          const partId = uid();
          patch(msgId, (parts) => [
            ...parts,
            {
              type: 'tool',
              id: partId,
              name: step.name,
              input: step.input,
              output: null,
              status: 'running',
            },
          ]);
          await sleep(step.ms ?? 600);
          patch(msgId, (parts) =>
            parts.map((p) =>
              p.id === partId && p.type === 'tool'
                ? { ...p, output: step.output, status: 'done' }
                : p,
            ),
          );
          continue;
        }

        // approval — the run parks here until a human answers.
        const partId = uid();
        patch(msgId, (parts) => [
          ...parts,
          {
            type: 'approval',
            id: partId,
            toolName: step.toolName,
            summary: step.summary,
            lines: step.lines,
            status: 'pending',
          } satisfies ApprovalPart,
        ]);
        setIsStreaming(false);
        setIsWaiting(true);

        const approved = await new Promise<boolean>((resolve) => {
          pending.current = resolve;
        });

        pending.current = null;
        setIsWaiting(false);
        setIsStreaming(true);
        patch(msgId, (parts) =>
          parts.map((p) =>
            p.id === partId && p.type === 'approval'
              ? { ...p, status: approved ? 'approved' : 'denied' }
              : p,
          ),
        );

        if (!approved) {
          await streamText(msgId, step.denied);
          break;
        }

        const toolId = uid();
        patch(msgId, (parts) => [
          ...parts,
          {
            type: 'tool',
            id: toolId,
            name: step.toolName,
            input: {},
            output: null,
            status: 'running',
          },
        ]);
        await sleep(650);
        patch(msgId, (parts) =>
          parts.map((p) =>
            p.id === toolId && p.type === 'tool'
              ? { ...p, output: step.then.output, status: 'done' }
              : p,
          ),
        );
        await streamText(msgId, step.then.text);
      }

      setIsStreaming(false);
    },
    [patch, streamText],
  );

  const send = useCallback(
    (text: string) => {
      if (isStreaming || isWaiting || !text.trim()) return;
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', parts: [{ type: 'text', id: uid(), text }] },
      ]);
      void run(pickScript(text, locale));
    },
    [isStreaming, isWaiting, locale, run],
  );

  const answerApproval = useCallback((_partId: string, approved: boolean) => {
    pending.current?.(approved);
  }, []);

  const reset = useCallback(() => {
    pending.current = null;
    setMessages([]);
    setIsStreaming(false);
    setIsWaiting(false);
  }, []);

  return { messages, isStreaming, isWaiting, send, answerApproval, reset };
}
