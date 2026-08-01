'use client';

// PROTOTYPE — the real thing. Talks to the eve agent in
// prototypes/mechiron-agent-prototype over same-origin /eve/v1/* routes
// (mounted by withEve in next.config.ts).
//
// This file exists so the three UI variants don't have to know which backend
// they're on: it projects eve's UIMessage-shaped state onto the same
// ChatController the mock hook returns.

import { useCallback, useMemo, useRef } from 'react';
import { useEveAgent } from 'eve/react';
import type { EveMessage, EveMessagePart } from 'eve/react';
import type { ChatController, Message, Part } from './types';

/** Option ids to send back when answering an approval request. */
type ApprovalIds = { requestId: string; approveId: string; denyId: string };

/** Render `{ base_quantity: 500 }` as `base_quantity · 500`, one row per key. */
function inputToLines(input: unknown): string[] {
  if (input === null || typeof input !== 'object') return [];
  return Object.entries(input as Record<string, unknown>).map(([k, v]) => {
    const value =
      Array.isArray(v) || (v !== null && typeof v === 'object')
        ? JSON.stringify(v)
        : String(v);
    return `${k} · ${value}`;
  });
}

function pickOptionIds(
  request: NonNullable<
    NonNullable<
      Extract<EveMessagePart, { type: 'dynamic-tool' }>['toolMetadata']
    >['eve']
  >['inputRequest'],
): { approveId: string; denyId: string } {
  const options = request?.options ?? [];
  const approve = options.find((o) => /^(approve|allow|yes|confirm|ok)$/i.test(o.id));
  const deny = options.find((o) => /^(deny|reject|no|cancel|abort)$/i.test(o.id));
  // Positional fallback for a two-option prompt whose ids we don't recognise
  // (the model writes its own ids for `ask_question`).
  const [first, second] = options;
  return {
    approveId: approve?.id ?? first?.id ?? 'approve',
    denyId: deny?.id ?? (options.length === 2 ? second?.id : undefined) ?? 'deny',
  };
}

function mapPart(part: EveMessagePart, approvals: Map<string, ApprovalIds>): Part[] {
  if (part.type === 'text' || part.type === 'reasoning') {
    // Reasoning is rendered as ordinary text here; the prototype has nowhere
    // distinct to put it.
    return part.text ? [{ type: 'text', id: `${part.type}-${part.text.length}`, text: part.text }] : [];
  }

  if (part.type !== 'dynamic-tool') return [];

  const name = part.toolMetadata?.eve?.name ?? part.toolName;
  const request = part.toolMetadata?.eve?.inputRequest;
  const out: Part[] = [];

  // An approval-gated call shows up first as a gate, then as a completed tool.
  if (request || part.approval) {
    const approvalId = `${part.toolCallId}-approval`;
    const status =
      part.state === 'approval-requested'
        ? 'pending'
        : part.state === 'output-denied' ||
            (part.state === 'approval-responded' && part.approval?.approved === false)
          ? 'denied'
          : 'approved';

    if (request) {
      approvals.set(approvalId, { requestId: request.requestId, ...pickOptionIds(request) });
    }

    // For a gated tool, the input *is* the detail worth showing. For
    // `ask_question` the input is just the prompt/options envelope, which the
    // summary and buttons already render — don't repeat it as rows.
    const lines =
      !request || request.kind === 'tool-approval' ? inputToLines(part.input) : [];

    out.push({
      type: 'approval',
      id: approvalId,
      toolName: name,
      summary: request?.prompt ?? name,
      lines,
      status,
    });
  }

  const settled =
    part.state === 'output-available' || part.state === 'output-error';

  // Don't render a tool row for a gate that is still pending or was denied —
  // nothing ran.
  if (settled || (!request && !part.approval)) {
    out.push({
      type: 'tool',
      id: `${part.toolCallId}-tool`,
      name,
      input: (part.input ?? {}) as Record<string, unknown>,
      output: settled
        ? part.state === 'output-error'
          ? { error: part.errorText }
          : ((part.output ?? {}) as Record<string, unknown>)
        : null,
      status: settled ? 'done' : 'running',
    });
  }

  return out;
}

function mapMessage(m: EveMessage, approvals: Map<string, ApprovalIds>): Message {
  return {
    id: m.id,
    role: m.role === 'user' ? 'user' : 'agent',
    parts: m.parts.flatMap((p, i) =>
      mapPart(p, approvals).map((part) => ({ ...part, id: `${m.id}-${i}-${part.id}` })),
    ),
  };
}

export function useEveChat(): ChatController {
  const agent = useEveAgent();

  // partId -> the ids needed to answer that approval. Rebuilt on every
  // projection so it never goes stale.
  const approvals = useRef(new Map<string, ApprovalIds>());

  const messages = useMemo(() => {
    const next = new Map<string, ApprovalIds>();
    const mapped = agent.data.messages.map((m) => mapMessage(m, next));
    approvals.current = next;

    if (agent.status === 'error' && agent.error) {
      mapped.push({
        id: 'error',
        role: 'agent',
        parts: [{ type: 'text', id: 'error-text', text: `⚠ ${agent.error.message}` }],
      });
    }
    return mapped;
  }, [agent.data.messages, agent.status, agent.error]);

  const isWaiting = messages.some((m) =>
    m.parts.some((p) => p.type === 'approval' && p.status === 'pending'),
  );

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      void agent.send({ message: text }).catch(() => {
        // Surfaced through agent.error / status above.
      });
    },
    [agent],
  );

  const answerApproval = useCallback(
    (partId: string, approved: boolean) => {
      // partId was prefixed during projection; match on the suffix we stored.
      const entry =
        approvals.current.get(partId) ??
        [...approvals.current.entries()].find(([k]) => partId.endsWith(k))?.[1];
      if (!entry) return;

      void agent
        .send({
          inputResponses: [
            {
              requestId: entry.requestId,
              optionId: approved ? entry.approveId : entry.denyId,
            },
          ],
        })
        .catch(() => {});
    },
    [agent],
  );

  return {
    messages,
    isStreaming: agent.status === 'streaming' || agent.status === 'submitted',
    isWaiting,
    send,
    answerApproval,
    reset: agent.reset,
  };
}
