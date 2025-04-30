# Project TODO Checklist: Flashcard App Enhancements

This checklist follows the iterative steps defined in the implementation plan. Mark items as complete as you finish them.

## Phase 1: Backend Persistence

- [ ] **Step 1: State Serialization/Deserialization Helpers**
  - [] Create `test/stateSerialization.test.ts`.
  - [ ] Write unit tests for `serializeState` (Map/Set -> Plain Object).
  - [ ] Write unit tests for `deserializeState` (Plain Object -> Map/Set).
  - [ ] Include tests for empty state, populated state, and state with history.
  - [ ] Create `logic/stateSerialization.ts`.
  - [ ] Implement `serializeState` function.
  - [ ] Implement `deserializeState` function.
  - [ ] Define and export an interface for the serialized state structure.
  - [ ] Ensure all tests pass.
- [ ] **Step 2: File I/O for State**
  - [ ] Add tests to `test/stateSerialization.test.ts` for `saveStateToFile` and `loadStateFromFile`.
  - [ ] Test `saveStateToFile` writes correct JSON (mock `fs` or use temp files).
  - [ ] Test `loadStateFromFile` handles file found (valid JSON).
  - [ ] Test `loadStateFromFile` handles file not found.
  - [ ] Test `loadStateFromFile` handles corrupted JSON.
  - [ ] Implement `saveStateToFile` in `logic/stateSerialization.ts` (using `fs/promises`).
  - [ ] Implement `loadStateFromFile` in `logic/stateSerialization.ts` (using `fs/promises`).
  - [ ] Ensure all tests pass.
- [ ] **Step 3: Load State on Startup**
  - [ ] Import `loadStateFromFile` into `state.ts`.
  - [ ] Create `initializeState` async function in `state.ts`.
  - [ ] Implement logic in `initializeState` to call `loadStateFromFile`, update state variables, and log results/errors.
  - [ ] Handle file not found vs. other errors gracefully (log and use initial state).
  - [ ] Import `initializeState` into `server.ts`.
  - [ ] Modify `server.ts` startup sequence to `await initializeState()` before `app.listen()`.
  - [ ] Adjust logging in `server.ts` startup.
- [ ] **Step 4: Save State on Graceful Shutdown**
  - [ ] Import `saveStateToFile` and state getters into `server.ts`.
  - [ ] Define `handleShutdown` async function in `server.ts`.
  - [ ] Implement logic in `handleShutdown` to get current state, call `saveStateToFile`, log, and `process.exit()`.
  - [ ] Register `process.on('SIGINT', handleShutdown)` in `server.ts`.
  - [ ] Register `process.on('SIGTERM', handleShutdown)` in `server.ts`.
  - [ ] Add simple flag to prevent multiple simultaneous saves on shutdown.
- [ ] **Manual Test:** Verify persistence works (start -> make API changes -> stop with Ctrl+C -> restart -> check if changes persisted).

## Phase 2: Backend API for Browser Extension

- [ ] **Step 5: Modify `Flashcard` and `POST /api/cards` for Hint/Tags**
  - [ ] Update `Flashcard` class constructor (`logic/flashcards.ts`) for optional `hint`/`tags`.
  - [ ] Update `types/index.ts` if `Flashcard` is defined separately there.
  - [ ] Update `POST /api/cards` handler (`server.ts`) to accept optional `hint` (string) and `tags` (array) from `req.body`.
  - [ ] Pass `hint`/`tags` to `new Flashcard()` constructor.
  - [ ] Include `hint`/`tags` in the response JSON.
  - [ ] Update any existing tests for `POST /api/cards`.
- [ ] **Step 6: LLM Service Module**
  - [ ] Set up configuration (`config.ts` or `.env`) for `LLM_API_KEY` / `LLM_API_URL`. Ensure it's gitignored.
  - [ ] Create `logic/llmService.ts`.
  - [ ] Implement `generateFlashcardFront(backText)` async function.
  - [ ] Include prompt formatting as specified.
  - [ ] Implement LLM API call using `fetch` or `axios`.
  - [ ] Implement response parsing and robust error handling (network, API status codes).
  - [ ] Export the function.
  - [ ] (Recommended) Create `test/llmService.test.ts`.
  - [ ] (Recommended) Write unit tests mocking the HTTP requests for success/error cases.
- [ ] **Step 7: Implement `POST /api/cards/prepare` Endpoint**
  - [ ] Create `doesCardBackExist(backText)` helper in `state.ts`.
  - [ ] Add unit tests for `doesCardBackExist`.
  - [ ] Define `POST /api/cards/prepare` route in `server.ts`.
  - [ ] Implement the route handler (async).
  - [ ] Extract and validate `backText` from `req.body`.
  - [ ] Call `doesCardBackExist`. Respond if duplicate (e.g., 409).
  - [ ] If not duplicate, `try...catch` calling `generateFlashcardFront`.
  - [ ] Handle success response (200 OK with `{ front, back }`).
  - [ ] Handle LLM error response (e.g., 500/502 with `{ status: "llm_error" }`).
  - [ ] Add integration tests for `/api/cards/prepare` (mocking LLM service).
  - [ ] Test non-duplicate, duplicate, and LLM error scenarios.

## Phase 3: Browser Extension Frontend

- [ ] **Step 8: Basic Structure & Trigger**
  - [ ] Create `extension` directory.
  - [ ] Create `manifest.json` (V3, name, version, description, permissions: `contextMenus`, `activeTab`, `scripting`, `notifications`, background worker).
  - [ ] Create `background.js`.
  - [ ] Implement `chrome.runtime.onInstalled` listener to create context menu item.
  - [ ] Implement `chrome.contextMenus.onClicked` listener to log selected text.
  - [ ] Test loading the unpacked extension and triggering the context menu.
- [ ] **Step 9: API Call & Initial UI States**
  - [ ] Modify `background.js` (`onClicked`) to `fetch` POST `/api/cards/prepare`.
  - [ ] Include correct headers and body (`{ backText: selectedText }`).
  - [ ] Handle response statuses (409 duplicate, 200 OK, others for errors).
  - [ ] Parse JSON response on success.
  - [ ] Log appropriate messages ("Card exists", "Error generating", `{ front, back }`).
  - [ ] (Optional) Add `notifications` permission to manifest.
  - [ ] (Optional) Implement basic `chrome.notifications.create` for feedback.
- [ ] **Step 10: Card Review Form & Save Logic**
  - [ ] Decide UI pattern (Popup or Content Script).
  - [ ] Design/Implement HTML for the review form (`popup.html` or injected).
  - [ ] Include fields for front, back, hint, tags (comma-separated).
  - [ ] Include Save button (and potentially Retry/Manual buttons for errors).
  - [ ] Modify `background.js` to trigger UI display (e.g., store data, open popup/send message).
  - [ ] Implement UI script (`popup.js` or content script).
  - [ ] Retrieve state (front/back/error) on UI load.
  - [ ] Populate form fields.
  - [ ] Implement "Save Card" button logic:
    - [ ] Read form values.
    - [ ] Parse tags string to array.
    - [ ] `fetch` POST `/api/cards` with final data.
    - [ ] Show success/error message.
    - [ ] Close UI on success.
  - [ ] Implement Retry/Manual entry logic if applicable.
- [ ] **Manual Test:** Test the full extension flow: highlight -> trigger -> (handle duplicate/error) -> review form -> save -> verify card appears in main app practice.

## Phase 4: Frontend Gesture Recognition Integration

- [ ] **Step 11: Webcam Access & Error Handling**
  - [ ] Add `<video>` element to the practice view UI.
  - [ ] Implement `startWebcam` function in the component.
  - [ ] Use `navigator.mediaDevices.getUserMedia({ video: true })`.
  - [ ] Handle success: set video `srcObject`, play video, set `isWebcamActive` state.
  - [ ] Handle errors: catch specific errors, set error message state, set `isWebcamActive = false`.
  - [ ] Implement conditional UI rendering for error message, "Try Again", "Continue without Webcam" buttons.
  - [ ] Implement button logic ("Try Again" calls `startWebcam`, "Continue" sets `useWebcam = false`).
  - [ ] Call `startWebcam` on component mount / session start.
  - [ ] Implement session pause logic while error UI is displayed.
- [ ] **Step 12: TensorFlow.js Hand Pose Detection Setup**
  - [ ] Install TFJS dependencies (`@tensorflow/tfjs-core`, backend, `@tensorflow-models/hand-pose-detection`).
  - [ ] Import TFJS and model components.
  - [ ] Register TFJS backend.
  - [ ] Implement `loadHandPoseModel` async function.
  - [ ] Create detector using `handPoseDetection.createDetector`.
  - [ ] Store the loaded `detector` in component state/variable.
  - [ ] Call `loadHandPoseModel` after webcam successfully starts.
- [ ] **Step 13: Gesture Detection Loop & Basic Recognition**
  - [ ] Add "Ready to Answer" button to UI (conditional visibility).
  - [ ] Add state: `isDetecting`, `detectedGesture`.
  - [ ] Implement `startGestureDetection` async function.
  - [ ] Set `isDetecting = true`.
  - [ ] Show processing indicator UI element.
  - [ ] Start detection loop (`requestAnimationFrame` or `setInterval`).
  - [ ] Inside loop: check `isDetecting`, call `detector.estimateHands()`.
  - [ ] If hands detected, implement initial logic to identify Thumbs Up/Down/Flat Hand from landmarks.
  - [ ] Log detected gesture name.
  - [ ] Implement `stopGestureDetection` function (set `isDetecting = false`, hide indicator).
  - [ ] Wire "Ready" button click to `startGestureDetection`.
  - [ ] Ensure `stopGestureDetection` is called when appropriate (answer submitted, card changes).
- [ ] **Step 14: Gesture Confirmation (3-Second Hold) & Action**
  - [ ] Add state: `confirmingGesture`, `confirmStartTime`.
  - [ ] Modify detection loop:
    - [ ] If recognized gesture matches `confirmingGesture`, check timer (`>= 3000ms`).
    - [ ] On 3s success: call `stopGestureDetection`, map gesture to `AnswerDifficulty`, call card update function, ensure next card loads. Reset confirmation state.
    - [ ] If recognized gesture is new/different, update `confirmingGesture`, `confirmStartTime`. Trigger visual feedback UI.
    - [ ] If no gesture/hand lost, reset confirmation state and visual feedback.
  - [ ] Implement visual feedback UI (highlight button / show icon).
  - [ ] Integrate Hint flow: ensure `stopGestureDetection` is called, require "Ready" re-click.
  - [ ] Integrate Fallback buttons: ensure clicks call `stopGestureDetection`.
- [ ] **Manual Test:** Test gesture recognition thoroughly: activation, errors, different gestures, 3s hold, hint flow, fallback clicks, performance.

---

Good luck with the implementation! Remember to commit frequently after completing logical chunks within these steps.
