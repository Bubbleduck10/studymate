// Runs on youtube.com pages. Reads the transcript panel if it's open.
// (YouTube only renders transcript segments once the user opens the
// "Show transcript" panel, so we read what's currently in the DOM.)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_TRANSCRIPT") {
    const segs = document.querySelectorAll("ytd-transcript-segment-renderer");
    const transcript = Array.from(segs)
      .map((s) => s.textContent.trim().replace(/\s+/g, " "))
      .join(" ")
      .trim();
    sendResponse({ transcript });
  }
  return true; // keep the message channel open for the async response
});
