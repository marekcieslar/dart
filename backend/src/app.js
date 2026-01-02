import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import gameController from './controllers/gameController.js';
import adminController from './controllers/adminController.js';
import { setupSocketHandlers } from './socket/socketHandler.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/games', gameController);
app.use('/api/admin', adminController);

// Serve frontend static files
app.use(express.static('../frontend/public'));

// Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 5000,
  pingInterval: 25000
});

setupSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export { app, httpServer, io };
