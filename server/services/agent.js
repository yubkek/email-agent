import Groq from 'groq-sdk';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'qwen/qwen3-32b';
const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are an intelligent Gmail email agent. You help users manage their inbox by reading, searching, drafting, and sending emails.

Rules:
- Always use tools to get real email data — never invent email content
- When the user mentions a specific sender, company, or topic: use search_emails with a targeted query (e.g. "from:twitch", "from:amazon subject:order") — never use list_today_emails for these cases
- Only use list_today_emails when the user explicitly asks to see all of today's emails with no specific filter
- When the user asks for "most recent" or "latest": search_emails with max_results "1", then read_email on that result
- When listing emails, keep your text response to a brief intro only (e.g. "Here are 3 emails from Twitch:") — the UI displays them automatically, do not list them in your text
- When the user asks for a specific number (e.g. "top 3", "first 5"), set max_results to that number as a string (e.g. "3")
- When drafting a reply: write it and call create_draft immediately — don't ask for permission first, just do it
- Only call send_reply when the user explicitly says to send (e.g. "send it", "go ahead", "yes send") — otherwise always create a draft
- After acting, confirm what you did in one sentence
- If there are no emails or nothing matches, say so clearly`;

function truncateForContext(result) {
  if (Array.isArray(result)) {
    return result.slice(0, 8).map(({ body, snippet, ...rest }) => ({
      ...rest,
      snippet: snippet?.slice(0, 120),
    }));
  }
  if (result && typeof result === 'object' && result.body) {
    return { ...result, body: result.body.slice(0, 1500) };
  }
  return result;
}

function groupByThread(emails) {
  const map = new Map();
  for (const email of emails) {
    const tid = email.threadId || email.id;
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid).push(email);
  }
  return [...map.values()].map(msgs => ({
    threadId: msgs[0].threadId,
    subject: msgs[0].subject,
    from: msgs[0].from,
    snippet: msgs[0].snippet,
    date: msgs[0].date,
    messages: msgs,
  }));
}

export async function runAgent(userMessage, conversationHistory, auth, userEmail, onEvent) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let stepId = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await groq.chat.completions.create({
          model: MODEL,
          messages,
          tools: TOOL_DEFINITIONS,
          tool_choice: 'auto',
          temperature: 0.3,
        });
        break;
      } catch (err) {
        if (attempt === 0 && err?.error?.code === 'tool_use_failed') continue;
        throw err;
      }
    }

    const msg = response.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      onEvent({ type: 'message', content: msg.content });
      onEvent({ type: 'done', assistantMessage: msg.content });
      return;
    }

    for (const toolCall of msg.tool_calls) {
      let args;
      try {
        args = JSON.parse(toolCall.function.arguments || '{}') ?? {};
      } catch {
        args = {};
      }
      if (args === null || typeof args !== 'object') args = {};

      const id = ++stepId;
      onEvent({ type: 'tool_call', id, name: toolCall.function.name, args });

      let result;
      try {
        result = await executeTool(toolCall.function.name, args, auth, userEmail);
      } catch (err) {
        result = { error: err.message };
      }

      onEvent({ type: 'tool_result', id, name: toolCall.function.name, result });

      const isListTool = toolCall.function.name === 'list_today_emails' || toolCall.function.name === 'search_emails';
      if (isListTool && Array.isArray(result)) {
        onEvent({ type: 'email_list', threads: groupByThread(result) });
      }

      if (toolCall.function.name === 'create_draft' && result.draftPreview) {
        onEvent({ type: 'draft', draft: result.draftPreview });
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(truncateForContext(result)),
      });
    }
  }

  const fallback = 'I reached the maximum number of steps. Please try a more specific request.';
  onEvent({ type: 'message', content: fallback });
  onEvent({ type: 'done', assistantMessage: fallback });
}
