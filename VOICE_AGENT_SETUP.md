# Voice AI Agent Setup Guide

This guide will help you set up real-time voice conversation with your animated avatar using LiveKit's built-in STT and TTS.

## Overview

Your setup includes:
- **Python Agent** with LiveKit's built-in STT (AssemblyAI) and TTS (Cartesia)
- **React Frontend** with animated Ready Player Me avatar
- **Token Server** for secure LiveKit connections
- **LiveKit Cloud** for real-time communication

## Step 1: Start the Token Server

The token server generates secure access tokens for your React app to connect to LiveKit.

```bash
# In the project root directory
pnpm run server
```

You should see:
```
🚀 Token server running on http://localhost:3001
📡 LiveKit server: wss://emotion-test-k1t69r4e.livekit.cloud
```

Keep this terminal open.

## Step 2: Start the Python Agent

The Python agent connects to LiveKit and provides AI voice conversation capabilities.

```bash
# In a new terminal, navigate to the python_agent directory
cd python_agent

# Make sure your virtual environment is activated
source .venv/bin/activate  # On Linux/Mac
# OR
.venv\Scripts\activate     # On Windows

# Run the agent
python src/agent.py start
```

You should see:
```
✅ Emotion hooks registered
🔊 Voice-only mode (no avatar)
Agent connected to LiveKit
```

The agent uses:
- **STT**: AssemblyAI Universal Streaming (no API key needed - included with LiveKit)
- **TTS**: Cartesia Sonic-3 (no API key needed - included with LiveKit)
- **LLM**: OpenAI GPT-4.1-mini (requires OPENAI_API_KEY in .env.local)

Keep this terminal open.

## Step 3: Start the React App

```bash
# In a new terminal, in the project root directory
pnpm run dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

## Step 4: Use the Voice Agent

1. Open your browser to `http://localhost:5173`
2. Click the "Voice AI" tab (default)
3. Click "Start Conversation"
4. Allow microphone access when prompted
5. Wait for the agent to join (you'll see "Agent: ✅ Active")
6. Start speaking to the AI!

The avatar will:
- Animate its mouth based on the agent's speech
- Show emotional reactions based on what you say
- Respond in real-time using AI

## Architecture

### How it Works

```
User speaks → Browser (microphone) → LiveKit Cloud → Python Agent
                                                            ↓
                                                    (STT → LLM → TTS)
                                                            ↓
Python Agent → LiveKit Cloud → Browser → Avatar Animation
```

### Components

1. **React App** ([src/components/VoiceAgent.tsx](src/components/VoiceAgent.tsx))
   - Captures user audio via microphone
   - Sends to LiveKit room
   - Receives agent's audio
   - Animates avatar based on audio analysis
   - Displays emotions from agent

2. **Token Server** ([server/simple-server.ts](server/simple-server.ts))
   - Generates LiveKit access tokens
   - Uses credentials from [python_agent/.env.local](python_agent/.env.local)

3. **Python Agent** ([python_agent/src/agent.py](python_agent/src/agent.py))
   - Listens to user's speech via LiveKit
   - Converts speech to text (STT)
   - Processes with AI (LLM)
   - Converts response to speech (TTS)
   - Analyzes emotions and sends to frontend
   - All using LiveKit's built-in services!

## Troubleshooting

### "Failed to connect to voice agent"
- Make sure the token server is running (`pnpm run server`)
- Check that [python_agent/.env.local](python_agent/.env.local) has valid LiveKit credentials

### "Waiting for agent..."
- Make sure the Python agent is running (`cd python_agent && python src/agent.py start`)
- Check the Python agent terminal for errors
- Verify OPENAI_API_KEY is set in [python_agent/.env.local](python_agent/.env.local)

### "No audio from agent"
- Check your browser's audio permissions
- Make sure the agent successfully joined (check status indicators)
- Look for errors in browser console (F12)

### Avatar not animating
- The avatar animates based on audio analysis
- Make sure the agent is speaking (check for "🎤 Speaking..." indicator)
- Verify avatar assets are loaded correctly

### Microphone not working
- Allow microphone permissions in your browser
- Check browser console for WebRTC errors
- Try refreshing the page

## Environment Variables

All configuration is in [python_agent/.env.local](python_agent/.env.local):

```bash
# LiveKit Cloud Connection
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# OpenAI for LLM (required)
OPENAI_API_KEY=your-openai-key

# Optional: BitHuman Avatar (currently disabled)
ENABLE_AVATAR=false
```

## Customization

### Change the AI's Voice

Edit [python_agent/src/agent.py](python_agent/src/agent.py:104):

```python
tts=inference.TTS(
    model="cartesia/sonic-3",
    voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"  # Change this voice ID
),
```

Browse voices at: https://docs.livekit.io/agents/models/tts/

### Change the AI's Personality

Edit [python_agent/src/agent.py](python_agent/src/agent.py:33):

```python
instructions="""You are a helpful voice AI assistant..."""
```

### Change STT Language

Edit [python_agent/src/agent.py](python_agent/src/agent.py:98):

```python
stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
```

## No API Keys Needed!

The best part: LiveKit provides built-in STT and TTS services, so you don't need:
- ✅ AssemblyAI API key (STT is included)
- ✅ Cartesia API key (TTS is included)
- ❌ You only need OpenAI API key for the LLM

## Next Steps

- Try different voices and personalities
- Add custom tools/functions to the agent
- Enable the BitHuman avatar for server-side rendering
- Customize the avatar's emotional responses

Enjoy your voice AI assistant!
