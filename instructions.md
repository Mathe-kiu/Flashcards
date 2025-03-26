# Full-Stack Flashcard App - Build Instructions

This guide provides step-by-step instructions to build a full-stack flashcard application using your existing flashcard algorithm logic (`algorithm.ts` and `flashcards.ts`).

**Technologies Used:**

- **Backend:** Node.js, TypeScript, Express
- **Frontend:** React, Vite, TypeScript, Axios
- **Algorithm:** Your implemented functions from Problem Set 1.

**Prerequisites:**

- Node.js and npm (or yarn) installed.
- Your completed `algorithm.ts` and the provided `flashcards.ts` files.

---

## Phase 1: Backend Setup

1.  **Create Project Structure:**

    ```bash
    mkdir flashcard-app
    cd flashcard-app
    mkdir backend
    cd backend
    ```

2.  **Initialize npm Project:**

    ```bash
    npm init -y
    ```

3.  **Install Dependencies:**

    - **Runtime:** `express` (web framework), `cors` (for cross-origin requests from frontend).
    - **Development:** `typescript`, `@types/node`, `@types/express`, `@types/cors` (TypeScript support), `ts-node-dev` (for running TS directly during development).

    ```bash
    npm install express cors
    npm install -D typescript @types/node @types/express @types/cors ts-node-dev
    ```

4.  **Configure TypeScript (`tsconfig.json`):**
    Create a `tsconfig.json` file in the `backend` directory with the following content. This tells TypeScript how to compile your code.

    ```json
    {
      "compilerOptions": {
        "target": "ES2016", // Compile to modern JavaScript
        "module": "CommonJS", // Use Node.js module system
        "outDir": "./dist", // Output compiled JS to 'dist' folder
        "rootDir": "./src", // Source TS files are in 'src'
        "strict": true, // Enable strict type checking
        "esModuleInterop": true, // Allow default imports from CommonJS modules
        "skipLibCheck": true, // Skip type checking of declaration files
        "forceConsistentCasingInFileNames": true, // Prevent case-related bugs
        "resolveJsonModule": true, // Allow importing JSON files
        "baseUrl": "./", // Base directory for module resolution
        "paths": {
          // Define path aliases for cleaner imports
          "@logic/*": ["src/logic/*"],
          "@types/*": ["src/types/*"]
        }
      },
      "include": ["src/**/*"], // Compile all files in 'src'
      "exclude": ["node_modules"] // Don't compile node_modules
    }
    ```

5.  **Create Source Folders & Initial Files:**

    ```bash
    mkdir -p src/logic src/types
    touch src/server.ts src/state.ts src/types/index.ts
    ```

6.  **Add Your Algorithm Logic:**

    - Copy your implemented `algorithm.ts` file into the `backend/src/logic/` directory.
    - Copy the provided `flashcards.ts` file into the `backend/src/logic/` directory.

7.  **Add `package.json` Scripts:**
    Open `backend/package.json` and add the following scripts section. These commands help build and run your backend.
    ```json
      "main": "dist/server.js", // Entry point for the compiled app
      "scripts": {
        "build": "tsc",                                            // Compiles TypeScript to JavaScript (into 'dist')
        "start": "node dist/server.js",                            // Runs the compiled JavaScript app
        "dev": "ts-node-dev --respawn --transpile-only src/server.ts" // Runs TS directly for development with auto-restart
      },
    ```

---

## Phase 2: Backend Implementation

1.  **Define Shared Types (`backend/src/types/index.ts`):**

    - This file will hold types used across your backend, especially for API request/response structures and state.
    - Import `Flashcard`, `AnswerDifficulty`, `BucketMap` from `@logic/flashcards`.
    - Define interfaces for API data structures:
      - `PracticeSession`: `{ cards: Flashcard[], day: number }`
      - `UpdateRequest`: `{ cardFront: string, cardBack: string, difficulty: AnswerDifficulty }`
      - `HintRequest`: `{ cardFront: string, cardBack: string }` (Can be inferred from query params later)
      - `ProgressStats`: Define this based on the _output structure_ you designed for your `computeProgress` function.
      - `PracticeRecord`: Define this based on the _history input structure_ you designed for your `computeProgress` function (e.g., `{ cardFront: string, cardBack: string, timestamp: number, difficulty: AnswerDifficulty, previousBucket: number, newBucket: number }`).
    - Export all defined types and the imported core types.

2.  **Implement In-Memory State (`backend/src/state.ts`):**

    - This file manages the application's state (buckets, history, current day) _in memory_. It will reset every time the server restarts.
    - Import `Flashcard`, `BucketMap`, `AnswerDifficulty` from `@logic/flashcards` and `PracticeRecord` from `@types/index`.
    - **Initial Data:**
      - Define an array `initialCards: Flashcard[]` with several sample `Flashcard` objects. Use the `Flashcard` constructor.
    - **State Variables:**
      - `let currentBuckets: BucketMap = new Map();`
      - Initialize `currentBuckets` by creating a `Set` from `initialCards` and putting it into bucket `0` (e.g., `currentBuckets.set(0, new Set(initialCards))`).
      - `let practiceHistory: PracticeRecord[] = [];`
      - `let currentDay: number = 0;`
    - **State Accessors & Mutators:** Create and export functions to interact with the state:
      - `getBuckets(): BucketMap` (returns `currentBuckets`)
      - `setBuckets(newBuckets: BucketMap): void` (updates `currentBuckets`)
      - `getHistory(): PracticeRecord[]` (returns `practiceHistory`)
      - `addHistoryRecord(record: PracticeRecord): void` (pushes `record` to `practiceHistory`)
      - `getCurrentDay(): number` (returns `currentDay`)
      - `incrementDay(): void` (increments `currentDay`)
    - **Helper Functions (Optional but Recommended):**
      - `findCard(front: string, back: string): Flashcard | undefined`: Iterates through `currentBuckets` to find a card matching the front/back.
      - `findCardBucket(cardToFind: Flashcard): number | undefined`: Iterates through `currentBuckets` to find which bucket number a specific card instance belongs to.
    - Add a `console.log` at the end to confirm initial state loading.

3.  **Implement Express Server (`backend/src/server.ts`):**
    - This file sets up the Express server and defines the API endpoints.
    - **Imports:** Import `express`, `cors`, your logic functions from `@logic/algorithm`, state functions from `./state`, and necessary types from `@logic/flashcards` and `@types/index`.
    - **Setup:**
      - Create an Express app instance: `const app = express();`
      - Define a port: `const PORT = process.env.PORT || 3001;`
    - **Middleware:**
      - `app.use(cors());` // Allow frontend requests
      - `app.use(express.json());` // Parse incoming JSON request bodies
    - **API Routes:** Implement the following endpoints using `app.get`, `app.post`, etc. Wrap the logic inside `try...catch` blocks for basic error handling. Send appropriate JSON responses (`res.json(...)`) or error statuses (`res.status(xxx).json(...)`).
      - **`GET /api/practice`**:
        - Get `day` from `state.getCurrentDay()`.
        - Get `bucketsMap` from `state.getBuckets()`.
        - Convert `bucketsMap` to `Array<Set<Flashcard>>` using `logic.toBucketSets()`.
        - Call `logic.practice()` with the bucket sets and day.
        - Convert the resulting `Set<Flashcard>` to an array.
        - Log the number of cards found.
        - Respond with `{ cards: cardsArray, day }`.
      - **`POST /api/update`**:
        - Get `cardFront`, `cardBack`, `difficulty` from `req.body`.
        - _Validate_ if `difficulty` is a valid `AnswerDifficulty` enum value. Return 400 if not.
        - Find the `card` using `state.findCard()`. Return 404 if not found.
        - Get `currentBuckets` from `state.getBuckets()`.
        - (Optional but needed for history): Find the `previousBucket` using `state.findCardBucket(card)`.
        - Call `logic.update()` with `currentBuckets`, the found `card`, and `difficulty`.
        - Update the state using `state.setBuckets()` with the result.
        - (Optional but needed for history): Find the `newBucket` using `state.findCardBucket(card)`. Create a `PracticeRecord` and add it using `state.addHistoryRecord()`.
        - Log the update details.
        - Respond with a success message (status 200).
      - **`GET /api/hint`**:
        - Get `cardFront`, `cardBack` from `req.query`.
        - _Validate_ that both query parameters exist and are strings. Return 400 if not.
        - Find the `card` using `state.findCard()`. Return 404 if not found.
        - Call `logic.getHint()` with the found `card`.
        - Log the request.
        - Respond with `{ hint: yourHint }`.
      - **`GET /api/progress`**:
        - Get `buckets` from `state.getBuckets()`.
        - Get `history` from `state.getHistory()`.
        - Call `logic.computeProgress()` with `buckets` and `history`. **Remember to replace `any` with your actual types.**
        - Respond with the result from `computeProgress`.
      - **`POST /api/day/next`**:
        - Call `state.incrementDay()`.
        - Get the `newDay` from `state.getCurrentDay()`.
        - Log the day advancement.
        - Respond with a success message and the `newDay` (status 200).
    - **Start Server:**
      - `app.listen(PORT, () => { ... });` Include a log message indicating the server is running and on which port.

---

## Phase 3: Frontend Setup

1.  **Create Frontend Project:**

    - Navigate back to the `flashcard-app` root directory (`cd ..`).
    - Use Vite to create a React TypeScript project named `frontend`.

    ```bash
    npm create vite@latest frontend -- --template react-ts
    ```

    - Navigate into the new directory and install dependencies.

    ```bash
    cd frontend
    npm install
    ```

2.  **Install Axios:**

    - Axios is a library for making HTTP requests to the backend API.

    ```bash
    npm install axios
    ```

3.  **Clean Up Default Files (Optional):**

    - You can remove `src/App.css`, `src/assets`, and simplify the contents of `src/App.tsx` and `src/main.tsx` provided by Vite. Update or remove CSS imports as needed.

4.  **Create Source Folders & Initial Files:**
    ```bash
    mkdir -p src/components src/services src/types
    touch src/components/FlashcardDisplay.tsx src/components/PracticeView.tsx
    touch src/services/api.ts src/types/index.ts
    ```

---

## Phase 4: Frontend Implementation

1.  **Define Frontend Types (`frontend/src/types/index.ts`):**

    - This file defines TypeScript types used within the frontend, mirroring the data structures expected from the backend API.
    - Redefine or import types corresponding to:
      - `Flashcard` (match the structure in `logic/flashcards.ts`, hint can be optional `string?`)
      - `AnswerDifficulty` (enum matching backend)
      - `PracticeSession` (matching backend response)
      - `UpdateRequest` (matching backend request)
      - `ProgressStats` (matching the expected output of your `/api/progress` endpoint)
    - Export these types.

2.  **Implement API Service (`frontend/src/services/api.ts`):**

    - This centralizes all communication with the backend API.
    - Import `axios` and necessary types from `../types`.
    - Define the backend API base URL: `const API_BASE_URL = 'http://localhost:3001/api';` (Ensure port 3001 matches your backend).
    - Create an Axios instance: `const apiClient = axios.create({ baseURL: API_BASE_URL, ... });`
    - Create and export async functions for each API call:
      - `fetchPracticeCards(): Promise<PracticeSession>` (Uses `apiClient.get('/practice')`)
      - `submitAnswer(cardFront: string, cardBack: string, difficulty: AnswerDifficulty): Promise<void>` (Uses `apiClient.post('/update', { payload })`)
      - `fetchHint(card: Flashcard): Promise<string>` (Uses `apiClient.get('/hint', { params: { cardFront, cardBack } })`. Returns `response.data.hint`)
      - `fetchProgress(): Promise<ProgressStats>` (Uses `apiClient.get('/progress')`)
      - `advanceDay(): Promise<{currentDay: number}>` (Uses `apiClient.post('/day/next')`. Returns `response.data`)
    - Remember to handle the actual data extraction (e.g., `response.data`).

3.  **Implement Flashcard Display Component (`frontend/src/components/FlashcardDisplay.tsx`):**

    - A reusable component to show a single flashcard.
    - Import `React`, `useState`, `Flashcard` type, and `fetchHint` service.
    - Define `Props` interface: `{ card: Flashcard; showBack: boolean; }`.
    - Use `useState` to manage `hint`, `loadingHint`, and `hintError`.
    - Create an async `handleGetHint` function that calls `fetchHint`, updates loading/error/hint states.
    - Render the `card.front`.
    - Conditionally render `card.back` or '???' based on the `showBack` prop.
    - Conditionally render a "Get Hint" button (only when `showBack` is false). Call `handleGetHint` onClick. Disable button while loading.
    - Display the fetched `hint` or `hintError` message.
    - Add basic styling (inline or via CSS).

4.  **Implement Practice View Component (`frontend/src/components/PracticeView.tsx`):**

    - The main component for the practice session UI.
    - Import `React`, `useState`, `useEffect`, types (`Flashcard`, `AnswerDifficulty`), API services (`fetchPracticeCards`, `submitAnswer`, `advanceDay`), and `FlashcardDisplay`.
    - Use `useState` to manage:
      - `practiceCards: Flashcard[]`
      - `currentCardIndex: number`
      - `showBack: boolean`
      - `isLoading: boolean`
      - `error: string | null`
      - `day: number`
      - `sessionFinished: boolean`
    - Create an async `loadPracticeCards` function:
      - Sets loading state, clears errors/sessionFinished.
      - Calls `fetchPracticeCards`.
      - Updates `practiceCards`, `day` state.
      - Sets `sessionFinished` if no cards are returned.
      - Handles errors, updates `error` state.
      - Clears loading state.
    - Use `useEffect` with an empty dependency array `[]` to call `loadPracticeCards` when the component mounts.
    - Create `handleShowBack`: Sets `showBack` state to true.
    - Create `handleAnswer(difficulty: AnswerDifficulty)`:
      - Gets the `currentCard`.
      - Calls `submitAnswer` with card details and difficulty.
      - If successful, increments `currentCardIndex` or sets `sessionFinished` if it was the last card. Resets `showBack` to false.
      - Handles errors, updates `error` state.
    - Create `handleNextDay`:
      - Calls `advanceDay`.
      - Calls `loadPracticeCards` to fetch cards for the new day.
      - Handles errors.
    - **Rendering Logic:**
      - Show a loading message if `isLoading`.
      - Show an error message if `error`.
      - If `sessionFinished`, show a "Session Complete" message and the "Go to Next Day" button (calling `handleNextDay`).
      - If not finished, get the `currentCard` based on `currentCardIndex`.
      - Render `FlashcardDisplay` passing `currentCard` and `showBack`.
      - Conditionally render "Show Answer" button (calls `handleShowBack`) OR difficulty buttons (calling `handleAnswer` with respective `AnswerDifficulty`).
      - Include the current `day` and card count (`X of Y`).

5.  **Implement Main App Component (`frontend/src/App.tsx`):**

    - The root component of the React application.
    - Import `React`, `PracticeView`, and any CSS.
    - Render a main title (`<h1>Flashcard Learner</h1>`).
    - Render the `<PracticeView />` component.
    - (Later, you might add routing here to switch between `PracticeView` and a potential `ProgressView`).

6.  **Update Entry Point (`frontend/src/main.tsx`):**
    - Ensure this file correctly imports `React`, `ReactDOM`, `App`, and your main CSS file.
    - Ensure it uses `ReactDOM.createRoot` to render the `<App />` component into the DOM element with `id="root"`. (Vite's default template usually does this correctly).

---

## Phase 5: Running the Full Stack Application

1.  **Start the Backend:**

    - Open a terminal window.
    - Navigate to the `flashcard-app/backend` directory.
    - Run the development server:
      ```bash
      npm run dev
      ```
    - Look for the log message indicating the server is running (e.g., `Backend server running at http://localhost:3001`).

2.  **Start the Frontend:**

    - Open a **separate** terminal window.
    - Navigate to the `flashcard-app/frontend` directory.
    - Run the development server:
      ```bash
      npm run dev
      ```
    - Vite will start the frontend development server and likely open the app in your browser (e.g., `http://localhost:5173`). Note the port number shown in the terminal.

3.  **Interact:**
    - Open the frontend URL (e.g., `http://localhost:5173`) in your web browser.
    - You should see the "Flashcard Learner" title and the practice view loading cards.
    - Interact with the UI: Click "Show Answer", select difficulty levels.
    - Observe the backend terminal logs to see API requests being received and processed.
    - Once a session is complete, click "Go to Next Day" to advance the simulation and load the next set of practice cards.

---

## Next Steps & Improvements

- **Implement `computeProgress` UI:** Create a `ProgressView.tsx` component in the frontend to call the `/api/progress` endpoint and display the statistics returned by your backend function.
- **Styling:** Add CSS rules or use a UI component library (like Material UI, Chakra UI, Tailwind CSS) to improve the appearance.
- **Error Handling:** Add more user-friendly error messages and potential retry mechanisms in the frontend. Implement more specific error handling in the backend.
- **Persistence:** Replace the in-memory state in `backend/src/state.ts` with a database (e.g., MongoDB, PostgreSQL using Prisma/TypeORM) or file storage to make data persistent across server restarts.
- **Routing:** Add `react-router-dom` to navigate between different pages (Practice, Progress, Card Management).
- **Card Management:** Build backend API endpoints and frontend UI to allow users to add, edit, and delete their own flashcards.
