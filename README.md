# Woman Talks - Live Talking Avatar System

A real-time talking avatar system with lip sync, emotion detection, and LiveKit integration.

## Features

- **Real-time Lip Sync**: Mouth animation synchronized with audio using phoneme detection
- **Emotion Detection**: Automatic emotion recognition from voice and text
- **LiveKit Integration**: Stream your avatar in real-time video calls
- **Canvas Rendering**: High-performance avatar rendering with smooth animations
- **Layered Avatar System**: Support for customizable avatar parts (head, mouth, eyes, eyebrows)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Prepare Your Avatar Assets

Create avatar images with transparent backgrounds and place them in `public/avatars/default/`:

**Required files:**
- `head.png` - Base head image
- `eyes-open.png` - Open eyes layer
- `eyes-closed.png` - Closed eyes layer
- `mouth-A.png` - Open mouth (vowels: a, i)
- `mouth-B.png` - Lips together (m, b, p)
- `mouth-C.png` - Slightly open (e)
- `mouth-D.png` - Tongue/teeth (t, d, s, z)
- `mouth-E.png` - Rounded lips (o)
- `mouth-F.png` - Bottom lip/teeth (f, v)
- `mouth-G.png` - Throat/back (k, g)
- `mouth-H.png` - Aspirated (h)
- `mouth-X.png` - Closed/rest

**Image specifications:**
- Format: PNG with transparency
- All images must be the same size
- Recommended size: 512x512px or 1024x1024px
- Layers should align perfectly when overlaid

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Connect to LiveKit

You need a LiveKit server and access token:

**Option A: Use LiveKit Cloud**
1. Sign up at [livekit.io](https://livekit.io)
2. Create a project
3. Generate an access token
4. Use the WebSocket URL and token to connect

**Option B: Run Local LiveKit Server**
```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

## How to Create Avatar Assets

### Method 1: Using Photoshop/GIMP/Krita

1. **Start with your avatar image**
   - Open your human avatar image
   - Size should be at least 512x512px

2. **Extract the head (base layer)**
   - Duplicate the layer
   - Remove the mouth area (make it transparent)
   - Save as `head.png`

3. **Create mouth shapes**
   - For each phoneme (A-H, X), draw the corresponding mouth shape
   - Use reference guides (search "Rhubarb lip sync mouth shapes")
   - Save each as `mouth-A.png`, `mouth-B.png`, etc.

4. **Create eye layers**
   - Duplicate the base image
   - Keep only the open eyes → `eyes-open.png`
   - Create closed/blinking version → `eyes-closed.png`

5. **Make backgrounds transparent**
   - All PNGs must have transparent backgrounds
   - Only the specific layer should be visible

### Method 2: Using AI Tools

You can use AI image generation tools to create mouth shapes:

```
Prompt examples:
- "Professional female avatar, neutral expression, mouth closed, transparent background"
- "Same avatar, mouth wide open saying 'ah', transparent background"
- "Same avatar, lips pressed together saying 'mm', transparent background"
```

### Phoneme Reference Guide

| Phoneme | Mouth Shape | Example Sounds | Visual Description |
|---------|-------------|----------------|-------------------|
| A | Wide open | "ah", "eye" | Jaw dropped, mouth wide |
| B | Lips closed | "m", "b", "p" | Lips pressed together |
| C | Slightly open | "eh", "bed" | Small opening |
| D | Teeth visible | "t", "d", "s" | Tongue at teeth |
| E | Rounded | "oh", "go" | Lips rounded, moderate opening |
| F | Lower lip/teeth | "f", "v" | Lower lip under upper teeth |
| G | Back of throat | "k", "g" | Throat articulation |
| H | Aspirated | "h", "ha" | Gentle opening with breath |
| X | Rest/closed | Silence, pause | Relaxed, neutral closed |

## Architecture

### Components

- **LiveAvatar** - Main React component for avatar display
- **AvatarRenderer** - Canvas-based rendering engine
- **LipSyncEngine** - Phoneme detection from audio
- **EmotionDetector** - Emotion recognition from audio/text

### Data Flow

```
Microphone → Audio Analysis → Phoneme Detection → Canvas Rendering
                             ↓
                        LiveKit Room ← Remote Participants
```

### LiveKit Integration

The system uses LiveKit's DataChannel to broadcast avatar state:

```typescript
// Phoneme events (sent ~60fps, unreliable)
{
  type: 'phoneme',
  value: 'A',
  timestamp: 1234567890
}

// Emotion events (sent ~1fps, reliable)
{
  type: 'emotion',
  value: 'happy',
  timestamp: 1234567890
}
```

## Advanced Usage

### Custom Avatar Path

```tsx
<LiveAvatar
  room={room}
  avatarPath="/avatars/my-custom-avatar"
  enableLocalAudio={true}
/>
```

### Integrating with Rhubarb Lip Sync

For production-quality lip sync, use [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync):

```bash
# Install Rhubarb
# Download from GitHub releases

# Generate phoneme data
rhubarb -f json -o output.json input.wav

# Output format:
{
  "mouthCues": [
    { "start": 0.0, "end": 0.1, "value": "X" },
    { "start": 0.1, "end": 0.3, "value": "D" }
  ]
}
```

Then use the phoneme timeline:

```typescript
// Load Rhubarb output
const timeline = await fetch('/phonemes.json').then(r => r.json());

// Play audio and sync
audioElement.play();
timeline.mouthCues.forEach(cue => {
  setTimeout(() => {
    renderer.setPhoneme(cue.value);
  }, cue.start * 1000);
});
```

### Adding Custom Emotions

Extend the emotion system in [src/lib/emotionDetector.ts](src/lib/emotionDetector.ts):

```typescript
private emotionKeywords: Record<Emotion, string[]> = {
  // ... existing emotions
  excited: ['excited', 'awesome', 'incredible'],
  confused: ['confused', 'huh', 'what']
};
```

Add eyebrow layers for expressions:

```typescript
eyebrows: {
  happy: happyBrowsImage,
  sad: sadBrowsImage,
  angry: angryBrowsImage
}
```

## Performance Optimization

- Avatar images are cached after first load
- Canvas rendering runs at 60fps
- Phoneme events use unreliable DataChannel for low latency
- Audio analysis uses Web Audio API for native performance

## Troubleshooting

### Avatar doesn't load
- Check that all required image files exist in `public/avatars/default/`
- Open browser console to see specific missing files
- Ensure images are PNG format with transparency

### No lip sync
- Check microphone permissions
- Verify LiveKit connection is active
- Check browser console for audio analysis errors

### Choppy animation
- Reduce canvas size (use smaller avatar images)
- Check CPU usage - close other applications
- Ensure browser hardware acceleration is enabled

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (requires HTTPS for microphone)

## Production Deployment

1. **Build the app**
   ```bash
   pnpm build
   ```

2. **Deploy static files**
   - Upload `dist/` folder to your hosting service
   - Ensure avatar images are included in `dist/avatars/`

3. **Configure LiveKit**
   - Set up production LiveKit server
   - Use environment variables for server URL
   - Implement token generation on your backend

## License

ISC

## Credits

- Built with React, TypeScript, and Vite
- Real-time communication via LiveKit
- Lip sync inspired by Rhubarb Lip Sync
