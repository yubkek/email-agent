import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

export async function rankEmails(emails) {
  if (!emails.length) return [];

  const emailList = emails
    .map((e, i) => `${i + 1}. From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet?.slice(0, 100)}`)
    .join('\n');

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are an email importance ranker. Given a list of emails, return a JSON object with a "scores" array of integers 1-10 (10 = most important). Prioritize: emails requiring action/reply, deadlines, personal messages from real people. Deprioritize: newsletters, notifications, automated emails.',
      },
      {
        role: 'user',
        content: `Rate the importance of these ${emails.length} emails and return exactly ${emails.length} scores:\n\n${emailList}\n\nReturn JSON: {"scores": [n1, n2, ...]}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  try {
    const result = JSON.parse(response.choices[0].message.content);
    const scores = result.scores || [];
    return emails.map((email, i) => ({ ...email, importanceScore: scores[i] ?? 5 }));
  } catch {
    return emails.map(email => ({ ...email, importanceScore: 5 }));
  }
}

export async function generateReply(email) {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a professional email assistant. Write a concise, professional reply to the email below. Write only the email body — no subject line, no "Dear/Hi [name]" if you don\'t know the name, no signature placeholder. Keep it natural and appropriately brief.',
      },
      {
        role: 'user',
        content: `Write a reply to this email:\n\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body?.slice(0, 3000)}`,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}
