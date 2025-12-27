# MuseTalk Integration Guide

## 🎯 Goal
Add real-time lip-sync to your idle video using MuseTalk when the agent speaks.

---

## 📋 Prerequisites

### Hardware Requirements:
- **NVIDIA GPU** with at least 6GB VRAM (RTX 3060 or better)
- CUDA 11.8 or 12.1 installed
- 16GB+ system RAM

### Software Requirements:
- Python 3.10 or 3.11
- FFmpeg installed
- Git

---

## 🚀 Installation Steps

### Step 1: Install MuseTalk

```bash
cd /home/esra/woman_talks/musetalk_service

# Run setup script
./setup.sh

# This will:
# - Create virtual environment
# - Install PyTorch with CUDA
# - Clone MuseTalk repository
# - Download pretrained models (~5GB)
```

**Expected time:** 15-30 minutes (depending on internet speed)

---

### Step 2: Verify GPU Access

```bash
source musetalk_service/venv/bin/activate
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

**Expected output:** `CUDA available: True`

If False, you need to:
1. Install NVIDIA drivers
2. Install CUDA toolkit
3. Reinstall PyTorch with correct CUDA version

---

### Step 3: Test MuseTalk Standalone

Before integrating with LiveKit, test MuseTalk works:

```bash
cd musetalk_service/MuseTalk

# Test with example
python inference.py \
  --video_path ../../public/idle-avatar.mp4 \
  --audio_path test_audio.wav \
  --output_path output.mp4
```

This should generate `output.mp4` with lip-synced video.

---

## 🔧 Integration Architecture

### Current Flow:
```
User speaks → Agent (STT) → GPT-4 → TTS → Audio plays in browser
                                              ↓
                                         Idle video loops
```

### New Flow with MuseTalk:
```
User speaks → Agent (STT) → GPT-4 → TTS → Audio
                                              ↓
                                         MuseTalk Service
                                              ↓
                                    Lip-synced video frames
                                              ↓
                                    LiveKit video track → Browser
```

---

## 🎬 Implementation Options

### Option A: Server-Side Rendering (Recommended)

**Pros:**
- Best quality
- Uses GPU efficiently
- No browser performance impact

**Cons:**
- Requires GPU server
- ~200-500ms latency
- Higher server costs

**How it works:**
1. Python agent generates TTS audio
2. MuseTalk service receives audio via LiveKit data channel
3. Generates lip-synced video in real-time
4. Streams video back via LiveKit video track
5. Browser displays video instead of idle loop

---

### Option B: Pre-generate Common Responses

**Pros:**
- Zero latency for common phrases
- Lower GPU usage
- Cheaper to run

**Cons:**
- Only works for predictable responses
- Need to generate many clips
- Storage intensive

**How it works:**
1. Pre-generate lip-synced videos for common agent responses
2. Store in `/public/responses/` folder
3. Agent selects appropriate video based on response
4. Stream pre-rendered video when available
5. Fallback to idle video for dynamic responses

---

### Option C: Hybrid Approach (Best Balance)

Combine both:
- Use pre-generated for common responses (greetings, confirmations)
- Use real-time MuseTalk for dynamic content
- Smart caching of recently generated clips

---

## 🔨 Implementation Steps (Option A)

### Step 1: Update Python Agent

Modify `/home/esra/woman_talks/python_agent/src/agent.py`:

```python
from livekit import rtc

class VoiceAgent:
    def __init__(self):
        # ... existing code ...
        self.video_source = rtc.VideoSource(1280, 720, 30)
        self.musetalk_service = MuseTalkService()

    async def handle_tts_audio(self, audio_data: bytes):
        """When TTS generates audio, create lip-sync video"""

        # Generate lip-synced frames
        video_frames = await self.musetalk_service.generate(
            reference_frame=self.idle_frame,
            audio_data=audio_data
        )

        # Stream video frames
        for frame in video_frames:
            video_frame = rtc.VideoFrame(
                width=frame.shape[1],
                height=frame.shape[0],
                type=rtc.VideoBufferType.RGBA,
                data=frame.tobytes()
            )
            self.video_source.capture_frame(video_frame)
```

---

### Step 2: Update Frontend to Receive Video

Modify `/home/esra/woman_talks/src/components/VoiceAgent.tsx`:

```typescript
// Listen for agent's video track
useEffect(() => {
  if (!isConnected || !isAgentJoined) return;

  const handleTrackSubscribed = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => {
    // Handle VIDEO track from agent
    if (track.kind === Track.Kind.Video) {
      console.log('Subscribed to agent video track');

      const videoElement = track.attach();
      videoElement.style.width = '100%';
      videoElement.style.borderRadius = '12px';

      // Replace idle video with agent's lip-synced video
      const container = videoRef.current?.parentElement;
      if (container) {
        container.appendChild(videoElement);
        if (videoRef.current) {
          videoRef.current.style.display = 'none';
        }
      }
    }
  };

  room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
}, [isConnected, isAgentJoined, room]);
```

---

## ⚡ Performance Optimization

### 1. Reduce Latency
```python
# In MuseTalk service
config = {
    'batch_size': 1,  # Process frame-by-frame for lower latency
    'use_half': True,  # FP16 for faster inference
    'max_frames': 150,  # Limit video length
}
```

### 2. GPU Memory Management
```python
import torch

# Clear cache between generations
torch.cuda.empty_cache()

# Use autocast for mixed precision
with torch.cuda.amp.autocast():
    output = model(input)
```

### 3. Frame Rate Adaptation
```python
# Generate at 15fps, interpolate to 30fps
output_fps = 15  # Lower for faster generation
display_fps = 30  # Interpolate for smooth playback
```

---

## 🧪 Testing Checklist

- [ ] MuseTalk installed successfully
- [ ] GPU detected (`torch.cuda.is_available()` returns True)
- [ ] Standalone test works (generates output.mp4)
- [ ] LiveKit video track publishes
- [ ] Frontend receives video track
- [ ] Lip-sync quality is acceptable
- [ ] Latency is under 500ms
- [ ] No GPU memory errors during long conversations

---

## 🔍 Troubleshooting

### Issue: "CUDA out of memory"
**Solution:**
```python
# Reduce batch size or video resolution
config['batch_size'] = 1
config['video_size'] = (640, 480)  # Lower resolution
```

### Issue: "Video frames dropping"
**Solution:**
```python
# Increase buffer size
rtc.TrackPublishOptions(
    video_codec='h264',
    video_encoding_options={
        'maxBitrate': 2000000,  # 2Mbps
    }
)
```

### Issue: "Lip-sync is out of sync"
**Solution:**
- Check audio sample rate matches (16kHz)
- Verify video FPS is consistent
- Add timestamp-based synchronization

---

## 💰 Cost Considerations

### Cloud GPU Options:

**RunPod:**
- RTX 3090: $0.44/hour
- RTX 4090: $0.69/hour
- Good for testing

**Lambda Labs:**
- A100 (40GB): $1.10/hour
- Best performance

**AWS EC2 g5.xlarge:**
- ~$1.00/hour
- Production-ready

**Recommendation:** Start with RunPod for testing, move to AWS for production.

---

## 📊 Performance Benchmarks

Expected performance on RTX 3090:
- Generate time: ~100-200ms per second of audio
- Total latency: 200-500ms (including network)
- GPU memory: ~4-6GB
- Concurrent users: 2-3 per GPU

---

## 🎯 Next Steps

1. **Run setup.sh** to install MuseTalk
2. **Test standalone** to verify it works
3. **Choose integration option** (A, B, or C)
4. **Implement** based on chosen option
5. **Test end-to-end** with your agent
6. **Optimize** for production

Ready to start? Let me know if you want to proceed with Option A (real-time) or Option C (hybrid)!
