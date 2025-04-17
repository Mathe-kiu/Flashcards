# Specification: Flashcard Application Enhancements

**Version:** 1.0
**Date:** 2023-10-27

## 1. Overview

This document outlines the requirements for enhancing an existing Modified-Leitner flashcard system application. The application currently consists of a Node.js/Express backend and a corresponding frontend (details assumed based on provided backend files).

The primary goals of this enhancement phase are:

1.  **Browser Extension:** Implement a browser extension allowing users to quickly create flashcards from highlighted text on webpages, utilizing an LLM for generating the card front.
2.  **Hand Gesture Input:** Integrate webcam-based hand gesture recognition (using TensorFlow.js) into the frontend's practice session, allowing users to indicate answer difficulty ("Wrong", "Hard", "Easy") via gestures as an alternative to mouse clicks.
3.  **Persistence:** Implement basic file-based persistence for the application state (cards, buckets, history, day) to survive server restarts.

## 2. Existing System Baseline

- **Backend:** Node.js/Express application (`server.ts`) implementing the Modified-Leitner algorithm (`logic/algorithm.ts`).
- **State Management:** In-memory state (`state.ts`) holding `currentBuckets` (Map), `practiceHistory` (Array), and `currentDay` (number).
- **Core API Endpoints:**
  - `GET /api/practice`: Get cards for the current day.
  - `POST /api/update`: Update a card's bucket based on difficulty.
  - `GET /api/hint`: Get a hint for a card.
  - `GET /api/progress`: Get learning statistics.
  - `POST /api/day/next`: Advance the simulation day.
  - `POST /api/cards`: Add a new card manually (this will be slightly modified).

## 3. Feature: Browser Extension for Card Creation

### 3.1. Purpose

Allow users to quickly create new flashcards by highlighting text on any webpage. The highlighted text becomes the 'back' of the card, and an LLM generates the 'front'.

### 3.2. Workflow & UI

1.  **Highlight & Trigger:** User highlights text on a webpage. An extension button (e.g., in the context menu or toolbar) becomes available.
2.  **Initiate Creation:** User clicks the extension button.
3.  **Extension UI:** The extension displays a small loading indicator.
4.  **Backend Call 1 (`/api/cards/prepare`):** The extension sends the highlighted text (as `backText`) to a _new_ backend endpoint: `POST /api/cards/prepare`.
5.  **Backend Processing (`prepare`):**
    - The backend receives `backText`.
    - **Duplicate Check:** It checks if any existing flashcard in the _current state_ has the exact same `back` content.
    - **If Duplicate Found:** The backend responds immediately with a specific status indicating a duplicate (e.g., HTTP 409 Conflict or a JSON response `{ "status": "duplicate" }`).
    - **If Not Duplicate:**
      - The backend constructs a prompt using the template: `"Generate a short question or keyword for which the following text is the answer: [highlighted text]"`.
      - It calls the configured LLM API with this prompt.
      - **LLM Error Handling:** If the LLM call fails (timeout, API error, etc.), the backend responds with an error status (e.g., HTTP 500 or `{ "status": "llm_error", "message": "..." }`).
      - **LLM Success:** If the LLM call succeeds, the backend receives the generated 'front' text. It responds to the extension with the generated `front` and the original `back` (e.g., HTTP 200 OK with JSON `{ "front": "Generated Front", "back": "Highlighted Back" }`).
6.  **Extension UI Update:**
    - **On Duplicate:** The extension hides the loader and displays a notification: "Card already exists". The process ends.
    - **On LLM Error:** The extension hides the loader and displays an error message (e.g., "Error: Could not generate card front"). Two buttons are shown:
      - "Retry Generation": Re-triggers step 4.
      - "Enter Front Manually": Proceeds to step 7, but the 'front' field will be empty.
    - **On Success:** The extension hides the loader and displays a form.
7.  **Card Review Form (Extension UI):**
    - Displays the generated 'front' text (editable input field).
    - Displays the original highlighted 'back' text (editable input field).
    - Provides an input field for an optional 'hint' (string).
    - Provides a _single_ text input field for optional 'tags', where users type comma-separated values (e.g., "noun,german,topicA").
    - Provides a "Save Card" button.
8.  **Save Card:** User reviews/edits the fields and clicks "Save Card".
9.  **Backend Call 2 (`/api/cards`):** The extension sends the final `front`, `back`, `hint` (optional), and `tags` (optional, sent as an array of strings derived from the comma-separated input) to the _existing_ backend endpoint: `POST /api/cards`.
10. **Backend Processing (`cards`):** The backend receives the card data, creates a `Flashcard` object, adds it to bucket 0 in the state, and persists the state change (see Section 6). It responds with success (e.g., HTTP 201 Created).
11. **Extension UI Final:** Displays a success message (e.g., "Card saved!") and closes the form/UI.

### 3.3. Backend Requirements (Extension Support)

- Implement the new endpoint `POST /api/cards/prepare`.
  - Requires LLM API integration (key stored securely on the backend, not in extension).
  - Implement duplicate check logic (comparing only the `back` property).
  - Implement robust error handling for LLM calls.
- Modify the existing `POST /api/cards` endpoint:
  - Accept optional `hint` (string) and `tags` (array of strings) in the request body.
  - Store these properties on the created `Flashcard` object.

## 4. Feature: Hand Gesture Input

### 4.1. Purpose

Allow users to answer flashcards during practice sessions using hand gestures captured via webcam, as an alternative to clicking buttons.

### 4.2. Technology

- **Library:** TensorFlow.js Hand Pose Detection.

### 4.3. Workflow & UI (Frontend Practice Session)

1.  **Session Start:** When a practice session begins (`/api/practice` is called and cards are loaded).
2.  **Webcam Activation Attempt:** The frontend automatically attempts to access and activate the user's webcam.
3.  **Activation Failure:**
    - If activation fails (no camera, permission denied), display an error message (e.g., "Webcam activation failed: [Reason]").
    - Present two buttons:
      - "Try Again": Re-attempts webcam activation.
      - "Continue without Webcam": Dismisses the error and allows the session to proceed using _only_ the mouse-click buttons for difficulty selection.
    - The practice session **must be paused** (card interaction disabled) while this error/choice is displayed.
4.  **Activation Success:** Display the webcam feed in a designated area of the practice UI.
5.  **Card Display:** Display the flashcard (front side).
6.  **Reveal Back:** User reveals the card back (e.g., by clicking the card).
7.  **Ready Signal:** User clicks a "Ready to Answer" button.
8.  **Gesture Detection Active:**
    - The frontend starts processing the webcam feed using TensorFlow.js Hand Pose Detection.
    - Display a visual indicator (e.g., a small spinner icon overlaid on a corner of the webcam feed) to show processing is active.
9.  **Gesture Recognition & Confirmation:**
    - The system continuously analyzes the feed for one of the target gestures:
      - **Thumbs Down** -> `AnswerDifficulty.Wrong`
      - **Flat Hand** (palm towards camera assumed) -> `AnswerDifficulty.Hard`
      - **Thumbs Up** -> `AnswerDifficulty.Easy`
    - When a target gesture is confidently detected:
      - Provide immediate visual feedback: Highlight the corresponding difficulty button (Wrong/Hard/Easy) and/or show an icon of the recognized gesture.
      - Start a 3-second timer. The user must **continuously hold** this _specific_ gesture.
      - **Gesture Change/Lost:** If the gesture changes or is lost (detection fails) during the 3 seconds, **reset the timer** and remove the visual feedback. Restart detection.
      - **Hold Success:** If the gesture is held continuously for 3 seconds, register the corresponding `AnswerDifficulty`.
10. **Process Answer:**
    - Immediately call the backend `POST /api/update` endpoint with the card details and the recognized `AnswerDifficulty`.
    - Remove gesture feedback and the processing indicator.
    - Automatically advance to display the next card in the practice set.
11. **Hint Interaction:**
    - A standard "Hint" button remains available.
    - Clicking "Hint" fetches and displays the hint via `GET /api/hint`.
    - After viewing the hint, the user **must click "Ready to Answer" again** (Step 7) to initiate gesture detection for that card.
12. **Fallback Input:** The original mouse-click buttons for "Wrong", "Hard", and "Easy" **must remain visible and functional** throughout the session, providing an alternative input method even when the webcam is active.

### 4.4. Frontend Requirements

- Integrate TensorFlow.js Hand Pose Detection library.
- Implement webcam access logic, including permission requests and error handling.
- Modify practice UI:
  - Add webcam feed display area.
  - Add "Ready to Answer" button.
  - Implement the spinner/processing indicator.
  - Implement gesture visual feedback (button highlights, icons).
  - Implement the 3-second hold logic and timer reset.
- Connect gesture results to the `/api/update` call.
- Ensure smooth flow between hint usage and re-activating gesture detection.
- Handle the "Continue without Webcam" flow gracefully, disabling gesture-related UI elements.

## 5. Backend Persistence

### 5.1. Mechanism

- Use file-based persistence.
- Save the entire application state (buckets, history, current day) to a single JSON file.

### 5.2. File Details

- **Filename:** `flashcard_state.json`
- **Location:** Root directory of the backend project.

### 5.3. Load on Startup

- When the backend server starts, it **must** check if `flashcard_state.json` exists in the root directory.
- If the file exists, load its content (parse JSON) and initialize the `currentBuckets`, `practiceHistory`, and `currentDay` variables in `state.ts` from the file's data, **overriding** any default initial values.
- Handle potential errors during file reading or JSON parsing (e.g., log an error and fall back to default initial state).

### 5.4. Save on Shutdown

- The backend server **must** listen for graceful shutdown signals (e.g., `SIGINT`, `SIGTERM`).
- When such a signal is received, **before exiting the process**, the server must:
  - Serialize the current state (`currentBuckets`, `practiceHistory`, `currentDay`) into JSON format.
  - Write this JSON data to the `flashcard_state.json` file, overwriting its previous content.
- **Data Loss Acknowledgement:** It is understood and accepted that any state changes occurring since the last successful startup _will be lost_ if the server terminates unexpectedly (crash, `kill -9`, power loss). Saving occurs _only_ on graceful shutdown.

### 5.5. Backend Requirements

- Implement state serialization logic (convert `Map<number, Set<Flashcard>>`, `PracticeRecord[]`, `number` to a JSON-compatible structure). `Set`s will need conversion to Arrays for JSON.
- Implement state deserialization logic (convert loaded JSON back into the correct `Map`, `Set`, Array, and number types).
- Add file system logic (Node.js `fs` module) to read and write the state file.
- Implement signal listeners (`process.on('SIGINT', ...)`, `process.on('SIGTERM', ...)`) to trigger the save operation during shutdown.

## 6. Technology Stack Summary

- **Backend:** Node.js, Express, TypeScript
- **Frontend:** Assumed JavaScript/TypeScript framework (e.g., React, Vue, Angular), HTML, CSS
- **Gesture Recognition:** TensorFlow.js Hand Pose Detection
- **Persistence:** JSON file storage via Node.js `fs` module
- **LLM:** Integration with a chosen LLM provider API (e.g., OpenAI, Google Gemini) via backend calls.
- **Browser Extension:** Standard WebExtensions API (for Chrome, Firefox, etc.)

## 7. Testing Plan

### 7.1. Unit Tests (Backend)

- Test state serialization/deserialization functions.
- Test LLM prompt generation logic.
- Test duplicate check logic in `/api/cards/prepare`.
- Test tag parsing logic (comma-separated string to array).

### 7.2. Integration Tests (Backend)

- Test `POST /api/cards/prepare` endpoint:
  - Success case (no duplicate, LLM success).
  - Duplicate card case.
  - LLM failure case.
- Test modified `POST /api/cards` endpoint (with hint/tags).
- Test persistence:
  - Start server -> Make changes -> Shutdown gracefully -> Verify file content.
  - Start server with existing file -> Verify state is loaded correctly.
- Test `POST /api/update` (no functional change, but ensure it still works with persisted state).

### 7.3. End-to-End (E2E) / Manual Tests

- **Browser Extension:**
  - Test highlighting and triggering the extension on various websites.
  - Verify loader display.
  - Verify duplicate card notification.
  - Verify LLM error handling (error message, Retry, Manual Entry buttons).
  - Verify successful generation and form display.
  - Test editing `front`/`back` in the form.
  - Test adding hints and tags (verify format).
  - Verify successful card saving and appearance in practice sessions.
- **Hand Gesture Input:**
  - Test automatic webcam activation prompt/success.
  - Test activation failure flow ("Try Again", "Continue without Webcam").
  - Test clicking "Ready to Answer".
  - Test processing indicator visibility.
  - Test recognition of each gesture (Thumbs Up/Down, Flat Hand).
  - Verify visual feedback (highlight/icon).
  - Verify 3-second hold requirement and timer reset on change/loss.
  - Verify correct difficulty mapping and `/api/update` call.
  - Verify automatic advance to the next card.
  - Test using the Hint button followed by gesture input ("Ready to Answer" re-click).
  - Test using fallback mouse clicks when webcam is active/inactive.
  - Test performance/CPU usage during gesture detection.
  - Test under varying lighting conditions and backgrounds.
- **Persistence:**
  - Perform operations (add cards, practice, advance day) -> Restart server gracefully -> Verify state is maintained.
  - Simulate crash (if possible) -> Restart server -> Verify state reverts to last saved point (or initial if never saved).

---

This specification provides a detailed roadmap for implementing the requested features. Ensure clear communication between frontend and backend development regarding API contracts and expected behaviors.
