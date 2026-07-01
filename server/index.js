import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import agentRoutes from './routes/agent.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.set('trust proxy', 1);
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  httpOnly: true,
}));

app.use('/auth', authRoutes);
app.use('/emails', emailRoutes);
app.use('/agent', agentRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
