'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { bryceStudioConfig } from '@/agents';
import { BryceConversation, ChatMessage } from '@/lib/types';

export default function BryceChatPage() {
  const agent = bryceStudioConfig;

  const [conversation, setConversation] = useState<BryceConversation | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastSavedPlanId, setLastSavedPlanId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/creative-strategy/conversation');
      const data = await res.json();
      setConversation(data.conversation || null);
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || sending) return;

    // Optimistic update
    const optimistic: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setConversation((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, optimistic] }
        : {
            messages: [optimistic],
            intelSnapshot: '',
            intelTakenAt: null,
            updatedAt: new Date().toISOString(),
          }
    );
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/agents/creative-strategy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      // Surface non-2xx responses with whatever body the server returned
      if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`;
        try {
          const errBody = await res.json();
          if (errBody?.error) detail = errBody.error;
        } catch {
          // Body wasn't JSON (e.g. Vercel timeout HTML). Fall back to status text.
          if (res.status === 504) {
            detail =
              'Bryce took too long to reply (Vercel function timeout). If you asked him to produce the full plan, try splitting it: "draft the brief now" then in a second message "now emit the json-plan."';
          }
        }
        alert(`Send failed: ${detail}`);
        return;
      }

      const data = await res.json();
      if (data.conversation) {
        setConversation(data.conversation);
      }
      if (data.savedPlanId) {
        setLastSavedPlanId(data.savedPlanId);
      }
      if (data.error) {
        alert(`Bryce errored: ${data.error}`);
      }
    } catch (err) {
      console.error('Send failed:', err);
      alert(
        `Send failed — ${
          err instanceof Error ? err.message : 'unknown error'
        }. Check browser console for details.`
      );
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset the conversation? Sloane\'s latest intel will be re-snapshotted.')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/agents/creative-strategy/reset', { method: 'POST' });
      const data = await res.json();
      setConversation(data.conversation || null);
      setLastSavedPlanId(null);
    } finally {
      setResetting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = conversation?.messages || [];
  const intelSnapshot = conversation?.intelSnapshot || '';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-neutral-300">{agent.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: agent.avatar.color }}
          >
            {agent.avatar.initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <p className="text-neutral-400 text-sm">{agent.title}</p>
            <p className="text-neutral-500 text-xs mt-1">{agent.bio}</p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link
            href="/dashboard/social-media/plans"
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Plans
          </Link>
          <button
            onClick={handleReset}
            disabled={resetting || sending}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {resetting ? 'Resetting…' : 'Reset chat'}
          </button>
        </div>
      </div>

      {/* Intel snapshot */}
      {intelSnapshot && (
        <details className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-4 mb-6 text-sm">
          <summary className="cursor-pointer text-neutral-300 font-medium">
            Sloane&apos;s intel in this conversation
            {conversation?.intelTakenAt && (
              <span className="text-neutral-500 ml-2">
                (snapshotted {new Date(conversation.intelTakenAt).toLocaleString()})
              </span>
            )}
          </summary>
          <pre className="mt-3 text-xs text-neutral-400 whitespace-pre-wrap font-mono leading-relaxed">
            {intelSnapshot.slice(0, 2000)}
            {intelSnapshot.length > 2000 && '\n…(truncated)'}
          </pre>
        </details>
      )}

      {!intelSnapshot && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6 text-sm text-amber-300">
          No Sloane intel snapshotted yet. Run Sloane Signal first, then start chatting with Bryce.{' '}
          <Link href="/dashboard/social-media" className="underline hover:text-amber-200">
            Go to Sloane →
          </Link>
        </div>
      )}

      {lastSavedPlanId && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="text-green-300 text-sm">
            ✓ Bryce just produced a plan — review it and approve to ship to Predis.
          </div>
          <Link
            href={`/dashboard/social-media/plans/${lastSavedPlanId}`}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            Open plan →
          </Link>
        </div>
      )}

      {/* Chat thread */}
      <div className="flex-1 bg-neutral-900/30 border border-neutral-800 rounded-xl p-4 mb-4 overflow-y-auto" style={{ minHeight: 400 }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-12">
            <p className="mb-2">Chat with Bryce to refine the strategy.</p>
            <p className="text-xs max-w-md">
              Try: <em>&quot;What angle would you take this week given Sloane&apos;s intel?&quot;</em> — then refine
              from there. When you&apos;re happy, say <em>&quot;create the plan.&quot;</em>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-[#B5A36B] text-black'
                      : 'bg-neutral-800 text-neutral-100'
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {m.role === 'user' ? 'You' : agent.name}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-neutral-800 text-neutral-400 rounded-2xl px-4 py-3 text-sm italic">
                  Bryce is thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Bryce… (Enter to send, Shift+Enter for newline)"
          rows={2}
          disabled={sending || !intelSnapshot}
          className="w-full bg-transparent text-white placeholder-neutral-600 resize-none focus:outline-none text-sm leading-relaxed disabled:opacity-50"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-neutral-600">
            {messages.length} messages
          </span>
          <button
            onClick={handleSend}
            disabled={sending || !input.trim() || !intelSnapshot}
            className="px-4 py-1.5 bg-[#B5A36B] hover:bg-[#C9BA88] disabled:bg-neutral-800 disabled:text-neutral-600 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
