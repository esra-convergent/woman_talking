/**
 * Simple token generator for local LiveKit development
 * This creates a basic JWT without server-side validation
 */

export function generateLocalToken(roomName: string, participantName: string): string {
  // For local development with --dev flag, LiveKit accepts this simple format
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + 86400, // 24 hours
    iss: 'devkey',
    nbf: now,
    sub: participantName,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    }
  };

  // Simple base64 encoding (for dev mode only!)
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '');
  const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '');

  // For --dev mode, signature is not strictly validated
  const signature = 'dev-mode-signature';

  return `${base64Header}.${base64Payload}.${signature}`;
}

export const LOCAL_LIVEKIT_URL = 'ws://localhost:7880';
