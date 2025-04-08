# Flashcards Browser Extension

This browser extension allows you to easily add flashcards from any webpage to your Flashcards application.

## Features

- **Text Selection**: Select any text on a webpage and add it as a flashcard
- **Floating Button**: A convenient floating button appears when you select text
- **Context Menu**: Right-click on selected text to add it as a flashcard
- **Quick Add**: Add cards with front, back, hint, and tags
- **Recent Cards**: View your recently added cards
- **Backend Integration**: Seamlessly integrates with your Flashcards backend

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open your browser and navigate to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the `extension` folder from this repository

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on" and select the `manifest.json` file from the `extension` folder

## Usage

### Adding a Flashcard from a Webpage

1. **Method 1 - Text Selection**:

   - Select any text on a webpage
   - A floating "Add to Flashcards" button will appear
   - Click the button to open the popup with the selected text pre-filled

2. **Method 2 - Context Menu**:

   - Select any text on a webpage
   - Right-click and select "Add to Flashcards" from the context menu
   - The popup will open with the selected text pre-filled

3. **Method 3 - Extension Popup**:
   - Click the extension icon in your browser toolbar
   - Manually enter the front and back of the flashcard

### Creating a Flashcard

1. In the popup, the "Front" field will be pre-filled if you selected text
2. Enter the "Back" of the flashcard (the answer)
3. Optionally add a hint and tags (comma-separated)
4. Click "Save Card" to add the flashcard

## Configuration

The extension connects to the Flashcards backend at `http://localhost:3001` by default. If your backend is running on a different URL, you can change it in the extension settings.

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `popup.html` & `popup.css` & `popup.js`: The extension popup UI
- `content.js` & `content.css`: Scripts that run on web pages
- `background.js`: Background service worker

### Building from Source

No build step is required. The extension uses plain HTML, CSS, and JavaScript.

## License

This extension is part of the Flashcards project and is subject to the same license terms.
