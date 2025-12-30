import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateToken } from './token-generator.js';

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('[DEBUG] Starting server...');

// Load environment variables from python_agent/.env.local
config({ path: join(__dirname, '..', 'python_agent', '.env.local') });

console.log('[DEBUG] Environment loaded');

const app = express();
const PORT = 3001;

// LiveKit configuration from environment
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

console.log('[DEBUG] Express app created');

app.use(cors());
app.use(express.json());

console.log('[DEBUG] Middleware configured');

// Generate token endpoint
app.post('/api/token', async (req, res) => {
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({
      error: 'roomName and participantName are required'
    });
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.status(500).json({
      error: 'LiveKit credentials not configured'
    });
  }

  try {
    const token = await generateToken(roomName, participantName, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    console.log('Generated token for room:', roomName);
    console.log('Token type:', typeof token);
    console.log('Token value:', token);

    res.json({
      token,
      url: LIVEKIT_URL,
      roomName,
      participantName
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      error: 'Failed to generate token'
    });
  }
});

console.log('[DEBUG] Routes configured, starting listener...');

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Token server running on http://localhost:${PORT}`);
  console.log(`📡 LiveKit server: ${LIVEKIT_URL}\n`);
  console.log('Usage:');
  console.log('  POST http://localhost:3001/api/token');
  console.log('  Body: { "roomName": "my-room", "participantName": "user" }\n');
});

console.log('[DEBUG] Listen called, server object:', typeof server);

// Keep process alive
process.on('SIGTERM', () => {
  console.log('[DEBUG] SIGTERM received, closing server...');
  server.close();
});

process.on('SIGINT', () => {
  console.log('[DEBUG] SIGINT received, closing server...');
  server.close();
});

// Prevent process from exiting
setInterval(() => {
  console.log('[DEBUG] Keepalive tick');
}, 30000);

console.log('[DEBUG] Server script end reached');
