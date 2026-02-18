chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "copy") return;

  navigator.clipboard
    .writeText(message.text)
    .then(() => {
      sendResponse({ success: true });
    })
    .catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = message.text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      sendResponse({ success: true });
    });

  return true;
});
