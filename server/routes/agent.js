import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { buildAuthClient } from '../services/gmail.js';
import { runAgent } from '../services/agent.js';

const router = Router();
router.use(requireAuth);

router.post('/run', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const auth = buildAuthClient(req.session.tokens);
  const userEmail = req.session.userEmail;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  function send(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    await runAgent(message, history, auth, userEmail, send);
  } catch (err) {
    console.error('Agent error:', err);
    send({ type: 'message', content: `Error: ${err.message}` });
    send({ type: 'done', assistantMessage: `Error: ${err.message}` });
  }

  res.end();
});

export default router;
