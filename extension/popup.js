document.addEventListener("DOMContentLoaded", () => {
  console.log("[Popup] DOM content loaded");

  // DOM elements
  const frontInput = document.getElementById("front");
  const backInput = document.getElementById("back");
  const hintInput = document.getElementById("hint");
  const tagsInput = document.getElementById("tags");
  const saveButton = document.getElementById("save-card");
  const clearButton = document.getElementById("clear-form");
  const statusMessage = document.getElementById("status-message");
  const recentCardsList = document.getElementById("recent-cards-list");

  console.log("[Popup] DOM elements initialized");

  // Load recent cards
  loadRecentCards();

  // Check if there's selected text in storage
  console.log("[Popup] Checking for selected text in storage");
  chrome.storage.local.get(["selectedText"], (result) => {
    console.log("[Popup] Storage result:", result);
    if (result.selectedText) {
      // If there's selected text, use it as the front of the card
      console.log(
        "[Popup] Found selected text in storage:",
        result.selectedText
      );
      backInput.value = result.selectedText;

      // Clear the selected text from storage
      chrome.storage.local.remove(["selectedText"], () => {
        console.log("[Popup] Removed selected text from storage");
      });
    } else {
      // If no selected text in storage, check the active tab
      console.log("[Popup] No selected text in storage, checking active tab");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log("[Popup] Active tab:", tabs[0]);
        const activeTab = tabs[0];
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "getSelectedText" },
          (response) => {
            console.log("[Popup] Response from content script:", response);
            if (response && response.selectedText) {
              // If there's selected text, use it as the front of the card
              console.log(
                "[Popup] Found selected text in active tab:",
                response.selectedText
              );
              backInput.value = response.selectedText;
            }
          }
        );
      });
    }
  });

  // Save card button click handler
  saveButton.addEventListener("click", () => {
    console.log("[Popup] Save button clicked");
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    const hint = hintInput.value.trim();
    const tags = tagsInput.value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    console.log("[Popup] Card data:", { front, back, hint, tags });

    // Validate inputs
    if (!front || !back) {
      console.log("[Popup] Validation failed: missing front or back");
      showStatus("Please fill in both front and back fields", "error");
      return;
    }

    // Create card object
    const card = {
      front,
      back,
      hint: hint || undefined,
      tags,
      timestamp: Date.now(),
    };

    // Save card to storage
    saveCard(card);
  });

  // Clear form button click handler
  clearButton.addEventListener("click", () => {
    console.log("[Popup] Clear button clicked");
    frontInput.value = "";
    backInput.value = "";
    hintInput.value = "";
    tagsInput.value = "";
    statusMessage.textContent = "";
    statusMessage.className = "status-message";
  });

  // Function to save card to storage
  function saveCard(card) {
    console.log("[Popup] Saving card to storage:", card);
    // Get existing cards from storage
    chrome.storage.local.get(["cards"], (result) => {
      console.log("[Popup] Existing cards:", result.cards);
      const cards = result.cards || [];

      // Add new card to the beginning of the array
      cards.unshift(card);

      // Keep only the 10 most recent cards
      const recentCards = cards.slice(0, 10);

      // Save to storage
      chrome.storage.local.set({ cards: recentCards }, () => {
        console.log("[Popup] Cards saved to storage");
        showStatus("Card saved successfully!", "success");

        // Also send to backend if configured
        sendToBackend(card);

        // Update the recent cards list
        loadRecentCards();
      });
    });
  }

  // Function to load recent cards from storage
  function loadRecentCards() {
    console.log("[Popup] Loading recent cards");
    chrome.storage.local.get(["cards"], (result) => {
      console.log("[Popup] Cards from storage:", result.cards);
      const cards = result.cards || [];

      // Clear the list
      recentCardsList.innerHTML = "";

      // Add each card to the list
      cards.forEach((card) => {
        const cardItem = document.createElement("li");
        cardItem.className = "card-item";

        const frontElement = document.createElement("div");
        frontElement.className = "card-front";
        frontElement.textContent = card.front;

        const backElement = document.createElement("div");
        backElement.className = "card-back";
        backElement.textContent = card.back;

        const tagsElement = document.createElement("div");
        tagsElement.className = "card-tags";

        if (card.tags && card.tags.length > 0) {
          card.tags.forEach((tag) => {
            const tagElement = document.createElement("span");
            tagElement.className = "tag";
            tagElement.textContent = tag;
            tagsElement.appendChild(tagElement);
          });
        }

        cardItem.appendChild(frontElement);
        cardItem.appendChild(backElement);
        cardItem.appendChild(tagsElement);

        recentCardsList.appendChild(cardItem);
      });
      console.log("[Popup] Recent cards loaded:", cards.length);
    });
  }

  // Function to show status message
  function showStatus(message, type) {
    console.log("[Popup] Showing status:", message, type);
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    // Clear status after 3 seconds
    setTimeout(() => {
      statusMessage.textContent = "";
      statusMessage.className = "status-message";
    }, 3000);
  }

  // Function to send card to backend
  function sendToBackend(card) {
    console.log("[Popup] Sending card to backend:", card);
    // Get backend URL from storage or use default
    chrome.storage.local.get(["backendUrl"], (result) => {
      const backendUrl = result.backendUrl || "http://localhost:3001";
      console.log("[Popup] Backend URL:", backendUrl);

      // Send card to backend
      fetch(`${backendUrl}/api/cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(card),
      })
        .then((response) => {
          console.log("[Popup] Backend response status:", response.status);
          if (!response.ok) {
            throw new Error("Failed to send card to backend");
          }
          return response.json();
        })
        .then((data) => {
          console.log("[Popup] Card sent to backend successfully:", data);
        })
        .catch((error) => {
          console.error("[Popup] Error sending card to backend:", error);
        });
    });
  }
});
