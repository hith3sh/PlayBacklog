
// listen for user clicking extension, when user is on
// yt playlist page, this injects content.js into the page
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("youtube.com/playlist") && tab.url.includes("list=WL")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
    }
  });
  

//listening for whats coming from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message in background.js:', message);

  if (message.type === "WATCH_LATER_VIDEOS") {
    chrome.storage.local.set({ watchLaterVideos: message.videos }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving videos:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log('Videos saved successfully to storage.');
        sendResponse({ success: true });
      }
    });
  } else if (message.type === "SHOW_REMINDER") {
    console.log('show reminder msg received...', message.video);
    const video = message.video;

    // Show the notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "From your watch later playlist",
      message: `Don't forget to watch: ${video.title}`,
      buttons: [{ title: "Watch Now" }],
      priority: 2,
    });

    // Handle click on the notification
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        // Open the video in a new tab
        chrome.tabs.create({ url: video.url });
      }
    });

    // Respond to the message after processing the reminder
    sendResponse({ success: true });
  }

  return true; 
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', {status: changeInfo.status,url: tab?.url,hasYouTube: tab?.url?.indexOf("youtube.com") !== -1});

  // Fix indexOf check - must compare with -1
  if (changeInfo.status === "complete" && tab?.url && tab.url.indexOf("youtube.com") !== -1) {
    console.log('Injecting content script into YouTube page');
    
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }).then(() => {
      console.log('Content script injected successfully');
    }).catch(error => {
      console.error('Failed to inject content script:', error);
    });
  }
});