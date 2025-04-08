// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  console.log("[Background] Extension installed/updated");
  chrome.contextMenus.create({
    id: "addToFlashcards",
    title: "Add to Flashcards",
    contexts: ["selection"],
  });
  console.log("[Background] Context menu created");
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("[Background] Context menu clicked:", info.menuItemId);
  if (info.menuItemId === "addToFlashcards") {
    console.log(
      "[Background] Selected text from context menu:",
      info.selectionText
    );
    // Store the selected text in storage
    chrome.storage.local.set({ selectedText: info.selectionText }, () => {
      console.log("[Background] Selected text stored in storage");
      // Open the popup
      console.log("[Background] Opening popup from context menu");
      openPopup();
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Background] Received message:", request);
  if (request.action === "openPopup") {
    console.log("[Background] Opening popup from message");
    openPopup();
    // Send a response back to the content script
    sendResponse({ success: true });
  }
  return true;
});

// Function to open popup
function openPopup() {
  console.log("[Background] Attempting to open popup");
  try {
    // Try to open the popup
    chrome.action.openPopup();
    console.log("[Background] Popup opened successfully");
  } catch (error) {
    console.error("[Background] Error opening popup:", error);

    // Fallback: Create a new window with the popup
    console.log("[Background] Using fallback method to open popup");
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 600,
    });
  }
}

// Listen for popup open event
chrome.action.onClicked.addListener((tab) => {
  console.log("[Background] Action button clicked");
  // This is a fallback in case the popup doesn't open automatically
  // Some browsers might not support this event
  openPopup();
});
