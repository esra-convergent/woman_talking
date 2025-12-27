#!/bin/bash

# Install LiveKit bitHuman avatar plugin
echo "📦 Installing LiveKit avatar plugin (bitHuman)..."
uv add "livekit-agents[bithuman]~=1.3"

echo "✅ Avatar plugin installed!"
echo ""
echo "🔑 Next steps:"
echo "1. Get BitHuman API key from: https://imaginex.bithuman.com/"
echo "2. Add to .env.local:"
echo "   BITHUMAN_API_SECRET=your-api-key-here"
echo ""
echo "3. Create an avatar in BitHuman console and get the avatar_id"
echo ""
echo "4. Run the agent with: python src/agent.py dev"
