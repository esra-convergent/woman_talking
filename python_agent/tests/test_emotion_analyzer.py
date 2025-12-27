"""Tests for emotion analyzer module."""

import pytest

from emotion_analyzer import EmotionAnalyzer, analyze_emotion


class TestEmotionAnalyzer:
    """Test cases for EmotionAnalyzer class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = EmotionAnalyzer()

    def test_detect_happy_emotion(self):
        """Test detection of happy emotions."""
        text = "I'm so happy and excited about this!"
        assert self.analyzer.analyze(text) == "happy"

    def test_detect_sad_emotion(self):
        """Test detection of sad emotions."""
        text = "I'm feeling really sad and down today"
        assert self.analyzer.analyze(text) == "sad"

    def test_detect_angry_emotion(self):
        """Test detection of angry emotions."""
        text = "I'm so angry and frustrated with this situation"
        assert self.analyzer.analyze(text) == "angry"

    def test_detect_anxious_emotion(self):
        """Test detection of anxious emotions."""
        text = "I'm really worried and stressed about the deadline"
        assert self.analyzer.analyze(text) == "anxious"

    def test_detect_grateful_emotion(self):
        """Test detection of grateful emotions."""
        text = "Thank you so much, I really appreciate your help"
        assert self.analyzer.analyze(text) == "grateful"

    def test_detect_surprised_emotion(self):
        """Test detection of surprised emotions."""
        text = "Wow, that's amazing! I can't believe it!"
        assert self.analyzer.analyze(text) == "surprised"

    def test_detect_neutral_emotion(self):
        """Test detection of neutral/no emotion."""
        text = "The meeting is scheduled for tomorrow at 3pm"
        assert self.analyzer.analyze(text) == "neutral"

    def test_empty_text_returns_neutral(self):
        """Test that empty text returns neutral."""
        assert self.analyzer.analyze("") == "neutral"
        assert self.analyzer.analyze(None) == "neutral"

    def test_case_insensitive_detection(self):
        """Test that emotion detection is case insensitive."""
        text_upper = "I'M SO HAPPY!"
        text_lower = "i'm so happy!"
        text_mixed = "I'm So HaPpY!"

        assert self.analyzer.analyze(text_upper) == "happy"
        assert self.analyzer.analyze(text_lower) == "happy"
        assert self.analyzer.analyze(text_mixed) == "happy"

    def test_priority_of_emotions(self):
        """Test that first matching emotion is returned when multiple keywords present."""
        # Angry keywords should be detected before other emotions
        text = "I'm angry but also a bit sad"
        assert self.analyzer.analyze(text) == "angry"

    def test_get_emotion_description(self):
        """Test emotion descriptions."""
        assert "Happy" in self.analyzer.get_emotion_description("happy")
        assert "Sad" in self.analyzer.get_emotion_description("sad")
        assert "Angry" in self.analyzer.get_emotion_description("angry")
        assert "Neutral" in self.analyzer.get_emotion_description("neutral")

    def test_analyze_emotion_convenience_function(self):
        """Test the module-level convenience function."""
        text = "I'm so grateful for your help!"
        assert analyze_emotion(text) == "grateful"


class TestEmotionKeywords:
    """Test specific keyword detection."""

    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = EmotionAnalyzer()

    @pytest.mark.parametrize("text,expected_emotion", [
        ("This is fucking annoying", "angry"),
        ("I hate this situation", "angry"),
        ("I'm feeling terrible today", "sad"),
        ("I'm crying because I'm so sad", "sad"),
        ("I'm scared and nervous", "anxious"),
        ("This is stressing me out", "anxious"),
        ("I love this so much!", "happy"),
        ("This is excellent work", "happy"),
        ("Thank you for everything", "grateful"),
        ("I really appreciate it", "grateful"),
        ("OMG that's incredible!", "surprised"),
        ("No way, really?", "surprised"),
    ])
    def test_keyword_detection(self, text, expected_emotion):
        """Test detection of various emotion keywords."""
        assert self.analyzer.analyze(text) == expected_emotion
