// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content] Received message:", request);
  if (request.action === "getSelectedText") {
    // Get the selected text from the page
    const selectedText = window.getSelection().toString().trim();
    console.log("[Content] Selected text:", selectedText);
    sendResponse({ selectedText });
  }
  return true; // Required for async response
});

// Create floating button
const button = document.createElement("button");
button.textContent = "Add to Flashcards";
button.id = "flashcards-extension-button";
button.style.cssText = `
  position: fixed;
  z-index: 10000;
  padding: 10px 16px;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
`;

// Add icon to the button
const icon = document.createElement("span");
icon.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
`;
button.prepend(icon);

// Add hover effect
button.addEventListener("mouseover", () => {
  button.style.transform = "translateY(-2px)";
  button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
});

button.addEventListener("mouseout", () => {
  button.style.transform = "translateY(0)";
  button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
});

// Add click event listener to the button
button.addEventListener(
  "click",
  (event) => {
    console.log("[Content] Button clicked");
    event.stopPropagation();

    // Get the selected text
    const selectedText = window.getSelection().toString().trim();
    console.log("[Content] Selected text:", selectedText);

    if (selectedText) {
      // Visual feedback on click
      button.style.transform = "scale(0.95)";
      setTimeout(() => {
        button.style.transform = "scale(1)";
      }, 150);

      // Store the selected text in storage
      chrome.storage.local.set({ selectedText: selectedText }, () => {
        console.log("[Content] Selected text stored in storage");

        // Send message to background script to open popup
        chrome.runtime.sendMessage({ action: "openPopup" }, (response) => {
          console.log(
            "[Content] Message sent to background script, response:",
            response
          );
          if (chrome.runtime.lastError) {
            console.error(
              "[Content] Error sending message:",
              chrome.runtime.lastError
            );
          }
        });

        // Hide the button after clicking
        button.style.display = "none";
      });
    }
  },
  true
);

// Add the button to the page
document.body.appendChild(button);
console.log("[Content] Button added to page");

// Listen for text selection
document.addEventListener("mouseup", (event) => {
  console.log("[Content] Mouse up event detected");
  const selectedText = window.getSelection().toString().trim();

  if (selectedText) {
    console.log("[Content] Text selected:", selectedText);
    // Position the button near the selection
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate position to avoid going off-screen
    const buttonWidth = 180; // Approximate width of the button
    const buttonHeight = 40; // Approximate height of the button

    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 10;

    // Adjust if button would go off-screen
    if (left + buttonWidth > window.innerWidth) {
      left = window.innerWidth - buttonWidth - 10;
    }

    // If button would go below viewport, place it above the selection
    if (top + buttonHeight > window.scrollY + window.innerHeight) {
      top = rect.top + window.scrollY - buttonHeight - 10;
    }

    button.style.top = `${top}px`;
    button.style.left = `${left}px`;
    button.style.display = "flex";
    console.log("[Content] Button positioned and displayed");
  } else {
    console.log("[Content] No text selected, hiding button");
    button.style.display = "none";
  }
});

// Hide button when clicking outside
document.addEventListener("mousedown", (event) => {
  console.log("[Content] Mouse down event detected");
  if (event.target !== button && !button.contains(event.target)) {
    console.log("[Content] Click outside button, hiding button");
    button.style.display = "none";
  }
});
