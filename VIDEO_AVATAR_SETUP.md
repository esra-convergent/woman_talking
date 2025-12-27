# Video-Based Avatar Setup Guide

## ✅ What We've Done

1. **Replaced Canvas/Image approach** with video-based idle animation
2. **Removed** old canvas renderer, lip-sync image switching code
3. **Kept** audio detection to show "Speaking..." indicator
4. **Ready** for your 6-second idle video loop

---

## 📋 Next Steps

### Step 1: Add Your Video File

Place your 6-second idle animation video in the `/public` folder:

```bash
/home/esra/woman_talks/public/idle-avatar.mp4
```

**Supported formats:**
- MP4 (H.264) - Best compatibility
- WebM - Good for modern browsers
- MOV - Works but larger file size

**Current filename expected:** `idle-avatar.mp4`

If your video has a different name, update line 364 in `src/components/VoiceAgent.tsx`:

```tsx
src="/your-video-name.mp4"
```

---

### Step 2: Test the Setup

1. Make sure your token server is running:
```bash
pnpm run server
```

2. Start the React dev server:
```bash
pnpm run dev
```

3. Open http://localhost:3000
4. Click "Voice AI" tab
5. Click "Start Conversation"

**What you should see:**
- ✅ Your idle video playing on loop (breathing, blinking, micro-movements)
- ✅ When agent speaks, "🎤 Speaking..." indicator appears
- ✅ Audio plays from the agent

---

## 🎯 Current Features

✅ **Idle Animation**
- Video loops continuously
- Natural breathing, blinking visible
- Micro head movements preserved from your video

✅ **Audio Detection**
- Detects when agent is speaking
- Shows "Speaking..." indicator overlay

✅ **LiveKit Integration**
- Real-time audio streaming
- Agent connection working
- Microphone enabled

---

## 🚀 Next Phase: Real-Time Lip-Sync

After confirming the idle video works, we'll add real-time lip-sync using one of these approaches:

### Option A: MuseTalk (Recommended)
- Python service that generates talking video from audio
- Takes your idle video frame + agent's audio → outputs lip-synced video
- Streams back via LiveKit video track
- **Best quality**, requires GPU server

### Option B: Web-based Morph
- Use Canvas API to morph mouth region in browser
- Lighter weight, runs client-side
- **Faster setup**, lower quality than MuseTalk

### Option C: Pre-rendered Clips + Smart Switching
- Generate common phrase videos offline
- Switch between clips based on sentiment
- Fallback to idle for dynamic responses
- **Hybrid approach**, good for predictable conversations

---

## 📝 File Changes Made

### Modified Files:
- `src/components/VoiceAgent.tsx` - Replaced canvas with video element
- Removed references to `AvatarRenderer`, `LipSyncEngine`
- Kept audio analysis for speaking detection

### Unchanged Files:
- `src/App.tsx` - No changes needed
- `server/simple-server.ts` - Token generation still works
- `python_agent/` - Agent still functional

---

## 🐛 Troubleshooting

**Video not playing:**
- Check file exists: `ls /home/esra/woman_talks/public/idle-avatar.mp4`
- Check browser console for errors
- Try clicking the video area to trigger autoplay

**No audio from agent:**
- Verify Python agent is running
- Check agent joined: Look for "Agent joined" in console
- Check volume levels in browser

**Video stutters:**
- Compress video file (target: <5MB)
- Use H.264 codec for better performance
- Reduce resolution if needed (720p is usually enough)

---

## 💡 Optimizing Your Video

For best results, your idle video should be:
- **Duration:** 6-10 seconds (long enough to not feel repetitive)
- **Resolution:** 720p or 1080p max
- **Format:** MP4 with H.264 codec
- **File size:** Under 5MB for fast loading
- **Content:** Person looking at camera with:
  - Natural breathing (chest/shoulders movement)
  - Periodic blinks (2-3 times in the loop)
  - Micro head movements (slight nods, tilts)
  - Neutral/friendly expression
  - Good lighting, stable framing

**FFmpeg command to optimize:**
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -vf "scale=1280:720" -an idle-avatar.mp4
```

This creates a web-optimized version at 720p without audio.

---

## 📞 What to Tell Me Next

Once you've added your video file, let me know:
1. ✅ "Video is playing" - I'll help add lip-sync next
2. ❌ "Video isn't showing" - Share the filename and any console errors
3. 🤔 "Video is too big/stuttering" - I'll help optimize it

Then we can proceed to **Phase 2: Real-Time Lip-Sync** with MuseTalk or another approach!
