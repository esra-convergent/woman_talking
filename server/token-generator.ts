import { AccessToken } from 'livekit-server-sdk';

/**
 * Generate a LiveKit access token
 */
export async function generateToken(
  roomName: string,
  participantName: string,
  apiKey?: string,
  apiSecret?: string
): Promise<string> {
  // Use provided keys or fall back to environment variables
  const key = apiKey || process.env.LIVEKIT_API_KEY || 'devkey';
  const secret = apiSecret || process.env.LIVEKIT_API_SECRET || 'secret';

  const at = new AccessToken(key, secret, {
    identity: participantName,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await at.toJwt();
  console.log('JWT generated, type:', typeof jwt);
  return jwt;
}

// CLI usage
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  const roomName = process.argv[2] || 'my-room';
  const participantName = process.argv[3] || 'user';

  generateToken(roomName, participantName).then(token => {
    console.log('\n=== LiveKit Token Generated ===');
    console.log('Room:', roomName);
    console.log('Participant:', participantName);
    console.log('Server URL: ws://localhost:7880');
    console.log('\nToken:');
    console.log(token);
    console.log('\n');
  });
}
