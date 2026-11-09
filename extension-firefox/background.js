// Keep this key in sync with TRACKER_KEY in your backend environment.
const TRACKER_KEY = "change-this-local-key";
const API = "http://127.0.0.1:5000/api/visits";

async function recordNavigation(event) {
  if (event.frameId !== 0 || !/^https?:/.test(event.url)) return;
  try {
    const tabs = await browser.tabs.query({});
    const tab = tabs.find((item) => item.id === event.tabId);
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tracker-Key": TRACKER_KEY },
      body: JSON.stringify({
        url: event.url,
        title: tab?.title || "",
        browser: "Firefox",
        transition: event.transitionType || "navigate",
        visited_at: new Date(event.timeStamp).toISOString()
      })
    });
  } catch (error) {
    console.warn("Local Browser Tracker could not reach its local Flask service.", error);
  }
}

browser.webNavigation.onCommitted.addListener(recordNavigation);
browser.webNavigation.onHistoryStateUpdated.addListener(recordNavigation);
