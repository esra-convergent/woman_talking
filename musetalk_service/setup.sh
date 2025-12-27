#!/bin/bash

# MuseTalk Setup Script

echo "🚀 Setting up MuseTalk Lip-Sync Service..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install PyTorch with CUDA support (adjust based on your CUDA version)
echo "⚙️ Installing PyTorch with CUDA..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install other dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Clone MuseTalk repository
echo "📥 Cloning MuseTalk repository..."
if [ ! -d "MuseTalk" ]; then
    git clone https://github.com/TMElyralab/MuseTalk.git
fi

cd MuseTalk

# Download pretrained models
echo "⬇️ Downloading pretrained models..."
mkdir -p models
cd models

# Download MuseTalk model weights
if [ ! -f "musetalk.pth" ]; then
    echo "Downloading MuseTalk model..."
    wget -O musetalk.pth https://huggingface.co/TMElyralab/MuseTalk/resolve/main/musetalk/pytorch_model.bin
fi

# Download VAE model
if [ ! -f "sd-vae-ft-mse" ]; then
    echo "Downloading VAE model..."
    git clone https://huggingface.co/stabilityai/sd-vae-ft-mse
fi

# Download DWPose model for head pose estimation
if [ ! -f "dwpose" ]; then
    echo "Downloading DWPose..."
    mkdir -p dwpose
    cd dwpose
    wget https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.onnx
    cd ..
fi

cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Activate the virtual environment: source musetalk_service/venv/bin/activate"
echo "2. Run the service: python musetalk_service/livekit_musetalk.py"
