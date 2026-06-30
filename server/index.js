import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import FileStoreFactory from 'session-file-store';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import agentRoutes from './routes/agent.js';

const FileStore = FileStoreFactory(session);
const app = express();
const PORT = process.env.PORT || 3001;

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: new FileStore({ path: './sessions', ttl: THIRTY_DAYS / 1000, reapInterval: 3600 }),
  cookie: { secure: false, httpOnly: true, maxAge: THIRTY_DAYS },
}));

app.use('/auth', authRoutes);
app.use('/emails', emailRoutes);
app.use('/agent', agentRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
