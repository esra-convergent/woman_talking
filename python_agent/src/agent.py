import asyncio
import json
import logging
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
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

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

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


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
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using OpenAI, Cartesia, AssemblyAI, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=inference.TTS(
            model="cartesia/sonic-3", voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"
        ),
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

    # Set up emotion analysis hooks - listen on conversation items
    logger.info("Setting up emotion analysis hooks...")

    def detect_emotion_command(text: str) -> Optional[str]:
        """Detect explicit emotion commands like 'act happy' or 'be sad'."""
        text_lower = text.lower()

        # Direct commands
        if "act happy" in text_lower or "be happy" in text_lower or "show happy" in text_lower:
            return "happy"
        elif "act sad" in text_lower or "be sad" in text_lower or "show sad" in text_lower:
            return "sad"
        elif "act angry" in text_lower or "be angry" in text_lower or "show angry" in text_lower:
            return "angry"
        elif "act surprised" in text_lower or "be surprised" in text_lower or "show surprised" in text_lower:
            return "surprised"
        elif "act thinking" in text_lower or "be thoughtful" in text_lower or "show thinking" in text_lower or "act idle" in text_lower:
            return "idle"
        elif "act neutral" in text_lower or "be neutral" in text_lower or "show neutral" in text_lower or "reset" in text_lower:
            return "neutral"

        return None

    @session.on("conversation_item_added")
    def on_conversation_item(event):
        """Handle new conversation items - analyze ONLY user messages for agent's emotional reaction."""
        message = event.item

        # Only process ChatMessage items with text content
        if not hasattr(message, 'content') or not message.content:
            return

        role = message.role  # "user" or "assistant"

        # ONLY analyze user messages - skip agent's own responses
        # The emoji represents the agent's REACTION to what the user says
        if role == "assistant":
            logger.debug(f"⏭️  Skipping agent's own message (not analyzing)")
            return

        # message.content can be a list or a string
        content = message.content
        if isinstance(content, list):
            # If it's a list, join all parts into a single string
            transcript = ' '.join(str(part) for part in content)
        else:
            transcript = str(content)

        logger.info(f"🎭 USER said: {transcript[:50]}")

        if transcript.strip():
            # First check for explicit emotion commands
            commanded_emotion = detect_emotion_command(transcript)

            if commanded_emotion:
                logger.info(f"🎭 COMMAND DETECTED: {commanded_emotion}")
                asyncio.create_task(send_emotion_data(ctx.room, commanded_emotion, "agent", transcript))
            else:
                # Otherwise use sentiment analysis
                emotion = analyze_emotion(transcript)
                logger.info(f"🎭 Agent's REACTION emotion: {emotion}")
                # Send emotion as 'agent' source - this is the agent's face reacting to user
                asyncio.create_task(send_emotion_data(ctx.room, emotion, "agent", transcript))

    logger.info("✅ Emotion hooks registered")

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Start the session, which initializes the voice pipeline and warms up the models
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

    # Join the room and connect to the user
    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(server)
