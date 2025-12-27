"""
MuseTalk LiveKit Service
Generates lip-synced video from audio in real-time
"""

import asyncio
import os
import numpy as np
import cv2
from pathlib import Path
from typing import Optional
import tempfile
import logging

from livekit import rtc, api
from livekit.agents import JobContext, WorkerOptions, cli, JobProcess
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(Path(__file__).parent.parent / "python_agent" / ".env.local")

# MuseTalk will be imported after setup
musetalk_inference = None


def load_musetalk():
    """Lazy load MuseTalk models"""
    global musetalk_inference
    if musetalk_inference is None:
        logger.info("Loading MuseTalk models...")
        # TODO: Import MuseTalk inference module after setup
        # from MuseTalk.musetalk.inference import MuseTalkInference
        # musetalk_inference = MuseTalkInference()
        logger.info("MuseTalk models loaded!")
    return musetalk_inference


class MuseTalkService:
    """Service to generate lip-synced video from audio"""

    def __init__(self, reference_video_path: str):
        self.reference_video_path = reference_video_path
        self.reference_frame = None
        self.musetalk = None

    async def initialize(self):
        """Initialize MuseTalk and load reference video"""
        logger.info(f"Initializing with reference video: {self.reference_video_path}")

        # Load reference video first frame
        cap = cv2.VideoCapture(self.reference_video_path)
        ret, frame = cap.read()
        if ret:
            self.reference_frame = frame
            logger.info(f"Reference frame loaded: {frame.shape}")
        cap.release()

        # Load MuseTalk model
        self.musetalk = load_musetalk()

    async def generate_video_from_audio(
        self,
        audio_data: bytes,
        sample_rate: int = 16000
    ) -> np.ndarray:
        """
        Generate lip-synced video frames from audio

        Args:
            audio_data: Raw audio bytes
            sample_rate: Audio sample rate

        Returns:
            numpy array of video frames
        """
        if self.musetalk is None:
            await self.initialize()

        # Save audio to temp file (MuseTalk expects file input)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            audio_path = f.name
            # Convert audio_data to WAV format
            # TODO: Use soundfile or pydub to save properly

        try:
            # Run MuseTalk inference
            # TODO: Call MuseTalk with reference frame and audio
            # video_frames = self.musetalk.inference(
            #     reference_frame=self.reference_frame,
            #     audio_path=audio_path
            # )

            # Placeholder: return reference frame repeated
            video_frames = np.array([self.reference_frame] * 10)

            return video_frames

        finally:
            # Cleanup temp file
            if os.path.exists(audio_path):
                os.unlink(audio_path)


async def entrypoint(ctx: JobContext):
    """Main entry point for LiveKit agent"""

    logger.info("MuseTalk agent started")

    # Path to idle video
    idle_video_path = str(Path(__file__).parent.parent / "public" / "idle-avatar.mp4")

    # Initialize MuseTalk service
    musetalk_service = MuseTalkService(idle_video_path)
    await musetalk_service.initialize()

    # Connect to room
    await ctx.connect()
    logger.info(f"Connected to room: {ctx.room.name}")

    # Publish video track
    video_source = rtc.VideoSource(1280, 720, 30)
    video_track = rtc.LocalVideoTrack.create_video_track("musetalk-video", video_source)
    video_publication = await ctx.room.local_participant.publish_track(
        video_track,
        rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_CAMERA)
    )
    logger.info("Video track published")

    # Play idle video loop in background
    async def stream_idle_video():
        """Stream idle video when not speaking"""
        cap = cv2.VideoCapture(idle_video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_duration = 1.0 / fps

        while True:
            ret, frame = cap.read()
            if not ret:
                # Loop back to start
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Create video frame
            video_frame = rtc.VideoFrame(
                width=frame_rgb.shape[1],
                height=frame_rgb.shape[0],
                type=rtc.VideoBufferType.RGBA,
                data=frame_rgb.tobytes()
            )

            # Capture frame to source
            video_source.capture_frame(video_frame)

            await asyncio.sleep(frame_duration)

    # Start idle video streaming
    idle_task = asyncio.create_task(stream_idle_video())

    # Listen for agent audio (TTS output) to generate lip-sync
    @ctx.room.on("track_subscribed")
    async def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info(f"Subscribed to audio track from {participant.identity}")

            # Check if this is the agent's TTS output
            if "agent" in participant.identity:
                # TODO: Capture audio, generate lip-sync video, switch from idle
                pass

    logger.info("MuseTalk agent running... Press Ctrl+C to stop")


if __name__ == "__main__":
    # Run the agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            request_fnc=JobProcess.accept_if_room_prefix("voice-chat-"),
        ),
    )
