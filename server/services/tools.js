import { getTodayEmails, getEmail, searchEmails, createDraft, sendEmail } from './gmail.js';

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'list_today_emails',
      description: 'List all emails received today from the primary inbox (excludes promotions and social). Returns ID, sender, subject, snippet, and date for each email.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_email',
      description: 'Read the full body and metadata of a specific email by its ID.',
      parameters: {
        type: 'object',
        properties: {
          email_id: { type: 'string', description: 'The email ID to read' },
        },
        required: ['email_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_emails',
      description: 'Search Gmail using a search query. Supports Gmail operators like from:, subject:, is:unread, after:YYYY/MM/DD, has:attachment, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query (e.g. "from:boss@company.com is:unread", "subject:invoice after:2024/01/01")',
          },
          max_results: {
            type: 'string',
            description: 'How many results to return, e.g. "3" or "10". Default is "10".',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_draft',
      description: 'Save a reply to an email as a Gmail draft without sending it. Use this when the user wants to review before sending, or when not explicitly told to send.',
      parameters: {
        type: 'object',
        properties: {
          email_id: { type: 'string', description: 'The ID of the email to reply to' },
          reply_text: { type: 'string', description: 'The body of the reply' },
        },
        required: ['email_id', 'reply_text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_reply',
      description: 'Send a reply to an email immediately. Only call this when the user explicitly confirms they want to send (e.g. "send it", "go ahead", "yes send it").',
      parameters: {
        type: 'object',
        properties: {
          email_id: { type: 'string', description: 'The ID of the email to reply to' },
          reply_text: { type: 'string', description: 'The body of the reply' },
        },
        required: ['email_id', 'reply_text'],
      },
    },
  },
];

export async function executeTool(name, args, auth, userEmail) {
  switch (name) {
    case 'list_today_emails': {
      const emails = await getTodayEmails(auth);
      return emails.map(e => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        snippet: e.snippet,
        date: e.date,
      }));
    }

    case 'read_email': {
      const email = await getEmail(auth, args.email_id);
      return {
        id: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        date: email.date,
        body: email.body?.slice(0, 4000),
      };
    }

    case 'search_emails': {
      const emails = await searchEmails(auth, args.query, parseInt(args.max_results) || 10);
      return emails.map(e => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        snippet: e.snippet,
        date: e.date,
      }));
    }

    case 'create_draft': {
      const email = await getEmail(auth, args.email_id);
      const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
      await createDraft(auth, {
        from: userEmail,
        to: email.from,
        subject,
        body: args.reply_text,
        inReplyTo: email.messageId,
        references: email.messageId,
        threadId: email.threadId,
      });
      return {
        success: true,
        message: `Draft saved — reply to "${email.subject}" from ${email.from}`,
        draftPreview: {
          to: email.from,
          subject,
          body: args.reply_text,
          emailId: args.email_id,
        },
      };
    }

    case 'send_reply': {
      const email = await getEmail(auth, args.email_id);
      await sendEmail(auth, {
        from: userEmail,
        to: email.from,
        subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        body: args.reply_text,
        inReplyTo: email.messageId,
        references: email.messageId,
        threadId: email.threadId,
      });
      return { success: true, message: `Reply sent to ${email.from} for "${email.subject}"` };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
