import asyncio
import json
import logging
import os
import time
from typing import TYPE_CHECKING, Optional

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    llm,
    room_io,
    APIConnectOptions,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Import avatar plugin
try:
    from livekit.plugins import bithuman
    AVATAR_AVAILABLE = True
except ImportError:
    AVATAR_AVAILABLE = False
    print("⚠️  BitHuman plugin not installed. Run: uv add 'livekit-agents[bithuman]~=1.3'")

from emotion_analyzer import analyze_emotion

logger = logging.getLogger("agent")

load_dotenv(".env.local")


class Assistant(Agent):
    def __init__(self, ctx: Optional[JobContext] = None) -> None:
        super().__init__(
            instructions="""You are a helpful voice AI assistant. The user is interacting with you via voice, even if you perceive the conversation as text.
            You eagerly assist users with their questions by providing information from your extensive knowledge.
            Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
            You are curious, friendly, and have a sense of humor.""",
        )
        self.ctx = ctx


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


async def send_emotion_data(room: rtc.Room, emotion: str, source: str, text: str):
    """Send emotion data to the frontend via participant attributes."""
    data = {
        "type": "emotion",
        "emotion": emotion,
        "source": source,  # "user" or "agent"
        "text": text[:100],  # Send snippet of text for debugging
        # Send timestamp in milliseconds (JS Date expects ms)
        "timestamp": int(time.time() * 1000),
        "confidence": 1.0,  # Add confidence field
    }

    # Send via participant attributes (not data channel)
    emotion_json = json.dumps(data)
    await room.local_participant.set_attributes({"emotion": emotion_json})
    logger.info(f"📤 Sent emotion via attributes: {emotion} ({source}) - {text[:50]}")


@server.rtc_session()
async def my_agent(ctx: JobContext):
    # Logging setup
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline with optimized TTS settings
    session = AgentSession(
        stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
            # Optimize for lower latency
            sample_rate=16000,  # Match BitHuman's expected rate (critical!)
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    # Set up emotion analysis hooks
    logger.info("Setting up emotion analysis hooks...")

    @session.on("conversation_item_added")
    def on_conversation_item(event):
        """Handle new conversation items - analyze ONLY user messages for agent's emotional reaction."""
        message = event.item

        # Only process ChatMessage items with text content
        if not hasattr(message, 'content') or not message.content:
            return

        role = message.role  # "user" or "assistant"

        # ONLY analyze user messages - skip agent's own responses
        if role == "assistant":
            logger.debug(f"⏭️  Skipping agent's own message")
            return

        # Extract transcript
        content = message.content
        if isinstance(content, list):
            transcript = ' '.join(str(part) for part in content)
        else:
            transcript = str(content)

        logger.info(f"🎭 USER said: {transcript[:50]}")

        if transcript.strip():
            emotion = analyze_emotion(transcript)
            logger.info(f"🎭 Agent's REACTION emotion: {emotion}")
            # Send emotion as 'agent' source
            asyncio.create_task(send_emotion_data(ctx.room, emotion, "agent", transcript))

    logger.info("✅ Emotion hooks registered")

    # ==========================================
    # AVATAR INTEGRATION
    # ==========================================
    avatar_enabled = os.getenv("ENABLE_AVATAR", "false").lower() == "true"

    if avatar_enabled and AVATAR_AVAILABLE:
        logger.info("🎭 Avatar mode ENABLED - setting up BitHuman avatar...")

        # Get avatar configuration from environment
        avatar_id = os.getenv("BITHUMAN_AVATAR_ID")

        if not avatar_id:
            logger.warning("⚠️  BITHUMAN_AVATAR_ID not set in .env.local - avatar disabled")
        else:
            try:
                # Step 2: EXTREME low-latency environment variables
                # These MUST be set BEFORE creating AvatarSession
                os.environ.setdefault("OUTPUT_WIDTH", "720")           # Even lower res for max speed
                os.environ.setdefault("COMPRESS_METHOD", "NONE")       # No compression
                os.environ.setdefault("PROCESS_IDLE_VIDEO", "False")   # Skip idle frames
                os.environ.setdefault("OUTPUT_BUFFER_SIZE", "1")       # EXTREME: minimal buffering
                os.environ.setdefault("INPUT_BUFFER_SIZE", "0")        # No audio buffering
                os.environ.setdefault("NUM_THREADS", "-1")             # Auto-detect CPU cores

                logger.info("⚡ EXTREME low-latency settings applied:")
                logger.info(f"   OUTPUT_WIDTH=720, COMPRESS_METHOD=NONE, BUFFERS=1/0, THREADS=AUTO")

                # Step 1: Create optimized connection options
                conn_options = APIConnectOptions(
                    max_retry=5,           # More retries for stability
                    retry_interval=1.5,    # Faster retry interval
                    timeout=20.0,          # Reasonable timeout
                )

                # Create avatar session with optimizations
                avatar = bithuman.AvatarSession(
                    avatar_id=avatar_id,
                    model="essence",       # 20-30% faster than "expression"
                    conn_options=conn_options,
                )

                logger.info(f"🎭 Starting avatar: {avatar_id} (essence model)")
                logger.info(f"⚡ Connection: 5 retries, 20s timeout")

                # Start the avatar - it will join the room as a participant
                await avatar.start(session, room=ctx.room)

                logger.info("✅ Avatar started successfully with optimizations!")
            except Exception as e:
                logger.error(f"❌ Failed to start avatar: {e}")
                logger.info("Falling back to voice-only mode")
    else:
        logger.info("🔊 Voice-only mode (no avatar)")

    # Start the session
    await session.start(
        agent=Assistant(ctx),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony()
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                else noise_cancellation.BVC(),
            ),
        ),
    )

    # Join the room
    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(server)
