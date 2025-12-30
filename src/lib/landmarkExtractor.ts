/**
 * Landmark Extraction Utility
 * Extracts facial landmarks from video frames using MediaPipe Face Mesh
 */

import { FaceMesh, Results } from '@mediapipe/face_mesh';

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface LandmarkExtractionResult {
  landmarks: FaceLandmark[];
  imageWidth: number;
  imageHeight: number;
}

export class LandmarkExtractor {
  private faceMesh: FaceMesh | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.isInitialized = true;
    console.log('✅ LandmarkExtractor initialized');
  }

  /**
   * Extract landmarks from a video frame or image element
   */
  async extractLandmarks(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<LandmarkExtractionResult | null> {
    if (!this.faceMesh || !this.isInitialized) {
      console.warn('FaceMesh not initialized yet');
      return null;
    }

    return new Promise((resolve) => {
      if (!this.faceMesh) {
        resolve(null);
        return;
      }

      this.faceMesh.onResults((results: Results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
          const landmarks = results.multiFaceLandmarks[0].map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
          }));

          resolve({
            landmarks,
            imageWidth: results.image.width,
            imageHeight: results.image.height,
          });
        } else {
          resolve(null);
        }
      });

      this.faceMesh.send({ image: source });
    });
  }

  /**
   * Extract landmarks from a video at a specific timestamp
   */
  async extractFromVideoAtTime(
    video: HTMLVideoElement,
    timeInSeconds: number
  ): Promise<LandmarkExtractionResult | null> {
    return new Promise((resolve) => {
      video.currentTime = timeInSeconds;

      const onSeeked = async () => {
        video.removeEventListener('seeked', onSeeked);
        const result = await this.extractLandmarks(video);
        resolve(result);
      };

      video.addEventListener('seeked', onSeeked);
    });
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.isInitialized = false;
  }
}
