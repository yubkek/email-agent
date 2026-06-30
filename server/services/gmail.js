import { google } from 'googleapis';

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function buildAuthClient(tokens) {
  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
}

export async function getUserEmail(auth) {
  const oauth2 = google.oauth2({ version: 'v2', auth });
  const { data } = await oauth2.userinfo.get();
  return data.email;
}

function decodeBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8').replace(/<[^>]+>/g, '');
      }
    }
    for (const part of payload.parts) {
      if (part.parts) {
        const body = decodeBody(part);
        if (body) return body;
      }
    }
  }
  return '';
}

function getHeader(headers, name) {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

export async function getTodayEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${dateStr} -category:promotions -category:social`,
    maxResults: 30,
  });

  if (!list.data.messages?.length) return [];

  const emails = await Promise.all(
    list.data.messages.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const h = msg.data.payload.headers;
      return {
        id,
        threadId: msg.data.threadId,
        from: getHeader(h, 'From'),
        subject: getHeader(h, 'Subject') || '(no subject)',
        date: getHeader(h, 'Date'),
        snippet: msg.data.snippet,
      };
    })
  );

  return emails;
}

export async function getEmail(auth, id) {
  const gmail = google.gmail({ version: 'v1', auth });
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'full',
  });

  const h = msg.data.payload.headers;
  return {
    id,
    threadId: msg.data.threadId,
    from: getHeader(h, 'From'),
    to: getHeader(h, 'To'),
    subject: getHeader(h, 'Subject') || '(no subject)',
    date: getHeader(h, 'Date'),
    messageId: getHeader(h, 'Message-ID'),
    body: decodeBody(msg.data.payload),
  };
}

function buildMimeMessage({ from, to, subject, body, inReplyTo, references, threadId }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
    references ? `References: ${references}` : '',
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].filter(l => l !== null && l !== undefined);

  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

export async function createDraft(auth, { from, to, subject, body, inReplyTo, references, threadId }) {
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = buildMimeMessage({ from, to, subject, body, inReplyTo, references });

  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw, threadId },
    },
  });

  return draft.data;
}

export async function sendEmail(auth, { from, to, subject, body, inReplyTo, references, threadId }) {
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = buildMimeMessage({ from, to, subject, body, inReplyTo, references });

  const sent = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId },
  });

  return sent.data;
}

export async function searchEmails(auth, query, maxResults = 10) {
  const gmail = google.gmail({ version: 'v1', auth });

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: Math.min(maxResults, 20),
  });

  if (!list.data.messages?.length) return [];

  const emails = await Promise.all(
    list.data.messages.map(async ({ id }) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const h = msg.data.payload.headers;
      return {
        id,
        threadId: msg.data.threadId,
        from: getHeader(h, 'From'),
        subject: getHeader(h, 'Subject') || '(no subject)',
        date: getHeader(h, 'Date'),
        snippet: msg.data.snippet,
      };
    })
  );

  return emails;
}
