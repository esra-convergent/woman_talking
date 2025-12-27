# Quick Test Guide - Emotion Switching

## 🚀 Fast Start (3 Commands)

```bash
# 1. Start servers (3 terminals)
pnpm run server                    # Terminal 1
cd python_agent && python3 src/agent.py start  # Terminal 2
pnpm run dev                       # Terminal 3

# 2. Open browser
# Go to: http://localhost:3000

# 3. Test
# Click "Start Conversation"
# Say: "Act happy"
```

---

## 🎤 Voice Commands

| Say This | Avatar Does |
|----------|-------------|
| "Act happy" | Shows happy emotion |
| "Act sad" | Shows sad emotion |
| "Act angry" | Shows angry emotion |
| "Act surprised" | Shows surprised emotion |
| "Act thinking" | Shows thinking emotion |
| "Reset" | Returns to neutral |

---

## 👀 What to Look For

✅ **Top right corner** - Shows current emotion name
✅ **Smooth transition** - Video fades between emotions
✅ **Console logs** - `🎭 Switching emotion...`
✅ **Python logs** - `🎭 COMMAND DETECTED: happy`

---

## 🐛 Quick Fixes

**Not working?**

1. Check all 3 terminals are running
2. Refresh browser (Ctrl+R)
3. Check `/public/emotions/` has all 6 MP4 files
4. Try saying full phrase: "act happy" not just "happy"

---

## 📝 Current Status

**Videos:** All same for now (testing mode)
**Next:** Replace with real emotion videos

Done!
