import { NextRequest, NextResponse } from 'next/server';
import { bryceStudioConfig } from '@/agents';
import { callClaudeMessages } from '@/lib/anthropic';
import {
  appendMessage,
  ensureIntel,
  loadConversation,
} from '@/lib/bryce-chat';
import { extractPlanFromReport, savePlan } from '@/lib/marketing-plans';
import { fetchAgentVariables } from '@/lib/agent-data';

export const maxDuration = 300;

/**
 * POST /api/agents/creative-strategy/chat — send a message to Bryce and
 * get his reply. The conversation is persisted in Redis. If Bryce's reply
 * contains a json-plan code block, it's saved as a draft MarketingPlan.
 */
export async function POST(request: NextRequest) {
  let message: string;
  try {
    const body = await request.json();
    message = (body.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Make sure the conversation has Sloane's intel snapshotted
  const vars = await fetchAgentVariables('creative-strategy');
  const intel = vars.intel || 'No intel available.';
  await ensureIntel(intel);

  // Append the user's message
  await appendMessage({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  const convo = await loadConversation();

  // Build system prompt — Sloane's intel is background reference only, NOT plan input
  const systemPrompt = `${bryceStudioConfig.systemPrompt}

---

REFERENCE: SLOANE SIGNAL'S MOST RECENT INTEL (snapshotted ${convo.intelTakenAt ? new Date(convo.intelTakenAt).toLocaleString() : 'just now'}):

${convo.intelSnapshot}

---

CONVERSATION RULES:
- This is a back-and-forth strategy chat with the GC Team.
- Stay focused on creative strategy, content angles, and refining the marketing plan.
- Keep replies focused and under ~250 words unless they ask for more depth.
- Push back when warranted. If the GC Team's idea has a creative or strategic flaw, say so directly with reasoning. Don't be a yes-man.

HOW TO USE SLOANE'S INTEL:
- Sloane's intel is reference material only. You may cite it during discussion when helpful (e.g. "Sloane noted Reels are outperforming carousels 3:1 — want to lean in?").
- You may NOT use Sloane's intel as a source for plan content. Themes, hooks, captions, visual concepts, posting schedule — all of it must come from what the GC Team and you have explicitly discussed and agreed on in THIS conversation.

PLAN PRODUCTION RULES:
- When the GC Team asks you to produce the final plan (e.g. "create the plan", "generate it", "lock it in"), output the markdown brief followed by the json-plan code block per your normal format.
- The plan MUST be a faithful execution of what we agreed on in this chat. Every theme, hook, caption, and visual concept must trace back to something the GC Team and you discussed.
- If you find you're filling gaps with material we never discussed, STOP. Instead, reply with a short list of the open questions you need answered before you can produce the plan, and wait for the GC Team to clarify.
- If we discussed direction but didn't agree on enough specifics for a full plan, ask before producing.
- If the GC Team is still discussing direction, do NOT emit a json-plan block — just engage with the strategy conversation.`;

  try {
    const response = await callClaudeMessages({
      systemPrompt,
      messages: convo.messages.map((m) => ({ role: m.role, content: m.content })),
      model: bryceStudioConfig.model,
      maxTokens: bryceStudioConfig.maxTokens,
      temperature: bryceStudioConfig.temperature,
      enableWebTools: true,
    });

    const updatedConvo = await appendMessage({
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
    });

    // If Bryce produced a json-plan in this reply, save as draft
    let savedPlanId: string | undefined;
    let planExtractionNote: string | undefined;
    try {
      const hasFence = /```json-plan/.test(response.content);
      const plan = extractPlanFromReport('creative-strategy', response.content);
      if (plan) {
        await savePlan(plan);
        savedPlanId = plan.id;
      } else if (hasFence) {
        planExtractionNote =
          'Bryce included a json-plan code block but it failed to parse — check the raw reply for malformed JSON.';
      }
    } catch (planErr) {
      planExtractionNote = `Plan extraction threw: ${
        planErr instanceof Error ? planErr.message : String(planErr)
      }`;
      console.error('Failed to extract plan from chat reply:', planErr);
    }

    return NextResponse.json({
      conversation: updatedConvo,
      reply: response.content,
      savedPlanId,
      planExtractionNote,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
