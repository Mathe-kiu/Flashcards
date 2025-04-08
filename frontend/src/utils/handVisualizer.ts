import { Landmarks } from "./handpose";

// Draw hand landmarks on canvas
export const drawHandLandmarks = (
  ctx: CanvasRenderingContext2D,
  landmarks: Landmarks,
  options: {
    pointColor?: string;
    pointRadius?: number;
    lineColor?: string;
    lineWidth?: number;
    fingerColors?: { [key: string]: string };
  } = {}
): void => {
  if (!ctx || !landmarks || landmarks.length < 21) return;

  // Default options
  const {
    pointColor = "red",
    pointRadius = 5,
    lineColor = "blue",
    lineWidth = 2,
    fingerColors = {
      thumb: "#FF5252",
      index: "#4CAF50",
      middle: "#2196F3",
      ring: "#9C27B0",
      pinky: "#FF9800",
      palm: "#607D8B",
    },
  } = options;

  try {
    // Draw keypoints
    for (let i = 0; i < landmarks.length; i++) {
      const point = landmarks[i];
      if (!point || !Array.isArray(point) || point.length < 2) {
        console.warn(`Invalid landmark point at index ${i}:`, point);
        continue;
      }

      const [x, y] = point;

      // Draw point with glow effect
      ctx.shadowColor = pointColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
      ctx.fillStyle = pointColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Helper function to safely draw connections
    const drawConnection = (
      startIdx: number,
      endIdx: number,
      color: string = lineColor
    ) => {
      if (startIdx >= landmarks.length || endIdx >= landmarks.length) return;

      const startPoint = landmarks[startIdx];
      const endPoint = landmarks[endIdx];

      if (
        !startPoint ||
        !endPoint ||
        !Array.isArray(startPoint) ||
        !Array.isArray(endPoint) ||
        startPoint.length < 2 ||
        endPoint.length < 2
      ) {
        return;
      }

      const [x1, y1] = startPoint;
      const [x2, y2] = endPoint;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    // Draw connections with different colors for each finger
    ctx.lineWidth = lineWidth;

    // Thumb
    for (let i = 1; i < 5; i++) {
      drawConnection(i, i - 1, fingerColors.thumb);
    }

    // Index finger
    for (let i = 5; i < 9; i++) {
      drawConnection(i, i + 1, fingerColors.index);
    }

    // Middle finger
    for (let i = 9; i < 13; i++) {
      drawConnection(i, i + 1, fingerColors.middle);
    }

    // Ring finger
    for (let i = 13; i < 17; i++) {
      drawConnection(i, i + 1, fingerColors.ring);
    }

    // Pinky
    for (let i = 17; i < 21; i++) {
      drawConnection(i, i + 1, fingerColors.pinky);
    }

    // Palm
    for (let i = 0; i < 5; i++) {
      const startIdx = i * 4;
      const endIdx = (i * 4 + 4) % 21;
      drawConnection(startIdx, endIdx, fingerColors.palm);
    }

    // Add finger labels
    const fingerTips = [
      { idx: 4, label: "Thumb" },
      { idx: 8, label: "Index" },
      { idx: 12, label: "Middle" },
      { idx: 16, label: "Ring" },
      { idx: 20, label: "Pinky" },
    ];

    ctx.font = "12px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    for (const { idx, label } of fingerTips) {
      if (idx < landmarks.length) {
        const [x, y] = landmarks[idx];
        // Draw text background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(x - textWidth / 2 - 2, y - 20, textWidth + 4, 20);
        // Draw text
        ctx.fillStyle = "white";
        ctx.fillText(label, x, y - 8);
      }
    }
  } catch (err) {
    console.error("Error drawing hand landmarks:", err);
  }
};

// Setup camera
export const setupCamera = async (
  videoElement: HTMLVideoElement
): Promise<MediaStream> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });
    videoElement.srcObject = stream;
    return stream;
  } catch (err) {
    console.error("Failed to access camera:", err);
    throw new Error("Could not access camera. Please check permissions.");
  }
};

// Stop camera
export const stopCamera = (stream: MediaStream | null): void => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
};
