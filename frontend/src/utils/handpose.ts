import * as handpose from "@tensorflow-models/handpose";
import "@tensorflow/tfjs-backend-webgl";

// Types
export type HandPose = "thumbs_up" | "thumbs_down" | "flat_hand" | null;
export type Landmark = [number, number];
export type Landmarks = Landmark[];

// Load the handpose model
export const loadHandposeModel = async (): Promise<any> => {
  try {
    const model = await handpose.load();
    console.log("Handpose model loaded successfully");
    return model;
  } catch (err) {
    console.error("Failed to load handpose model:", err);
    throw new Error("Could not load hand pose detection model");
  }
};

// Detect hand pose from landmarks
export const detectHandPoseFromLandmarks = (landmarks: Landmarks): HandPose => {
  if (!landmarks || landmarks.length < 21) return null;

  try {
    // Get key points
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // Validate key points
    if (
      !thumbTip ||
      !thumbBase ||
      !indexTip ||
      !middleTip ||
      !ringTip ||
      !pinkyTip ||
      !wrist
    ) {
      return null;
    }

    // Calculate finger extensions
    const thumbExtended = isFingerExtended(thumbTip, thumbBase, wrist);
    const indexExtended = isFingerExtended(indexTip, landmarks[6], wrist);
    const middleExtended = isFingerExtended(middleTip, landmarks[10], wrist);
    const ringExtended = isFingerExtended(ringTip, landmarks[14], wrist);
    const pinkyExtended = isFingerExtended(pinkyTip, landmarks[18], wrist);

    // Check for thumb down specifically
    const isThumbDown = isThumbPointingDown(thumbTip, thumbBase, wrist);

    // Detect poses
    // Thumbs up (only thumb extended)
    if (
      thumbExtended &&
      !indexExtended &&
      !middleExtended &&
      !ringExtended &&
      !pinkyExtended &&
      !isThumbDown
    ) {
      return "thumbs_up";
    }

    // Thumbs down (thumb pointing down)
    if (isThumbDown) {
      return "thumbs_down";
    }

    // Flat hand (all fingers extended)
    if (
      thumbExtended &&
      indexExtended &&
      middleExtended &&
      ringExtended &&
      pinkyExtended
    ) {
      return "flat_hand";
    }
  } catch (err) {
    console.error("Error in detectHandPoseFromLandmarks:", err);
  }

  return null;
};

// Helper function to determine if a finger is extended
const isFingerExtended = (
  tip: Landmark,
  middle: Landmark,
  wrist: Landmark
): boolean => {
  try {
    // Calculate the angle between the finger and the palm
    const fingerVector = [tip[0] - middle[0], tip[1] - middle[1]];
    const palmVector = [middle[0] - wrist[0], middle[1] - wrist[1]];

    // Calculate dot product
    const dotProduct =
      fingerVector[0] * palmVector[0] + fingerVector[1] * palmVector[1];

    // Calculate magnitudes
    const fingerMagnitude = Math.sqrt(
      fingerVector[0] * fingerVector[0] + fingerVector[1] * fingerVector[1]
    );
    const palmMagnitude = Math.sqrt(
      palmVector[0] * palmVector[0] + palmVector[1] * palmVector[1]
    );

    // Avoid division by zero
    if (fingerMagnitude === 0 || palmMagnitude === 0) {
      return false;
    }

    // Calculate angle
    const angle = Math.acos(dotProduct / (fingerMagnitude * palmMagnitude));

    // Finger is extended if angle is less than 90 degrees
    return angle < Math.PI / 2;
  } catch (err) {
    console.error("Error in isFingerExtended:", err);
    return false;
  }
};

// Helper function to determine if thumb is pointing down
const isThumbPointingDown = (
  thumbTip: Landmark,
  thumbBase: Landmark,
  wrist: Landmark
): boolean => {
  try {
    // Method 1: Angle-based detection
    // Calculate the vector from wrist to thumb base
    const wristToBaseVector = [
      thumbBase[0] - wrist[0],
      thumbBase[1] - wrist[1],
    ];

    // Calculate the vector from thumb base to thumb tip
    const baseToTipVector = [
      thumbTip[0] - thumbBase[0],
      thumbTip[1] - thumbBase[1],
    ];

    // Calculate dot product
    const dotProduct =
      wristToBaseVector[0] * baseToTipVector[0] +
      wristToBaseVector[1] * baseToTipVector[1];

    // Calculate magnitudes
    const wristToBaseMagnitude = Math.sqrt(
      wristToBaseVector[0] * wristToBaseVector[0] +
        wristToBaseVector[1] * wristToBaseVector[1]
    );
    const baseToTipMagnitude = Math.sqrt(
      baseToTipVector[0] * baseToTipVector[0] +
        baseToTipVector[1] * baseToTipVector[1]
    );

    // Avoid division by zero
    if (wristToBaseMagnitude === 0 || baseToTipMagnitude === 0) {
      return false;
    }

    // Calculate angle
    const angle = Math.acos(
      dotProduct / (wristToBaseMagnitude * baseToTipMagnitude)
    );

    // Method 2: Position-based detection
    // Check if thumb tip is below the wrist (higher y value in image coordinates)
    const isThumbBelowWrist = thumbTip[1] > wrist[1];

    // Method 3: Vertical movement detection
    // Check if thumb is pointing downward by comparing y-coordinates
    const thumbPointingDownward = thumbTip[1] > thumbBase[1];

    // Combine all methods for more robust detection
    // Thumb is pointing down if:
    // 1. The angle is greater than 100 degrees OR
    // 2. The thumb tip is below the wrist AND the thumb is pointing downward
    return (
      angle > (5 * Math.PI) / 9 || (isThumbBelowWrist && thumbPointingDownward)
    );
  } catch (err) {
    console.error("Error in isThumbPointingDown:", err);
    return false;
  }
};
