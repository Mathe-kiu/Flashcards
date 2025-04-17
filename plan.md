Okay, let's create a detailed blueprint and then break it down into iterative, testable steps, culminating in prompts for a code-generation LLM.

Project Blueprint

This blueprint outlines the major phases and components required to implement the features described in spec.md.

Phase 1: Backend Persistence

State Serialization/Deserialization: Create helper functions to convert the in-memory state (Map<number, Set<Flashcard>>, PracticeRecord[], number) into a JSON-serializable format (likely involving converting Sets to Arrays) and vice-versa.

File I/O: Implement functions to read the state from flashcard_state.json and write the state back to it.

Load on Startup: Modify the server startup sequence in server.ts to attempt loading state from the file. Include error handling for missing file or corrupted JSON.

Save on Shutdown: Implement graceful shutdown listeners (SIGINT, SIGTERM) in server.ts that trigger the state serialization and file writing process before the server exits.

Phase 2: Backend API for Browser Extension

LLM Service: Create a module/service responsible for interacting with the chosen LLM API. This should encapsulate API key management (via environment variables) and prompt formatting.

Modify POST /api/cards: Update the existing endpoint handler and potentially the Flashcard class/state.ts logic to accept and store optional hint and tags (as an array of strings).

Implement POST /api/cards/prepare:

Define the new route in server.ts.

Create the route handler function.

Implement logic to check for duplicate cards based only on the back text by querying the current state.

If not a duplicate, call the LLM Service to generate the front.

Handle responses: duplicate found, LLM error, success (return generated front and original back).

Phase 3: Browser Extension Frontend

Basic Structure: Set up the extension manifest (manifest.json), background scripts (if needed), and content scripts/popup UI. Define permissions (activeTab, storage, etc.).

Content Script/Trigger: Implement logic to detect text highlighting and provide a trigger mechanism (e.g., context menu item).

UI Flow:

On trigger, show a loading indicator.

Call the backend /api/cards/prepare.

Handle backend responses: show "duplicate" message, show error message with "Retry"/"Manual Entry" buttons, or show the card review form.

Card Review Form: Build the UI form with editable fields for front, back, hint, and a comma-separated tags input.

Save Logic: Implement the "Save Card" button functionality, which parses tags into an array and calls the backend /api/cards endpoint. Display success/failure feedback.

Phase 4: Frontend Gesture Recognition Integration (Existing App)

Webcam Integration:

Add UI element to display the webcam feed in the practice view.

Implement logic to request webcam permissions and stream the video feed.

Implement the specified error handling flow (display error, "Try Again", "Continue without Webcam", pausing the session).

TensorFlow.js Setup:

Integrate the TensorFlow.js library and the Hand Pose Detection model.

Load the model when the practice component mounts or when webcam access is granted.

Gesture Detection Loop:

Add the "Ready to Answer" button.

When clicked, start a loop that feeds webcam frames to the TFJS model.

Display the processing indicator.

Implement logic to analyze model output (landmarks) and detect the specific gestures (Thumbs Up/Down, Flat Hand).

Confirmation & Action:

Implement visual feedback when a potential gesture is detected.

Implement the 3-second hold timer, including reset logic if the gesture changes/is lost.

On successful hold, trigger the existing updateCard function (which calls POST /api/update) with the corresponding difficulty.

Ensure automatic advance to the next card.

Integration: Ensure fallback click buttons still work. Ensure the hint flow requires clicking "Ready to Answer" again. Handle the "Continue without Webcam" state by disabling gesture features.

Iterative Implementation Steps & LLM Prompts

Here's the breakdown into smaller, testable steps with corresponding prompts.

Step 1: Backend - State Serialization/Deserialization Helpers

Goal: Create functions to safely convert the application state to/from a JSON-compatible format.

LLM Prompt:

Context: We are starting to implement file-based persistence for the flashcard backend based on `spec.md`, section 5. The current state uses `Map<number, Set<Flashcard>>` for buckets. JSON cannot directly serialize Maps or Sets.

Task:

1.  **Create Tests:** In a new file `test/stateSerialization.test.ts`, write unit tests using a testing framework like `jest` or `mocha/chai` for two functions: `serializeState` and `deserializeState`.
    - `serializeState` should take `currentBuckets` (Map<number, Set<Flashcard>>), `practiceHistory` (PracticeRecord[]), and `currentDay` (number) as input. It should return a plain JavaScript object suitable for `JSON.stringify`. Ensure Sets within the buckets map are converted to Arrays.
    - `deserializeState` should take the plain object output by `serializeState` and return an object containing `currentBuckets` (correctly reconstructed as Map<number, Set<Flashcard>>), `practiceHistory`, and `currentDay`. Ensure Arrays in the buckets are converted back to Sets.
    - Include tests for empty state, state with multiple buckets/cards, and state with history.
2.  **Implement Helpers:** Create a new file `logic/stateSerialization.ts`. Implement the `serializeState` and `deserializeState` functions based on the requirements above, ensuring they pass the tests. Export these functions. Also export an interface for the serialized state structure.

Step 2: Backend - File I/O for State

Goal: Implement functions to read from and write the serialized state to flashcard_state.json.

LLM Prompt:

Context: We have serialization/deserialization helpers in `logic/stateSerialization.ts` (from Step 1). Now we need to interact with the filesystem.

Task:

1.  **Create Tests:** In `test/stateSerialization.test.ts`, add integration-style tests (potentially mocking the `fs` module or using temporary files) for two new async functions: `saveStateToFile` and `loadStateFromFile`.
    - `saveStateToFile` should take the application state (buckets, history, day), serialize it using `serializeState`, and write the resulting JSON string to `flashcard_state.json` in the project root. Test that the file is written correctly.
    - `loadStateFromFile` should attempt to read `flashcard_state.json` from the project root. If it exists and contains valid JSON, it should parse it and deserialize it using `deserializeState`, returning the application state. If the file doesn't exist, it should return `null` or throw a specific "not found" error. If the file is corrupted (invalid JSON), it should throw an error. Test these different scenarios.
2.  **Implement File I/O:** In `logic/stateSerialization.ts`, implement the async functions `saveStateToFile` and `loadStateFromFile` using Node.js's `fs/promises` module. Ensure they handle file paths correctly (relative to project root) and manage potential errors during file access or JSON parsing. Use the previously defined helpers. Export these functions.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END
    Step 3: Backend - Load State on Startup

Goal: Modify the server to load state from the file when it starts.

LLM Prompt:

Context: We have functions `loadStateFromFile` and initial state defined in `state.ts`. We need to integrate the loading logic into the server startup.

Task:

1.  **Modify `state.ts`:**
    - Import `loadStateFromFile` and the necessary types from `logic/stateSerialization.ts`.
    - Create an async function `initializeState`. This function should:
      - Call `loadStateFromFile`.
      - If state is loaded successfully, update the module-level `currentBuckets`, `practiceHistory`, and `currentDay` variables with the loaded data. Log a success message.
      - If `loadStateFromFile` indicates the file wasn't found (e.g., returns null or specific error), log a message indicating that initial state will be used.
      - If `loadStateFromFile` throws any other error (e.g., corrupted file), log the error and potentially exit the process or fall back to initial state (clarify preferred behavior - let's default to logging error and using initial state).
    - Ensure the existing state variables (`currentBuckets`, `practiceHistory`, `currentDay`) are still exported.
2.  **Modify `server.ts`:**
    _ Import `initializeState` from `state.ts`.
    _ Wrap the `app.listen` call in an async IIFE (Immediately Invoked Function Expression) or a top-level async function.
    _ **Before** calling `app.listen`, `await initializeState()`.
    _ Adjust logging to indicate whether state was loaded or initial state is being used.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END
    Step 4: Backend - Save State on Graceful Shutdown

Goal: Implement logic to save the current state to the file when the server receives SIGINT or SIGTERM.

LLM Prompt:

Context: We have `saveStateToFile` from Step 2 and the server setup from Step 3. We need to trigger saving when the server is asked to shut down gracefully.

Task:

1.  **Modify `server.ts`:**
    _ Import `saveStateToFile` from `logic/stateSerialization.ts`.
    _ Import `getBuckets`, `getHistory`, `getCurrentDay` from `state.ts`.
    _ Define an async function `handleShutdown`. This function should:
    _ Log that shutdown is occurring and state is being saved.
    _ Retrieve the current state using the getters from `state.ts`.
    _ Call `await saveStateToFile` with the current state.
    _ Log success or failure of the save operation.
    _ Call `process.exit(0)` upon success, or `process.exit(1)` upon save failure.
    _ Register listeners for `SIGINT` and `SIGTERM` signals using `process.on()`.
    _ Inside each listener's callback, call `handleShutdown()`. Ensure it's only called once if multiple signals arrive quickly (add a simple flag).
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END

(Self-Correction Note: Persistence is now set up. Manual testing by starting, making changes via existing API, stopping (Ctrl+C), and restarting is needed).

Step 5: Backend - Modify Flashcard and POST /api/cards for Hint/Tags

Goal: Update the data model and existing card creation endpoint to support optional hints and tags.

LLM Prompt:

Context: We need to prepare the backend for the browser extension. The spec (`spec.md`, section 3.3) requires the `POST /api/cards` endpoint to accept optional `hint` and `tags`.

Task:

1.  **Modify `logic/flashcards.ts`:**
    - Update the `Flashcard` class constructor to accept optional `hint: string` and `tags: ReadonlyArray<string>` parameters, storing them as readonly properties. Update existing instantiations if necessary (though none might exist outside `state.ts` initial data).
2.  **Modify `types/index.ts` (if necessary):** Ensure the `Flashcard` type definition reflects the optional `hint` and `tags` properties if it's manually defined there separately from the class.
3.  **Modify `server.ts` (`POST /api/cards` handler):**
    - Update the request body destructuring to extract optional `hint` (string) and `tags` (expected as an array of strings from the client). Provide default values (e.g., `undefined` for hint, `[]` for tags).
    - When creating the `new Flashcard` instance, pass the extracted `hint` and `tags` to the constructor.
    - Update the response JSON to include the `hint` and `tags` in the returned card object for confirmation.
4.  **Update Tests:** If you have tests for `POST /api/cards`, update them to check for cases with and without `hint`/`tags` being provided and verify they are stored and returned correctly.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END
    Step 6: Backend - LLM Service Module

Goal: Create a reusable module to handle communication with the LLM API.

LLM Prompt:

Context: The `/api/cards/prepare` endpoint (to be built next) needs to call an LLM. We should encapsulate this logic.

Task:

1.  **Create `config.ts` (if not exists):** Create a file (e.g., `config.ts` or use `.env` with `dotenv` package) to manage configuration, including the LLM API Key (`LLM_API_KEY`) and potentially the LLM API endpoint URL (`LLM_API_URL`). **Do not commit API keys to Git.** Ensure this config is loaded appropriately (e.g., using `dotenv`).
2.  **Implement `logic/llmService.ts`:**
    - Create an async function `generateFlashcardFront(backText: string): Promise<string>`.
    - Inside this function:
      - Retrieve the LLM API key and URL from configuration.
      - Construct the specific prompt required by `spec.md` (section 3.2, step 5): `"Generate a short question or keyword for which the following text is the answer: [backText]"`.
      - Format the request payload according to the chosen LLM provider's API documentation (e.g., OpenAI, Gemini).
      - Use a library like `axios` or Node's built-in `fetch` (in Node 18+) to make the POST request to the LLM API endpoint. Include necessary headers (e.g., `Authorization: Bearer ${LLM_API_KEY}`, `Content-Type: application/json`).
      - Handle the response: Parse the generated text from the LLM's response structure.
      - Implement error handling: Check for non-2xx responses from the LLM API, handle network errors (timeouts, etc.). Throw specific errors or return a rejected Promise on failure.
    - Export the `generateFlashcardFront` function.
3.  **Add Tests (Optional but Recommended):** Create `test/llmService.test.ts`. Write unit tests for `generateFlashcardFront`. Since this involves external API calls, **mock the HTTP request library (`axios`/`fetch`)** to simulate successful LLM responses and various error conditions (API errors, network errors) without making actual calls during testing. Test that the correct prompt is generated and sent.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END
    Step 7: Backend - Implement POST /api/cards/prepare Endpoint

Goal: Create the new backend endpoint that checks for duplicates and uses the LLM service.

LLM Prompt:

Context: We have the LLM service (`logic/llmService.ts`) and updated state management. Now we implement the `POST /api/cards/prepare` endpoint as specified in `spec.md` section 3.

Task:

1.  **Implement Duplicate Check Helper:**
    - In `state.ts`, create a function `doesCardBackExist(backText: string): boolean`.
    - This function should iterate through all `Flashcard` objects currently in `currentBuckets` (use `getBuckets()`).
    - Return `true` if any card's `back` property exactly matches `backText`, otherwise return `false`.
    - Export this function.
    - Add unit tests for this helper function in a relevant test file (e.g., `test/state.test.ts`).
2.  **Define Route in `server.ts`:**
    - Add a new route: `app.post('/api/cards/prepare', ...)`.
3.  **Implement Route Handler (`server.ts` or a separate controller file):**
    - Import `doesCardBackExist` from `state.ts` and `generateFlashcardFront` from `logic/llmService.ts`.
    - The handler should be `async`.
    - Extract `backText` from `req.body`. Validate that it exists.
    - Call `doesCardBackExist(backText)`.
      - If `true`, respond immediately with a suitable status (e.g., 409 Conflict or 200 OK with `{ "status": "duplicate" }`).
    - If `false` (not a duplicate):
      - Use a `try...catch` block to call `await generateFlashcardFront(backText)`.
      - **On Success:** Respond with 200 OK and JSON `{ "front": generatedFront, "back": backText }`.
      - **On Catch (LLM Error):** Log the error. Respond with a suitable error status (e.g., 500 Internal Server Error or 502 Bad Gateway) and JSON `{ "status": "llm_error", "message": "Failed to generate card front." }`.
4.  **Add Integration Tests:** In a relevant test file (e.g., `test/server.test.ts`), add integration tests for the `/api/cards/prepare` endpoint using a library like `supertest`.
    _ Test the non-duplicate case (mocking the LLM service call successfully).
    _ Test the duplicate card case. \* Test the case where the (mocked) LLM service call fails.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END

(Backend API work for the extension is now complete).

Step 8: Browser Extension - Basic Structure & Trigger

Goal: Set up the minimal files for the browser extension and implement the text highlighting trigger.

LLM Prompt:

Context: We are starting the browser extension frontend. We need the basic manifest and a way to trigger it from highlighted text. We'll target Chrome/Firefox (Manifest V3 ideally).

Task:

1.  **Create `extension` Directory:** Create a new top-level directory named `extension`.
2.  **Create `manifest.json`:** Inside `extension`, create `manifest.json`. Define:
    - `manifest_version`: 3
    - `name`: "Flashcard Creator" (or similar)
    - `version`: "1.0"
    - `description`: "Create flashcards from highlighted text."
    - `permissions`: [`contextMenus`, `activeTab`, `scripting`] (adjust if using popup instead of context menu)
    - `background`: `{ "service_worker": "background.js" }`
    - `icons`: (Add placeholder icons if desired)
3.  **Create `background.js`:** Inside `extension`, create `background.js`.
    - Add an event listener for `chrome.runtime.onInstalled`. Inside this listener, create a context menu item using `chrome.contextMenus.create`:
      - `id`: "createFlashcard"
      - `title`: "Create Flashcard from '%s'" (%s inserts the highlighted text)
      - `contexts`: [`selection`]
    - Add an event listener for `chrome.contextMenus.onClicked`. Inside this listener:
      - Check if `clickData.menuItemId` is "createFlashcard".
      - If it is, get the selected text using `clickData.selectionText`.
      - For now, just log the selected text: `console.log("Selected text:", clickData.selectionText);` (We will add the API call next).
4.  **Instructions:** Explain how to load this unpacked extension in Chrome/Firefox for testing.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END
    Step 9: Browser Extension - API Call & Initial UI States

Goal: Connect the context menu trigger to the backend /api/cards/prepare endpoint and handle the initial loading/duplicate/error UI states.

LLM Prompt:

Context: The browser extension (`extension/background.js`) can capture highlighted text (Step 8). Now, it needs to call the backend `/api/cards/prepare` endpoint and react to the response. We'll manage UI feedback via notifications or potentially injecting content later. For now, focus on the logic in `background.js`.

Task:

1.  **Modify `background.js` (`chrome.contextMenus.onClicked` listener):**
    _ Inside the `if (clickData.menuItemId === "createFlashcard")` block:
    _ Get the `selectedText = clickData.selectionText`.
    _ Define the backend URL (e.g., `http://localhost:3001/api/cards/prepare`). Make this configurable if needed.
    _ Use the `fetch` API to make a POST request to the backend URL.
    _ Method: `POST`
    _ Headers: `{ 'Content-Type': 'application/json' }`
    _ Body: `JSON.stringify({ backText: selectedText })`
    _ Add `.then()` to handle the response. Check `response.ok` and `response.status`.
    _ If status is 409 (or based on `{ "status": "duplicate" }` in JSON response): Log "Card already exists". (UI update later).
    _ If response is OK (e.g., 200): Parse the JSON body (`response.json()`). This gives `{ front, back }`. Log these values. (Trigger form display later).
    _ Add `.catch()` to handle network errors or non-OK responses (like 500/502 for LLM errors).
    _ Inside catch, check if the response object is available to potentially read an error message/status from the body (like `{ "status": "llm_error" }`).
    _ Log "Error generating card front" or a more specific message if available. (Trigger error UI later).
    _ **(Optional UI - Simple Notifications):** Add the `notifications` permission to `manifest.json`. Use `chrome.notifications.create` to show simple OS notifications for "Loading...", "Card already exists", "Error generating card", "Card ready for review" (when form would show). This provides basic feedback before implementing a proper UI form.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END

(Note: A full UI form is complex for a background script. Often, this logic triggers opening a popup or injecting a content script UI. We'll proceed assuming a more complex UI step follows, but the core API logic is here).

Step 10: Browser Extension - Card Review Form & Save Logic (Conceptual)

Goal: Define the UI and logic for the card review form and saving the card. (This step is more complex and might involve switching to a popup or content script UI).

LLM Prompt:

Context: The background script can now get the generated `front` and `back` from the backend (Step 9). Displaying a complex form directly from a background script is not ideal. A common pattern is to open a dedicated extension popup or inject a UI into the page.

Task (Conceptual - Assuming UI shifts to Popup/Content Script):

1.  **UI Structure (`popup.html` / Content Script Injection):**
    - Design an HTML structure for the review form as specified (`spec.md`, section 3.2, step 7):
      - Editable input/textarea for `front`.
      - Editable input/textarea for `back`.
      - Input field for `hint` (optional).
      - Single input field for `tags` (comma-separated).
      - "Save Card" button.
      - (Also consider adding "Retry Generation" and "Enter Front Manually" buttons here for the LLM error case).
2.  **Triggering the UI:** Modify `background.js` (Step 9):
    - On successful response from `/api/cards/prepare`, instead of logging, store the received `front` and `back` in `chrome.storage.local` and then open the extension popup (`chrome.action.openPopup()`) or send a message to a content script to display the form.
    - Handle the LLM error case similarly, perhaps storing an error state for the UI to read.
3.  **UI Logic (`popup.js` / Content Script):**
    _ When the UI loads, retrieve the `front`/`back` (or error state) from `chrome.storage.local`.
    _ Populate the form fields.
    _ Implement the "Save Card" button's click handler:
    _ Read values from all form fields.
    _ Parse the comma-separated `tags` string into an array of strings (trimming whitespace).
    _ Validate inputs if necessary.
    _ Make a `fetch` POST request to the backend `/api/cards` endpoint (the one modified in Step 5) with the final `front`, `back`, `hint`, and `tags` array.
    _ Handle the response: Show a success message ("Card saved!") or an error message. Close the UI on success. \* Implement "Retry Generation" / "Enter Front Manually" logic if handling the LLM error case in this UI.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END

(This step requires significant frontend development within the extension's chosen UI pattern - Popup or Content Script).

Step 11: Frontend - Webcam Access & Error Handling

Goal: Integrate basic webcam access into the existing frontend's practice view.

LLM Prompt:

Context: We are now modifying the main frontend application (e.g., React/Vue/Angular component for the practice session) to add hand gesture support. First step is accessing the webcam.

Task:

1.  **Add UI Element:** In the practice view component's template/JSX, add an HTML `<video>` element to display the webcam feed. Give it an ID or ref for access. Initially, it can be hidden or show a placeholder.
2.  **Implement Webcam Access Function:** In the component's script/logic:
    - Create an async function `startWebcam()`.
    - Use `navigator.mediaDevices.getUserMedia({ video: true })` to request access.
    - Use a `try...catch` block.
    - **On Success:**
      - Get the `MediaStream` object.
      - Set the `srcObject` of the `<video>` element to this stream.
      - Play the video (`videoElement.play()`).
      - Set a state variable (e.g., `isWebcamActive = true`). Hide any placeholders/show the video element. Clear any previous error state.
    - **On Catch (Error):**
      - Handle potential errors (e.g., `NotFoundError`, `NotAllowedError`).
      - Set an error state variable with an appropriate message (e.g., "Webcam not found" or "Permission denied").
      - Set `isWebcamActive = false`.
3.  **Implement UI for Errors:**
    - Conditionally render the error message based on the error state.
    - Conditionally render "Try Again" and "Continue without Webcam" buttons when an error exists.
    - The "Try Again" button should call `startWebcam()` again.
    - The "Continue without Webcam" button should clear the error state and set a different state variable (e.g., `useWebcam = false`) to indicate gestures should be disabled for the session. Hide the error UI and webcam element.
4.  **Trigger Activation:** Call `startWebcam()` automatically when the practice component mounts or when a practice session starts (based on your component lifecycle).
5.  **Pause Logic:** Ensure that while the error message and choice buttons are displayed, other practice interactions (like revealing card back, clicking difficulty) are disabled or the session state is paused.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END
    Step 12: Frontend - TensorFlow.js Hand Pose Detection Setup

Goal: Integrate TFJS and the Hand Pose Detection model, loading it when the webcam is ready.

LLM Prompt:

Context: Webcam access is implemented (Step 11). Now we add TensorFlow.js Hand Pose Detection.

Task:

1.  **Install Dependencies:** Add `@tensorflow/tfjs-core`, `@tensorflow/tfjs-backend-webgl` (or others), and `@tensorflow-models/hand-pose-detection` to your frontend project's dependencies.
2.  **Import:** Import necessary components from TFJS and the model:
    ```javascript
    import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
    import * as tf from "@tensorflow/tfjs-core";
    // Import backend (e.g., WebGL) if needed and register it
    import "@tensorflow/tfjs-backend-webgl";
    ```
3.  **Load Model:**
    - In your component's script, declare a variable to hold the detector (e.g., `handDetector = null`).
    - Create an async function `loadHandPoseModel()`.
    - Inside this function:
      - Set the TFJS backend (e.g., `await tf.setBackend('webgl');`).
      - Define the model configuration (e.g., `model = handPoseDetection.SupportedModels.MediaPipeHands; detectorConfig = { runtime: 'tfjs' };`). Adjust based on desired model/runtime.
      - Create the detector: `detector = await handPoseDetection.createDetector(model, detectorConfig);`.
      - Store the loaded `detector` in the component's state or variable.
      - Log a success message. Handle potential errors during loading.
4.  **Trigger Model Loading:** Modify the `startWebcam` function (from Step 11). After successfully getting the `MediaStream` and starting the video, call `loadHandPoseModel()` if the detector hasn't been loaded yet.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END
    Step 13: Frontend - Gesture Detection Loop & Basic Recognition

Goal: Start detecting hands when "Ready to Answer" is clicked and implement basic logic to identify the target gestures.

LLM Prompt:

Context: TFJS Hand Pose model is loaded (Step 12). We need the "Ready" button and the loop to analyze frames and detect specific gestures.

Task:

1.  **Add "Ready to Answer" Button:** Add the button to the UI. It should only be visible/enabled after the card back is revealed and if `useWebcam` is true (or webcam is active).
2.  **Detection Loop State:** Add state variables: `isDetecting = false`, `detectedGesture = null`.
3.  **Start Detection Function:** Create an async function `startGestureDetection()`.
    - Set `isDetecting = true`.
    - **(Processing Indicator):** Show a visual indicator (spinner icon near webcam feed as decided in spec).
    - Get the `videoElement` and the loaded `handDetector`.
    - Create a loop (e.g., using `requestAnimationFrame` or `setInterval` - `requestAnimationFrame` is generally better for performance).
    - **Inside the loop:**
      - Check if `isDetecting` is still true (to allow stopping the loop).
      - Call `detector.estimateHands(videoElement)` to get predictions.
      - If `hands` are detected (array is not empty):
        - Process the first detected hand's keypoints (`hands[0].keypoints`).
        - **(Gesture Logic - Placeholder):** Implement initial logic to check for Thumbs Up, Thumbs Down, Flat Hand based on landmark positions. This can be complex, start with simple checks (e.g., thumb position relative to wrist/other fingers).
        - If a gesture is recognized, log it (e.g., `console.log("Detected:", gestureName)`). Set `detectedGesture = gestureName`. (We'll add confirmation next).
      - Schedule the next iteration of the loop.
    - The "Ready to Answer" button's click handler should call `startGestureDetection()`. Disable the button after clicking.
4.  **Stop Detection:** Create a function `stopGestureDetection()`. Set `isDetecting = false`. Hide the processing indicator. Reset `detectedGesture = null`. This function needs to be called when an answer is submitted or the card changes.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END

(Gesture recognition logic itself is the most complex part here and may require significant tuning and iteration based on the TFJS model output).

Step 14: Frontend - Gesture Confirmation (3-Second Hold) & Action

Goal: Implement the 3-second hold requirement, visual feedback, and trigger the card update on success.

LLM Prompt:

Context: Basic gesture detection loop is running (Step 13). Now add the 3-second hold confirmation and connect it to the existing card update logic.

Task:

1.  **Confirmation State:** Add state variables: `confirmingGesture = null`, `confirmStartTime = null`.
2.  **Modify Detection Loop (Inside `if (hands detected)`):**
    - Get the `recognizedGestureName` from your gesture logic.
    - **If `recognizedGestureName` matches `confirmingGesture`:**
      - Check if `Date.now() - confirmStartTime >= 3000`.
      - If yes (held for 3s):
        - `stopGestureDetection()`.
        - Map `recognizedGestureName` to the correct `AnswerDifficulty` enum value.
        - Call the existing function that handles card updates (e.g., `handleUpdate(card, difficulty)` which calls `/api/update`).
        - **(Crucial):** Ensure this triggers loading the next card, which should implicitly stop detection/reset state for the new card.
        - Reset `confirmingGesture = null`, `confirmStartTime = null`. Exit the current loop iteration.
    - **If `recognizedGestureName` is different from `confirmingGesture` (or `confirmingGesture` is null):**
      - A _new_ potential gesture is detected (or the first one).
      - Set `confirmingGesture = recognizedGestureName`.
      - Set `confirmStartTime = Date.now()`.
      - **(Visual Feedback):** Trigger UI update to show feedback (highlight button / show icon for `recognizedGestureName`).
    - **If no specific gesture is recognized (or hand lost):**
      - Reset `confirmingGesture = null`, `confirmStartTime = null`.
      - **(Visual Feedback):** Remove any active gesture feedback.
3.  **Integrate Hint Flow:** Ensure that after clicking the "Hint" button, the `stopGestureDetection()` function is called, and the user _must_ click "Ready to Answer" again to restart the detection process for that card.
4.  **Ensure Fallback:** Double-check that clicking the regular difficulty buttons still works correctly and ideally calls `stopGestureDetection()` before processing the click.
    IGNORE_WHEN_COPYING_START
    content_copy
    download
    Use code with caution.
    Text
    IGNORE_WHEN_COPYING_END

This detailed breakdown provides a step-by-step path with corresponding prompts designed for incremental, test-driven development using a code-generation LLM. Remember to review and test the output of each step carefully.
