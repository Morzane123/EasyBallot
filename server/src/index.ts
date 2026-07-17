import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { getDb } from './db';
import adminRoutes from './routes/admin';
import voteRoutes from './routes/votes';
import uploadRoutes from './routes/upload';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize database
getDb();

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3070;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
