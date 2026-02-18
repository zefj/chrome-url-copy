// When theme changes in storage (written by content script), update icon
chrome.storage.onChanged.addListener((changes) => {
  if (changes.theme) {
    setIconForTheme(changes.theme.newValue);
  }
});

// Also check theme on every tab switch as a backup
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await checkThemeFromTab(activeInfo.tabId);
});

// And when a page finishes loading
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  await checkThemeFromTab(tabId);
});

// On startup, apply last known theme
chrome.runtime.onStartup.addListener(applyStoredTheme);
chrome.runtime.onInstalled.addListener(applyStoredTheme);

async function checkThemeFromTab(tabId) {
  try {
    const [{ result: isDark }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    });
    const theme = isDark ? "dark" : "light";
    await chrome.storage.local.set({ theme });
    setIconForTheme(theme);
  } catch {
    // chrome:// pages etc — ignore
  }
}

async function applyStoredTheme() {
  const { theme } = await chrome.storage.local.get("theme");
  if (theme) setIconForTheme(theme);
}

function setIconForTheme(theme) {
  const folder = theme === "dark" ? "icons/dark" : "icons";
  chrome.action.setIcon({
    path: {
      16: `${folder}/icon16.png`,
      48: `${folder}/icon48.png`,
      128: `${folder}/icon128.png`,
    },
  });
}

async function copyActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  try {
    await ensureOffscreen();
    await chrome.runtime.sendMessage({ type: "copy", text: tab.url });
    showBadge(tab.id);
  } catch (err) {
    console.error("Failed to copy URL:", err);
    showBadge(tab.id, "ERR", "#F44336");
  }
}

// Icon click
chrome.action.onClicked.addListener(copyActiveTabUrl);

// Keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "copy-url") copyActiveTabUrl();
});

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (!contexts.length) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "Copy URL to clipboard",
    });
  }
}

function showBadge(tabId, text = "\u2713", color = "#4CAF50") {
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "", tabId });
  }, 1500);
}
