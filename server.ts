import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { bootstrapDb, db } from './server/db';
import authRouter  from './server/routes/auth';
import leadsRouter from './server/routes/leads';
import rulesRouter from './server/routes/rules';
import usersRouter from './server/routes/users';

dotenv.config();

const app  = express();
const PORT = parseInt(process.env.PORT || '5000');

app.use(express.json());

app.use('/api/auth',  authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/users', usersRouter);

app.get('/api/db-status', (_req, res) => {
  res.json({
    provider:       db.status.provider,
    connected:      db.isConnected,
    configured:     db.status.configured,
    connectionInfo: db.status.connectionInfo,
    tableName:      db.status.tableName,
    error:          db.status.error || null,
  });
});

async function startServer() {
  await bootstrapDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
