# Quick Start Guide

Get your live talking avatar running in 5 minutes.

## Step 1: Install Dependencies (1 min)

```bash
pnpm install
```

## Step 2: Create Avatar Assets (2 mins)

You have two options:

### Option A: Use Placeholder (Fastest - for testing)

Create simple colored rectangles as placeholders to test the system:

```bash
# We'll use ImageMagick to create placeholder images
# Install ImageMagick if needed: sudo apt install imagemagick

cd public/avatars/default

# Create base head (blue circle)
convert -size 512x512 xc:transparent -fill "#4A90E2" -draw "circle 256,256 256,100" head.png

# Create eyes
convert -size 512x512 xc:transparent -fill black -draw "circle 200,200 200,180 circle 312,200 312,180" eyes-open.png
convert -size 512x512 xc:transparent -fill black -draw "line 180,200 220,200 line 292,200 332,200" eyes-closed.png

# Create mouth shapes (simple ovals of different sizes)
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "ellipse 256,350 60,80 0,360" mouth-A.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "line 220,340 292,340" mouth-B.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "ellipse 256,350 40,30 0,360" mouth-C.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "ellipse 256,350 35,25 0,360" mouth-D.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "ellipse 256,350 30,40 0,360" mouth-E.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "ellipse 256,350 35,20 0,360" mouth-F.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "ellipse 256,350 40,25 0,360" mouth-G.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "ellipse 256,350 45,35 0,360" mouth-H.png
convert -size 512x512 xc:transparent -fill "#E94B3C" -draw "line 220,340 292,340" mouth-X.png

cd ../../..
```

### Option B: Use Your Avatar Image (Best quality)

1. Place your avatar image in `public/avatars/default/`
2. Follow the [AVATAR_CREATION_GUIDE.md](AVATAR_CREATION_GUIDE.md)
3. Create the 13 required PNG files

## Step 3: Start Development Server (30 seconds)

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 4: Connect to LiveKit (1 min)

### For Testing: Use LiveKit Playground

1. Go to [LiveKit Playground](https://livekit.io/cloud)
2. Sign up for free account
3. Create a new project
4. Go to "Settings" → "Keys"
5. Generate a token with these settings:
   - Room name: `test-room`
   - Participant identity: `your-name`
   - Permissions: All enabled

6. Copy the WebSocket URL (looks like: `wss://your-project.livekit.cloud`)
7. Copy the access token

8. Paste both into the app's connection form

9. Click "Connect"

## Step 5: Test Your Avatar

1. Allow microphone access when prompted
2. Say "Hello world"
3. Watch your avatar's mouth move
4. Try different emotions: "I'm so happy!" or "Oh no, that's terrible"

## Troubleshooting

### Avatar doesn't show
- Check browser console (F12) for errors
- Verify all 13 PNG files exist in `public/avatars/default/`
- Make sure files are named correctly (case-sensitive)

### No lip sync
- Check microphone permissions in browser
- Verify LiveKit connection (green dot)
- Try speaking louder

### Can't connect to LiveKit
- Verify the WebSocket URL starts with `wss://`
- Check that your token isn't expired
- Make sure your LiveKit project is active

## Next Steps

- Customize avatar images with your own art
- Adjust emotion detection sensitivity
- Add more phoneme shapes for better lip sync
- Deploy to production

## Advanced: Local LiveKit Server

For development without cloud dependency:

```bash
# Run local LiveKit server with Docker
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  livekit/livekit-server --dev

# Use these connection settings:
# URL: ws://localhost:7880
# Token: (generate using LiveKit CLI or SDK)
```

## Need Help?

Check the main [README.md](README.md) for detailed documentation.
