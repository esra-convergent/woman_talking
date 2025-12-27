# Kaggle MuseTalk Setup Guide (100% Free)

## 🎯 Goal
Run MuseTalk on Kaggle's free GPU to generate lip-synced videos for your avatar.

---

## 📋 Step-by-Step Setup

### Step 1: Create Kaggle Account (5 min)

1. Go to [kaggle.com](https://www.kaggle.com)
2. Click "Register"
3. Sign up with Google/email
4. **Verify phone number** (required for GPU access)
   - Go to Settings → Phone Verification
   - Enter your phone number
   - Enter verification code

✅ You now have **30 hours/week of FREE GPU!**

---

### Step 2: Create New Notebook (2 min)

1. Click "Code" in top menu
2. Click "+ New Notebook"
3. **Important settings:**
   - Click "⚙️" (settings) on right side
   - **Accelerator:** GPU T4 x2
   - **Internet:** ON
   - **Persistence:** Files only
4. Click "Save Version"

---

### Step 3: Upload Your Files (3 min)

1. Click "+ Add Data" (top right)
2. Click "Upload" tab
3. Upload `idle-avatar.mp4` from `/home/esra/woman_talks/public/`
4. Wait for upload to complete
5. Note the path (e.g., `/kaggle/input/idle-avatar/idle-avatar.mp4`)

---

### Step 4: Copy Notebook Code (5 min)

**Option A: Upload the notebook**
1. Download `kaggle_musetalk_setup.ipynb` from this folder
2. In Kaggle, click "File" → "Import Notebook"
3. Upload the `.ipynb` file

**Option B: Copy-paste cells**
1. Open `kaggle_musetalk_setup.ipynb` in a text editor
2. Copy each cell's code
3. Paste into Kaggle notebook cells

---

### Step 5: Get LiveKit Credentials (2 min)

From your local machine:

```bash
cd /home/esra/woman_talks/python_agent
cat .env.local
```

Copy these values:
- `LIVEKIT_URL` (starts with `wss://`)
- `LIVEKIT_API_KEY` (starts with `API`)
- `LIVEKIT_API_SECRET` (long random string)

Paste them into **Cell 5** of the Kaggle notebook.

---

### Step 6: Run the Notebook (10-15 min)

Click "Run All" or run cells one by one:

**Cell 1:** Check GPU ✅ Should show "GPU Available: True"

**Cell 2:** Install packages (2-3 min)

**Cell 3:** Clone MuseTalk & download models (5-7 min)
- Downloads ~5GB
- Be patient!

**Cell 4:** Upload video verification

**Cell 5:** Test audio generation (30 sec)

**Cell 6:** Test MuseTalk standalone (2-3 min)
- Generates first lip-sync video
- Check output folder for result

**Cell 7-9:** LiveKit setup

**Cell 10:** Connect to LiveKit
- **Don't run this yet!** Read below first

---

## 🔧 Integration with Your App

### Current Flow:
```
User → Agent → TTS audio → Plays in browser
                              ↓
                         Idle video loops
```

### New Flow with Kaggle:
```
User → Agent → TTS audio → Send to Kaggle
                              ↓
                         MuseTalk generates video
                              ↓
                         LiveKit video track → Browser
```

---

## 🚀 How to Use

### Option 1: Manual Testing (Start Here)

1. **In Kaggle:** Run cells 1-6 to test MuseTalk works
2. **Generate test videos** with different audio
3. **Download generated videos** from output folder
4. **Add to** `/public/responses/` on your laptop
5. **Update frontend** to play appropriate video

**Perfect for:** Testing quality, trying different voices

---

### Option 2: Real-Time Integration

1. **In Kaggle:** Run all cells including LiveKit connection
2. **Kaggle listens** for agent audio via LiveKit
3. **Generates video** when agent speaks
4. **Streams back** to your React app

**Perfect for:** Live demos, production

---

## 💡 Pro Tips

### 1. Keep Kaggle Alive
Kaggle notebooks timeout after 1 hour of inactivity. To keep running:
```python
# Add this to a cell and run it
import time
while True:
    print(".", end="", flush=True)
    time.sleep(60)  # Print dot every minute
```

### 2. Save Generated Videos
```python
# In your notebook
from google.colab import files
files.download('/kaggle/working/output/result.mp4')
```

### 3. Optimize for Speed
Edit MuseTalk config for faster generation:
```python
# In cell before running inference
config = {
    'fps': 15,  # Lower FPS = faster
    'batch_size': 1,
    'use_half': True  # FP16 = faster
}
```

### 4. Monitor GPU Usage
```python
!nvidia-smi
```

---

## 📊 Performance Expectations

On Kaggle T4 GPU:
- **Setup time:** 10-15 minutes (first time only)
- **Generation time:** ~3-5 seconds per second of audio
- **Video quality:** Good (720p)
- **Latency:** 200-500ms (for real-time)

---

## 🐛 Troubleshooting

### "No GPU available"
➡️ Go to Settings → Accelerator → Select "GPU T4 x2"

### "Cannot access internet"
➡️ Settings → Internet → Turn ON

### "Phone verification required"
➡️ Settings → Phone Verification → Add number

### "MuseTalk models not downloading"
➡️ Check internet is ON
➡️ Try running cell again (sometimes Kaggle is slow)

### "Video generation fails"
➡️ Check video format (should be MP4)
➡️ Check video size (<100MB works best)
➡️ Try with test_audio.wav first

---

## 🎓 Learning Resources

**MuseTalk GitHub:**
https://github.com/TMElyralab/MuseTalk

**Kaggle GPU Docs:**
https://www.kaggle.com/docs/notebooks#gpu-usage

**LiveKit Python SDK:**
https://docs.livekit.io/guides/python/

---

## ⏱️ Timeline

**Today (2-3 hours):**
- ✅ Set up Kaggle account
- ✅ Upload notebook
- ✅ Test MuseTalk standalone
- ✅ Generate first lip-sync video

**Tomorrow:**
- ✅ Connect to LiveKit
- ✅ Test real-time generation
- ✅ Integrate with React app

**This Week:**
- ✅ Optimize performance
- ✅ Pre-generate common responses
- ✅ Implement hybrid approach

---

## 💰 Cost Breakdown

**Kaggle Free Tier:**
- 30 hours GPU/week = FREE
- Resets every Monday
- More than enough for development

**If you need more:**
- Kaggle doesn't offer paid plans
- Use RunPod: $0.44/hour (only when running)
- Or Google Colab Pro+: $50/month unlimited

---

## ✅ Success Checklist

Before moving to real-time:
- [ ] Kaggle account created & phone verified
- [ ] Notebook uploaded and GPU enabled
- [ ] MuseTalk installed successfully
- [ ] Test video generated looks good
- [ ] Idle video uploaded to Kaggle
- [ ] LiveKit credentials added to notebook
- [ ] Test connection to LiveKit works

---

## 🎉 You're Ready!

Follow the steps above and you'll have MuseTalk running on free Kaggle GPU.

**Next:** Once test video looks good, we'll integrate real-time streaming to your React app.

**Questions?** Just ask! 🚀
