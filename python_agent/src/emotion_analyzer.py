"""
Emotion analysis module for voice AI agent.
Provides keyword-based emotion detection for POC implementation.
"""

import logging
from typing import Literal

logger = logging.getLogger("emotion_analyzer")

# Define emotion types
EmotionType = Literal["happy", "sad", "angry", "anxious", "surprised", "grateful", "neutral"]


class EmotionAnalyzer:
    """Simple keyword-based emotion classifier for POC."""

    # Emotion keyword mappings (order matters - more specific emotions first)
    EMOTION_KEYWORDS = {
        "angry": [
            "fuck", "angry", "hate", "mad", "pissed", "annoyed", "furious",
            "irritated", "rage", "frustrated", "damn", "shit"
        ],
        "sad": [
            "sad", "depressed", "down", "unhappy", "cry", "crying", "miserable",
            "disappointed", "upset", "terrible", "awful", "bad"
        ],
        "anxious": [
            "worried", "anxious", "scared", "afraid", "nervous", "concerned",
            "stress", "stressed", "panic", "fear", "overwhelming"
        ],
        "grateful": [
            "thank", "thanks", "appreciate", "grateful", "gratitude",
            "appreciated", "thankful"
        ],
        "surprised": [
            "wow", "surprised", "shocked", "incredible", "unbelievable",
            "omg", "no way", "can't believe"
        ],
        "happy": [
            "happy", "great", "awesome", "love", "excited", "amazing", "wonderful",
            "fantastic", "excellent", "good", "joy", "delighted", "pleased"
        ]
    }

    def analyze(self, text: str) -> EmotionType:
        """
        Analyze text and return detected emotion.

        Args:
            text: The text to analyze (user message or agent response)

        Returns:
            Detected emotion type (defaults to "neutral" if no emotion detected)
        """
        if not text:
            return "neutral"

        text_lower = text.lower()

        # Check for each emotion type (order matters - check negative emotions first)
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            if any(keyword in text_lower for keyword in keywords):
                logger.info(f"Detected emotion: {emotion} in text: '{text[:50]}...'")
                return emotion  # type: ignore

        logger.debug(f"No specific emotion detected, returning neutral for text: '{text[:50]}...'")
        return "neutral"

    def get_emotion_description(self, emotion: EmotionType) -> str:
        """Get a human-readable description of the emotion."""
        descriptions = {
            "happy": "Happy and positive",
            "sad": "Sad or disappointed",
            "angry": "Angry or frustrated",
            "anxious": "Anxious or worried",
            "surprised": "Surprised or amazed",
            "grateful": "Grateful or thankful",
            "neutral": "Neutral or calm"
        }
        return descriptions.get(emotion, "Unknown emotion")


# Singleton instance
_analyzer = EmotionAnalyzer()


def analyze_emotion(text: str) -> EmotionType:
    """
    Convenience function to analyze emotion in text.

    Args:
        text: The text to analyze

    Returns:
        Detected emotion type
    """
    return _analyzer.analyze(text)
