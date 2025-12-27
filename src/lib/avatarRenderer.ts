import { AvatarLayers, AvatarState, Phoneme, Emotion } from '../types/avatar';

export class AvatarRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layers: AvatarLayers | null = null;
  private state: AvatarState;
  private animationFrameId: number | null = null;
  private blinkTimer: number = 0;
  private nextBlinkTime: number = this.randomBlinkInterval();
  private breathingOffset: number = 0;
  private startTime: number = Date.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.state = {
      currentPhoneme: 'X',
      currentEmotion: 'neutral',
      isBlinking: false,
      eyeOpenness: 1
    };
  }

  /**
   * Load avatar image layers
   */
  async loadAvatar(basePath: string): Promise<void> {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const [head, eyeOpen, eyeClosed, ...mouths] = await Promise.all([
        loadImage(`${basePath}/head.jpg`),
        loadImage(`${basePath}/eyes-open.jpg`),
        loadImage(`${basePath}/eyes-closed.jpg`),
        loadImage(`${basePath}/mouth-A.jpg`),
        loadImage(`${basePath}/mouth-B.jpg`),
        loadImage(`${basePath}/mouth-C.jpg`),
        loadImage(`${basePath}/mouth-D.jpg`),
        loadImage(`${basePath}/mouth-E.jpg`),
        loadImage(`${basePath}/mouth-F.jpg`),
        loadImage(`${basePath}/mouth-G.jpg`),
        loadImage(`${basePath}/mouth-H.jpg`),
        loadImage(`${basePath}/mouth-X.jpg`)
      ]);

      this.layers = {
        head,
        mouths: {
          'A': mouths[0],
          'B': mouths[1],
          'C': mouths[2],
          'D': mouths[3],
          'E': mouths[4],
          'F': mouths[5],
          'G': mouths[6],
          'H': mouths[7],
          'X': mouths[8]
        },
        eyes: {
          open: eyeOpen,
          closed: eyeClosed
        }
      };

      // Set canvas size to match head image
      this.canvas.width = head.width;
      this.canvas.height = head.height;

    } catch (error) {
      console.error('Failed to load avatar layers:', error);
      throw error;
    }
  }

  /**
   * Start rendering loop
   */
  start(): void {
    if (this.animationFrameId !== null) return;

    const render = (timestamp: number) => {
      this.update(timestamp);
      this.draw();
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  /**
   * Stop rendering
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update avatar state
   */
  setPhoneme(phoneme: Phoneme): void {
    this.state.currentPhoneme = phoneme;
  }

  setEmotion(emotion: Emotion): void {
    this.state.currentEmotion = emotion;
  }

  /**
   * Update animation state
   */
  private update(timestamp: number): void {
    // Handle blinking
    this.blinkTimer += 16; // ~60fps

    if (this.state.isBlinking) {
      this.state.eyeOpenness = Math.max(0, this.state.eyeOpenness - 0.3);
      if (this.state.eyeOpenness === 0) {
        this.state.isBlinking = false;
      }
    } else {
      this.state.eyeOpenness = Math.min(1, this.state.eyeOpenness + 0.3);

      // Trigger random blinks
      if (this.blinkTimer >= this.nextBlinkTime) {
        this.state.isBlinking = true;
        this.blinkTimer = 0;
        this.nextBlinkTime = this.randomBlinkInterval();
      }
    }

    // Calculate breathing animation (subtle up/down movement)
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.breathingOffset = Math.sin(elapsed * 0.5) * 2; // 2px up/down, slow breathing
  }

  /**
   * Render avatar to canvas
   */
  private draw(): void {
    if (!this.layers) {
      console.log('draw() called but no layers loaded');
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for transformations
    this.ctx.save();

    // Apply breathing animation (subtle vertical movement)
    this.ctx.translate(0, this.breathingOffset);

    // Draw base head layer
    this.ctx.drawImage(this.layers.head, 0, 0);

    // Draw eyes (open or closed based on blink state)
    const eyeImage = this.state.eyeOpenness > 0.5
      ? this.layers.eyes.open
      : this.layers.eyes.closed;
    this.ctx.drawImage(eyeImage, 0, 0);

    // Draw mouth based on current phoneme
    const mouthImage = this.layers.mouths[this.state.currentPhoneme];
    this.ctx.drawImage(mouthImage, 0, 0);

    // Restore context
    this.ctx.restore();

    // Debug: Show current phoneme in corner (temporary)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 150, 40);
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText(`Phoneme: ${this.state.currentPhoneme}`, 20, 38);
  }

  /**
   * Get random interval for next blink (2-6 seconds)
   */
  private randomBlinkInterval(): number {
    return 2000 + Math.random() * 4000;
  }

  /**
   * Get current state
   */
  getState(): AvatarState {
    return { ...this.state };
  }
}
