import { Router } from 'express';
import { getAuthUrl, getTokensFromCode, buildAuthClient, getUserEmail } from '../services/gmail.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/google', (req, res) => {
  res.redirect(getAuthUrl());
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}?error=access_denied`);
  }

  try {
    const tokens = await getTokensFromCode(code);
    const auth = buildAuthClient(tokens);
    const email = await getUserEmail(auth);
    req.session.tokens = tokens;
    req.session.userEmail = email;
    res.redirect(`${FRONTEND_URL}/chat`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${FRONTEND_URL}?error=auth_failed`);
  }
});

router.get('/status', (req, res) => {
  if (req.session.tokens) {
    res.json({ authenticated: true, email: req.session.userEmail });
  } else {
    res.json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

export default router;
