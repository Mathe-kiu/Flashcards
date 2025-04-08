import React, { useEffect, useRef, useState } from "react";
import {
  HandPose,
  Landmarks,
  loadHandposeModel,
  detectHandPoseFromLandmarks,
} from "../utils/handpose";
import {
  drawHandLandmarks,
  setupCamera,
  stopCamera,
} from "../utils/handVisualizer";

interface HandPoseCameraProps {
  onPoseDetected?: (pose: HandPose) => void;
  width?: number;
  height?: number;
  holdTimeMs?: number;
}

const HandPoseCamera: React.FC<HandPoseCameraProps> = ({
  onPoseDetected,
  width = 300,
  height = 225,
  holdTimeMs = 3000,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPose, setCurrentPose] = useState<HandPose>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [lastPose, setLastPose] = useState<HandPose>(null);

  // Add refs for state values that need to be accessed in callbacks
  const isHoldingRef = useRef<boolean>(false);
  const lastPoseRef = useRef<HandPose>(null);
  const isCameraActiveRef = useRef<boolean>(false);

  // Update refs when state changes
  useEffect(() => {
    isHoldingRef.current = isHolding;
  }, [isHolding]);

  useEffect(() => {
    lastPoseRef.current = lastPose;
  }, [lastPose]);

  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load handpose model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await loadHandposeModel();
        modelRef.current = model;
        setIsModelReady(true);
        setDebugInfo("Model loaded successfully");
      } catch (err) {
        console.error("Failed to load handpose model:", err);
        setError("Could not load hand pose detection model");
        setDebugInfo("Model loading failed");
      }
    };

    loadModel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
      stopCamera(streamRef.current);
    };
  }, []);

  // Handle pose detection with hold timer
  const handlePoseDetection = (pose: HandPose) => {
    // Don't process poses if camera is not active
    if (!isCameraActiveRef.current) {
      return;
    }

    const currentTime = Date.now();

    // If no pose is detected, reset everything
    if (!pose) {
      if (isHoldingRef.current) {
        console.log("No pose detected, resetting state");
        setLastPose(null);
        setIsHolding(false);
        setHoldProgress(0);
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
      }
      return;
    }

    // Start or reset timer for any valid pose
    if (pose && (!isHoldingRef.current || pose !== lastPoseRef.current)) {
      console.log("Starting/resetting hold timer for pose:", pose);
      setLastPose(pose);
      setIsHolding(true);

      // Clear any existing timer
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      const startTime = currentTime;
      holdTimerRef.current = setInterval(() => {
        // Don't process if camera is not active
        if (!isCameraActiveRef.current) {
          if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          return;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / holdTimeMs, 1);
        setHoldProgress(progress);

        // If we've held long enough, trigger the pose
        if (progress >= 1) {
          console.log("Hold complete, triggering pose:", pose);
          if (onPoseDetected) {
            onPoseDetected(pose);
          }
          // Reset after triggering
          setIsHolding(false);
          setHoldProgress(0);
          if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
          }
        }
      }, 50);
    }
  };

  // Cleanup function to ensure all timers are cleared
  const cleanupTimers = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Reset all pose-related state
    setCurrentPose(null);
    setLastPose(null);
    setIsHolding(false);
    setHoldProgress(0);
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (isCameraActive) {
      // Stop camera
      cleanupTimers();
      stopCamera(streamRef.current);
      streamRef.current = null;
      setIsCameraActive(false);
    } else {
      // Start camera
      if (!videoRef.current) return;

      try {
        const stream = await setupCamera(videoRef.current);
        streamRef.current = stream;
        setIsCameraActive(true);
        setDebugInfo("Camera enabled, starting detection");
        startHandDetection();
      } catch (err) {
        console.error("Failed to access camera:", err);
        setError("Could not access camera. Please check permissions.");
        setDebugInfo("Camera access failed");
      }
    }
  };

  // Start hand detection
  const startHandDetection = () => {
    if (
      !isModelReady ||
      !modelRef.current ||
      !videoRef.current ||
      !canvasRef.current ||
      !isCameraActive
    ) {
      setDebugInfo("Detection prerequisites not met");
      return;
    }

    const detectHands = async () => {
      try {
        // Get video dimensions
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx || !video) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Detect hands
        const predictions = await modelRef.current.estimateHands(video);

        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw video frame again
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (predictions && predictions.length > 0) {
          setDebugInfo(`Hand detected: ${predictions.length} hand(s)`);

          // Process each detected hand
          for (const prediction of predictions) {
            if (!prediction.landmarks || !Array.isArray(prediction.landmarks)) {
              setDebugInfo("Invalid landmarks format");
              continue;
            }

            const landmarks = prediction.landmarks as Landmarks;

            // Debug: Log the first few landmarks
            // if (landmarks.length > 0) {
            //   console.log("First landmark:", landmarks[0]);
            // }

            // Draw hand landmarks with enhanced visualization
            drawHandLandmarks(ctx, landmarks, {
              pointColor: "#FF5252",
              pointRadius: 6,
              lineWidth: 3,
              fingerColors: {
                thumb: "#FF5252",
                index: "#4CAF50",
                middle: "#2196F3",
                ring: "#9C27B0",
                pinky: "#FF9800",
                palm: "#607D8B",
              },
            });

            // Detect hand pose
            const pose = detectHandPoseFromLandmarks(landmarks);
            setCurrentPose(pose);

            // Handle pose detection with hold timer
            handlePoseDetection(pose);
          }
        } else {
          setCurrentPose(null);
          setDebugInfo("No hands detected");

          // Reset hold timer if no hands detected
          if (isHoldingRef.current) {
            setIsHolding(false);
            setHoldProgress(0);
            if (holdTimerRef.current) {
              clearInterval(holdTimerRef.current);
              holdTimerRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error("Error detecting hand pose:", err);
        setDebugInfo(
          `Detection error: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Continue detection loop
      animationFrameRef.current = requestAnimationFrame(detectHands);
    };

    detectHands();
  };

  // Start detection when camera is activated
  useEffect(() => {
    if (isCameraActive && isModelReady) {
      startHandDetection();
    }

    return () => {
      cleanupTimers();
    };
  }, [isCameraActive, isModelReady]);

  // Render the countdown indicator
  const renderCountdownIndicator = () => {
    if (!isHolding || !currentPose) return null;

    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - holdProgress);

    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${radius * 2}px`,
          height: `${radius * 2}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={`${radius * 2}px`}
          height={`${radius * 2}px`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background circle */}
          <circle
            cx={radius}
            cy={radius}
            r={radius - 5}
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="5"
          />
          {/* Progress circle */}
          <circle
            cx={radius}
            cy={radius}
            r={radius - 5}
            fill="none"
            stroke={
              currentPose === "thumbs_up"
                ? "#4CAF50"
                : currentPose === "thumbs_down"
                ? "#F44336"
                : currentPose === "flat_hand"
                ? "#2196F3"
                : "#FFFFFF"
            }
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            fontSize: "14px",
            fontWeight: "bold",
            color: "white",
            textShadow: "0 0 3px rgba(0,0,0,0.5)",
          }}
        >
          {Math.ceil((1 - holdProgress) * (holdTimeMs / 1000))}s
        </div>
      </div>
    );
  };

  return (
    <div
      className="camera-container"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: "1px solid #ccc",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: isCameraActive ? "block" : "none",
        }}
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: isCameraActive ? "block" : "none",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      {!isCameraActive && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f0f0f0",
          }}
        >
          <button
            onClick={toggleCamera}
            className="btn btn-sm"
            disabled={!isModelReady}
          >
            {isModelReady ? "Enable Camera" : "Loading Model..."}
          </button>
        </div>
      )}
      {isCameraActive && (
        <div style={{ position: "absolute", bottom: "5px", right: "5px" }}>
          <button onClick={toggleCamera} className="btn btn-sm btn-danger">
            Disable
          </button>
        </div>
      )}
      {currentPose && (
        <div
          style={{
            position: "absolute",
            top: "5px",
            left: "5px",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {currentPose === "thumbs_up"
            ? "👍 Easy"
            : currentPose === "thumbs_down"
            ? "👎 Wrong"
            : currentPose === "flat_hand"
            ? "✋ Hard"
            : currentPose}
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            bottom: "5px",
            left: "5px",
            backgroundColor: "rgba(255,0,0,0.7)",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}
      {debugInfo && (
        <div
          style={{
            position: "absolute",
            top: "5px",
            right: "5px",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            maxWidth: "80%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {debugInfo}
        </div>
      )}
      {renderCountdownIndicator()}
    </div>
  );
};

export default HandPoseCamera;
