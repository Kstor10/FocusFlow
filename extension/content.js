// FocusFlow Content Script - Helps with URL detection and debugging

// Let's check if we're on a potentially blocked page
(function() {
    // Don't run in iframes or extension pages
    if (window !== window.top || location.protocol === 'chrome-extension:') {
        return;
    }
    
    console.log('FocusFlow content script loaded on', window.location.href);
    
    // Store the current URL in local storage for reference
    // This helps with override redirects when the referrer is lost
    try {
        const currentUrl = window.location.href;
        if (!currentUrl.includes('chrome-extension://') && !currentUrl.includes('blocked.html')) {
            console.log('Storing current URL for potential future reference:', currentUrl);
            localStorage.setItem('focusflow_last_url', currentUrl);
            
            // Also store in chrome.storage for cross-context access
            chrome.storage.local.set({ 'lastVisitedUrl': currentUrl }, () => {
                console.log('URL stored in chrome.storage');
            });
        }
    } catch (error) {
        console.error('Error storing URL:', error);
    }
    
    // Notify the background script about this page
    chrome.runtime.sendMessage({ 
        action: 'checkPage', 
        url: window.location.href 
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending message to background script:', chrome.runtime.lastError);
        } else if (response) {
            console.log('Background script response:', response);
        }
    });
    
    // Add a listener for the 'back' button on the blocked page
    if (window.location.href.includes('blocked.html')) {
        console.log('On blocked page, setting up listener');
        
        // Try to pass the original URL to the blocked page
        try {
            const lastUrl = localStorage.getItem('focusflow_last_url');
            if (lastUrl && !lastUrl.includes('chrome-extension://') && !lastUrl.includes('blocked.html')) {
                console.log('Found last URL in localStorage:', lastUrl);
                // We can't directly modify the blocked page DOM from here,
                // but we can store it for the blocked page to access
                chrome.storage.local.set({ 'lastBlockedUrl': lastUrl }, () => {
                    console.log('Last URL stored for blocked page');
                });
            }
        } catch (error) {
            console.error('Error retrieving last URL:', error);
        }
        
        // Listen for messages from the background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message);
            
            if (message.action === 'overrideExpired') {
                alert('Your temporary access has expired. Blocking has resumed.');
            }
            
            sendResponse({ received: true });
            return true;
        });
    }
    
    // Debugging function to help troubleshoot the extension
    function debugFocusFlow() {
        chrome.storage.local.get(null, (data) => {
            console.log('FocusFlow Extension State:', data);
            
            if (data.blockingEnabled) {
                console.log('  Blocking: ENABLED');
            } else {
                console.log('  Blocking: DISABLED');
            }
            
            if (data.timerState && data.timerState.isRunning) {
                console.log(`  Timer: RUNNING - ${data.timerState.isWorkInterval ? 'WORK' : 'BREAK'} mode - ${Math.floor(data.timerState.timeRemaining / 60)}:${(data.timerState.timeRemaining % 60).toString().padStart(2, '0')} remaining`);
            } else {
                console.log('  Timer: STOPPED');
            }
            
            if (data.blockedWebsites && data.blockedWebsites.length) {
                console.log('  Blocked sites:', data.blockedWebsites);
            } else {
                console.log('  No websites blocked');
            }
            
            if (data.overrideTokens) {
                console.log(`  Override tokens: ${data.overrideTokens.remaining}/${data.overrideTokens.maxDaily}`);
                console.log(`  Last token reset: ${data.overrideTokens.lastReset}`);
                console.log(`  Temporarily allowed sites: ${data.overrideTokens.temporaryAllowedSites.join(', ') || 'None'}`);
            }
            
            // Additional debug info
            const lastUrl = localStorage.getItem('focusflow_last_url');
            if (lastUrl) {
                console.log('  Last URL:', lastUrl);
            }
        });
    }
    
    // Add a debug command to the console
    window.debugFocusFlow = debugFocusFlow;
    
    // Log helpful message
    console.log('FocusFlow: Type debugFocusFlow() in the console to see extension state');
})();

// Prevent YouTube autoplay as an example of enhanced blocking
if (window.location.hostname.includes('youtube.com')) {
    // This is just an example - actual implementation would be more complete
    document.addEventListener('DOMContentLoaded', () => {
        console.log("YouTube detected - could apply additional restrictions here");
    });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    
    if (message.action === 'blockNow') {
        console.log("Blocking request received for current page");
        // Store the current URL before redirecting
        try {
            localStorage.setItem('focusflow_last_url', window.location.href);
            chrome.storage.local.set({ 'lastBlockedUrl': window.location.href });
        } catch (e) {
            console.error('Error saving URL:', e);
        }
        
        // Redirect to blocked page with URL parameter
        const blockedPageUrl = chrome.runtime.getURL('blocked.html') + 
            `?url=${encodeURIComponent(window.location.href)}`;
        console.log("Redirecting to:", blockedPageUrl);
        
        window.location.href = blockedPageUrl;
        sendResponse({ success: true });
    }
    
    return true; // Keep the message channel open for async responses
}); 