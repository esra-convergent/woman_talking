# Complete Setup Guide

## What You Have Now

A complete live talking avatar system with:
- Real-time lip sync from audio
- Emotion detection
- LiveKit integration for video calls
- Test mode to verify avatars without LiveKit
- Canvas-based rendering at 60fps

## Next Steps to Get It Running

### Step 1: Create Your Avatar Assets (Most Important!)

You need 13 PNG images with transparent backgrounds:

```
public/avatars/default/
├── head.png          (base head without mouth)
├── eyes-open.png     (open eyes)
├── eyes-closed.png   (closed eyes)
├── mouth-A.png       (wide open - "ah")
├── mouth-B.png       (lips together - "mm")
├── mouth-C.png       (slightly open - "eh")
├── mouth-D.png       (teeth visible - "t", "d")
├── mouth-E.png       (rounded - "oh")
├── mouth-F.png       (lip/teeth - "f", "v")
├── mouth-G.png       (throat - "k", "g")
├── mouth-H.png       (aspirated - "h")
└── mouth-X.png       (closed/rest)
```

**Quick way to test the system first:**
See [QUICKSTART.md](QUICKSTART.md) for creating simple placeholder images using ImageMagick

**For production quality:**
See [AVATAR_CREATION_GUIDE.md](AVATAR_CREATION_GUIDE.md) for detailed instructions

### Step 2: Install and Run

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open http://localhost:3000

### Step 3: Test Your Avatar

The app starts in **Test Mode** by default:

1. You'll see your avatar (once assets are loaded)
2. Click individual phonemes to test each mouth shape
3. Click "Test All Phonemes" to see an animation
4. Click "Simulate Speech" to see realistic mouth movement

This lets you verify everything works without needing LiveKit!

### Step 4: Connect to LiveKit (Optional)

Switch to **LiveKit Mode** to use in real-time calls:

**Option A: Use LiveKit Cloud (Easiest)**
1. Go to https://cloud.livekit.io
2. Sign up for free account
3. Create a project
4. Generate a token at: Settings → Keys
5. Copy WebSocket URL and token
6. Paste into the app

**Option B: Run Local Server**
```bash
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  livekit/livekit-server --dev
```

## Project Structure

```
woman_talks/
├── src/
│   ├── components/
│   │   ├── LiveAvatar.tsx      # LiveKit-connected avatar
│   │   └── AvatarTest.tsx      # Standalone tester
│   ├── lib/
│   │   ├── avatarRenderer.ts   # Canvas rendering engine
│   │   ├── lipSync.ts          # Phoneme detection
│   │   └── emotionDetector.ts  # Emotion recognition
│   ├── types/
│   │   └── avatar.ts           # TypeScript types
│   ├── App.tsx                 # Main app with mode switcher
│   └── main.tsx                # Entry point
├── public/
│   └── avatars/
│       └── default/            # YOUR AVATAR IMAGES GO HERE
├── README.md                   # Full documentation
├── AVATAR_CREATION_GUIDE.md    # How to create assets
├── QUICKSTART.md               # Quick setup guide
└── package.json
```

## How It Works

### Lip Sync Flow

```
Microphone → Web Audio API → Frequency Analysis → Phoneme Detection → Canvas Update
                                                         ↓
                                                   LiveKit Broadcast
```

1. **Capture audio** from microphone
2. **Analyze frequency** using Web Audio API
3. **Map to phonemes** (A-H, X) based on energy levels
4. **Update canvas** to show corresponding mouth shape
5. **Broadcast** phoneme data to other participants via LiveKit

### Avatar Rendering

```
Base Layer:    head.png
Eye Layer:     eyes-open.png or eyes-closed.png (blinking)
Mouth Layer:   mouth-[phoneme].png (changes with speech)
───────────────────────────────────
Final Frame:   Composited on canvas at 60fps
```

## Customization

### Add Custom Emotions

Edit [src/lib/emotionDetector.ts](src/lib/emotionDetector.ts):

```typescript
private emotionKeywords: Record<Emotion, string[]> = {
  // Add your custom emotions
  excited: ['excited', 'amazing', 'wow'],
  // ...
};
```

### Adjust Lip Sync Sensitivity

Edit [src/lib/lipSync.ts](src/lib/lipSync.ts):

```typescript
// Change energy thresholds for phoneme detection
if (energy < 0.01) phoneme = 'X';        // Silence
else if (energy > 0.5) phoneme = 'A';    // High energy
// ... adjust values for your voice
```

### Use Different Avatar Paths

```tsx
<LiveAvatar
  room={room}
  avatarPath="/avatars/my-custom-avatar"  // Custom path
/>
```

## Troubleshooting

### "Failed to load avatar"
- Check that all 13 PNG files exist in `public/avatars/default/`
- Open browser console (F12) to see which files are missing
- Verify files are named correctly (case-sensitive)

### No mouth movement
- Check microphone permissions
- Ensure LiveKit is connected (if in LiveKit mode)
- Verify audio is being captured (check browser console)

### Avatar looks wrong
- All images must be the same size
- Ensure transparency is correct
- Check that layers align when overlaid

### Build errors
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Production Deployment

```bash
# Build for production
pnpm build

# Output goes to dist/
# Deploy dist/ folder to your hosting service
```

Make sure to:
- Include avatar images in dist/avatars/
- Set up LiveKit server/cloud
- Implement token generation on backend (don't expose API keys!)

## Performance Tips

- Use 512x512px avatars (balance quality vs. performance)
- Compress PNGs (use tools like pngquant)
- Test on target devices
- Monitor frame rate in browser DevTools

## Advanced: Integrate Rhubarb Lip Sync

For production-quality lip sync, integrate [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync):

1. Download Rhubarb
2. Generate phoneme data from audio files
3. Load timeline in your app
4. Sync mouth shapes with audio playback

See [README.md](README.md) for code examples.

## Resources

- [LiveKit Docs](https://docs.livekit.io)
- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## What's Next?

1. **Create your avatar assets** - This is the most important step
2. **Test in Test Mode** - Verify everything works
3. **Try LiveKit** - Connect and test real-time features
4. **Customize** - Adjust emotions, lip sync, etc.
5. **Deploy** - Build and launch your app

Good luck with your talking avatar system! 🚀
