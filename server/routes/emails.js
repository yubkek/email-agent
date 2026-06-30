import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { buildAuthClient, getTodayEmails, getEmail, createDraft, sendEmail } from '../services/gmail.js';
import { rankEmails, generateReply } from '../services/groq.js';

const router = Router();
router.use(requireAuth);

function getAuth(req) {
  return buildAuthClient(req.session.tokens);
}

router.get('/today', async (req, res) => {
  try {
    const auth = getAuth(req);
    const emails = await getTodayEmails(auth);
    const ranked = await rankEmails(emails);
    const sorted = ranked.sort((a, b) => b.importanceScore - a.importanceScore);
    res.json({ emails: sorted });
  } catch (err) {
    console.error('GET /emails/today error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const auth = getAuth(req);
    const email = await getEmail(auth, req.params.id);
    res.json({ email });
  } catch (err) {
    console.error('GET /emails/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/generate-reply', async (req, res) => {
  try {
    const auth = getAuth(req);
    const email = await getEmail(auth, req.params.id);
    const reply = await generateReply(email);
    res.json({ reply });
  } catch (err) {
    console.error('POST /emails/:id/generate-reply error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/draft', async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText) return res.status(400).json({ error: 'replyText is required' });

    const auth = getAuth(req);
    const email = await getEmail(auth, req.params.id);

    const draft = await createDraft(auth, {
      from: req.session.userEmail,
      to: email.from,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: replyText,
      inReplyTo: email.messageId,
      references: email.messageId,
      threadId: email.threadId,
    });

    res.json({ ok: true, draftId: draft.id });
  } catch (err) {
    console.error('POST /emails/:id/draft error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText) return res.status(400).json({ error: 'replyText is required' });

    const auth = getAuth(req);
    const email = await getEmail(auth, req.params.id);

    const sent = await sendEmail(auth, {
      from: req.session.userEmail,
      to: email.from,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: replyText,
      inReplyTo: email.messageId,
      references: email.messageId,
      threadId: email.threadId,
    });

    res.json({ ok: true, messageId: sent.id });
  } catch (err) {
    console.error('POST /emails/:id/send error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
