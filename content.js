// Function to scrape video information from the Watch Later playlist

async function scrapeWatchLater() {
    console.log('scraping watch later videos...')
    try{
        const videos = [];
        const videoElements = await waitForElements("ytd-playlist-video-renderer");
        
        console.log(`Found ${videoElements.length} videos`);

        videoElements.forEach((el) => {
        const titleElement = el.querySelector("#video-title");
        const thumbnailElement = el.querySelector("img#img");
    
        videos.push({
            title: titleElement?.textContent.trim(),
            url: `https://www.youtube.com${titleElement?.getAttribute("href")}`,
            thumbnail: thumbnailElement?.getAttribute("src"),
        });
        });
    
        return videos;
    }catch(error){
        console.error('error scraping videos', error);
        return [];
    }
}

//waiting for dynamic content loading
function waitForElements(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function checkElements() {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                resolve(elements);
            } else if (Date.now() - startTime >= timeout) {
                reject(new Error(`Timeout waiting for ${selector}`));
            } else {
                setTimeout(checkElements, 500);
            }
        }
        
        checkElements();
    });
}

  
// wait for page load then execute
window.addEventListener('load', async() =>{
    console.log('page fully loaded');

    const videos = await scrapeWatchLater();
    if (videos.length > 0){
        // Send scraped data to the background script
        chrome.runtime.sendMessage({ type: "WATCH_LATER_VIDEOS", videos}, (response) => {
            if (chrome.runtime.lastError){
                console.log('error sending msg',chrome.runtime.lastError);
            }else if (response?.success) {
                console.log('Videos stored successfully:', response);
            } else {
                console.error('Error from background script:', response?.error);
            }
        });
    }
});

//runs automatically when script loads
// (async function () {
//     const YOUTUBE_URL_PATTERN = "https://www.youtube.com";
  
//     // Check if the user has already been reminded today
//     chrome.storage.local.get("lastReminderDate", (data) => {
//       const today = new Date().toDateString(); // Get today's date as a string
  
//       if (data.lastReminderDate !== today) {
//         // Update the last reminder date
//         chrome.storage.local.set({ lastReminderDate: today });
  
//         // Fetch the "Watch Later" videos
//         const video = getWeightedRandomVideo(videos);

//         // Notify the background script
//         chrome.runtime.sendMessage({ type: "SHOW_REMINDER", video });
//       }
//     });
// })();



//remove later
(async function() {
    console.log('Starting video fetch...');
    try {
        const videos = await getStoredVideos();
        console.log('Fetched videos:', videos.length);

        if (videos.length > 0) {
            const video = getWeightedRandomVideo(videos);
            console.log('Selected random video:', video);
            
            chrome.runtime.sendMessage({ 
                type: "SHOW_REMINDER", 
                video 
            });
        }
    } catch (error) {
        console.error('Error fetching videos:', error);
    }
})();

// Helper function to get videos from storage
function getStoredVideos() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['watchLaterVideos'], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.watchLaterVideos || []);
            }
        });
    });
}
// weighted random function
function getWeightedRandomVideo(videos) {
    if (!videos || videos.length === 0) return null;
    
    // Calculate weights (newer videos get higher weights)
    const weights = videos.map((_, index) => {
        return Math.exp(index / videos.length * 2);
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return videos[i];
        }
    }
    return videos[videos.length - 1];
}
