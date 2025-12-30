/**
 * Image Warping Engine
 * Warps images using landmark-based Delaunay triangulation
 */

import Delaunator from 'delaunator';
import { FaceLandmark } from './landmarkExtractor';

export interface WarpConfig {
  width: number;
  height: number;
  sourceLandmarks: FaceLandmark[];
  targetLandmarks: FaceLandmark[];
}

/**
 * Warp an image from source landmarks to target landmarks
 */
export class ImageWarper {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private triangles: number[] = [];

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * Build Delaunay triangulation from landmarks
   */
  private buildTriangulation(landmarks: FaceLandmark[], width: number, height: number): number[] {
    // Convert normalized landmarks to pixel coordinates
    const points = landmarks.flatMap((lm) => [lm.x * width, lm.y * height]);

    // Add corner points to ensure entire image is covered
    const corners = [
      0, 0,           // top-left
      width, 0,       // top-right
      width, height,  // bottom-right
      0, height,      // bottom-left
    ];

    const allPoints = [...points, ...corners];

    // Compute Delaunay triangulation
    const delaunay = Delaunator.from(
      Array.from({ length: allPoints.length / 2 }, (_, i) => [
        allPoints[i * 2],
        allPoints[i * 2 + 1],
      ])
    );

    return Array.from(delaunay.triangles);
  }

  /**
   * Warp a video frame from source to target landmarks
   */
  warpFrame(
    sourceImage: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    sourceLandmarks: FaceLandmark[],
    targetLandmarks: FaceLandmark[],
    transitionProgress: number = 1.0 // 0 = source, 1 = target
  ): HTMLCanvasElement {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Validate inputs
    if (!sourceLandmarks || !targetLandmarks || sourceLandmarks.length === 0) {
      console.warn('Invalid landmarks provided to warpFrame');
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.drawImage(sourceImage, 0, 0, width, height);
      return this.canvas;
    }

    if (sourceLandmarks.length !== targetLandmarks.length) {
      console.warn('Landmark count mismatch:', sourceLandmarks.length, 'vs', targetLandmarks.length);
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.drawImage(sourceImage, 0, 0, width, height);
      return this.canvas;
    }

    try {
      // Interpolate landmarks based on transition progress
      const interpolatedLandmarks = sourceLandmarks.map((src, i) => {
        const tgt = targetLandmarks[i];
        return {
          x: src.x + (tgt.x - src.x) * transitionProgress,
          y: src.y + (tgt.y - src.y) * transitionProgress,
          z: src.z + (tgt.z - src.z) * transitionProgress,
        };
      });

      // Build triangulation (cached for performance)
      if (this.triangles.length === 0) {
        this.triangles = this.buildTriangulation(sourceLandmarks, width, height);
      }

      // Clear canvas with black background
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, width, height);

      // Convert landmarks to pixel coordinates
      const srcPoints = sourceLandmarks.map((lm) => ({ x: lm.x * width, y: lm.y * height }));
      const dstPoints = interpolatedLandmarks.map((lm) => ({ x: lm.x * width, y: lm.y * height }));

      // Add corners
      const corners = [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ];
      srcPoints.push(...corners);
      dstPoints.push(...corners);

      // Warp each triangle
      for (let i = 0; i < this.triangles.length; i += 3) {
        const i1 = this.triangles[i];
        const i2 = this.triangles[i + 1];
        const i3 = this.triangles[i + 2];

        // Safety check
        if (i1 >= srcPoints.length || i2 >= srcPoints.length || i3 >= srcPoints.length) {
          continue;
        }

        const srcTri = [srcPoints[i1], srcPoints[i2], srcPoints[i3]];
        const dstTri = [dstPoints[i1], dstPoints[i2], dstPoints[i3]];

        this.warpTriangle(sourceImage, srcTri, dstTri);
      }

      return this.canvas;
    } catch (err) {
      console.error('Error during warping:', err);
      // Fallback to original image
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.drawImage(sourceImage, 0, 0, width, height);
      return this.canvas;
    }
  }

  /**
   * Warp a single triangle using affine transformation
   */
  private warpTriangle(
    sourceImage: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    srcTri: { x: number; y: number }[],
    dstTri: { x: number; y: number }[]
  ) {
    // Calculate affine transform matrix
    const transform = this.getAffineTransform(srcTri, dstTri);
    if (!transform) return;

    this.ctx.save();

    // Create clipping path for destination triangle
    this.ctx.beginPath();
    this.ctx.moveTo(dstTri[0].x, dstTri[0].y);
    this.ctx.lineTo(dstTri[1].x, dstTri[1].y);
    this.ctx.lineTo(dstTri[2].x, dstTri[2].y);
    this.ctx.closePath();
    this.ctx.clip();

    // Apply transform and draw
    this.ctx.transform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      transform.e,
      transform.f
    );

    this.ctx.drawImage(sourceImage, 0, 0);

    this.ctx.restore();
  }

  /**
   * Calculate affine transformation matrix between two triangles
   */
  private getAffineTransform(
    srcTri: { x: number; y: number }[],
    dstTri: { x: number; y: number }[]
  ): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
    const [s0, s1, s2] = srcTri;
    const [d0, d1, d2] = dstTri;

    // Calculate transformation matrix
    const det =
      (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);

    if (Math.abs(det) < 1e-6) {
      return null; // Degenerate triangle
    }

    const invDet = 1 / det;

    const a =
      invDet *
      ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y));
    const b =
      invDet *
      ((d1.x - d0.x) * (s0.x - s2.x) + (d2.x - d0.x) * (s1.x - s0.x));
    const c =
      invDet *
      ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y));
    const d =
      invDet *
      ((d1.y - d0.y) * (s0.x - s2.x) + (d2.y - d0.y) * (s1.x - s0.x));
    const e =
      d0.x - a * s0.x - b * s0.y;
    const f =
      d0.y - c * s0.x - d * s0.y;

    return { a, b, c, d, e, f };
  }

  /**
   * Resize the warper canvas
   */
  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.triangles = []; // Clear cached triangulation
  }

  /**
   * Get the output canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
