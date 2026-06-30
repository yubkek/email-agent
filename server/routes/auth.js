import { Router } from 'express';
import { getAuthUrl, getTokensFromCode, buildAuthClient, getUserEmail } from '../services/gmail.js';

const router = Router();

router.get('/google', (req, res) => {
  res.redirect(getAuthUrl());
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('http://localhost:5173?error=access_denied');
  }

  try {
    const tokens = await getTokensFromCode(code);
    const auth = buildAuthClient(tokens);
    const email = await getUserEmail(auth);
    req.session.tokens = tokens;
    req.session.userEmail = email;
    res.redirect('http://localhost:5173/dashboard');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('http://localhost:5173?error=auth_failed');
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
  req.session.destroy();
  res.json({ ok: true });
});

export default router;
