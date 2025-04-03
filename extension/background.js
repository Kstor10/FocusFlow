// FocusFlow Extension - Background Script

// Timer state
let timerState = {
    isRunning: false,
    isWorkInterval: true,
    timeRemaining: 0,
    workInterval: 25 * 60, // in seconds
    breakInterval: 5 * 60, // in seconds
    alarmName: 'focusflow-timer'
};

// Website blocking state
let blockedWebsites = [];
let blockingEnabled = false;
const DYNAMIC_RULE_ID_START = 1000; // Starting ID for dynamic rules (changed from 100 to 1000 to avoid conflicts)

// Override state
let overrideState = {
    temporaryAllowedSites: [] // Sites temporarily allowed via challenge completion
};

// Initialize extension
init();

// Listen for messages from the web app or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background: Received message", message);
    
    // Handle message from content script asking to check the current page
    if (message.action === 'checkPage') {
        checkUrlAndBlock(message.url, sender.tab.id);
        sendResponse({ status: 'checked' });
        return true;
    }
    
    // Handle temporary override request from blocked.html or debug.html
    if (message.action === 'temporaryOverride' && message.url) {
        // Use the fromChallenge parameter if provided
        const fromChallenge = !!message.fromChallenge;
        
        console.log("Processing override request:", message.url, "fromChallenge:", fromChallenge);
        
        // Execute the async function and handle the response
        (async () => {
            try {
                // Extract hostname before calling the function for maximum reliability
                let explicitHostname = message.hostname;
                
                // If no explicit hostname provided, try to extract it
                if (!explicitHostname) {
                    try {
                        const tempUrl = new URL(message.url.startsWith('http') ? message.url : 'https://' + message.url);
                        explicitHostname = tempUrl.hostname;
                        console.log("Extracted hostname from message URL:", explicitHostname);
                    } catch (e) {
                        console.error("Could not extract hostname from URL:", e);
                        // Try to extract manually
                        explicitHostname = message.url.replace(/^https?:\/\//, '').split('/')[0];
                        console.log("Manually extracted hostname:", explicitHostname);
                    }
                }
                
                // Call the handleTemporaryOverride function
                const result = await handleTemporaryOverride(message.url, fromChallenge);
                
                // Add the redirect URL to the response
                if (result.success) {
                    // CRITICAL: Construct the best possible redirect URL
                    let finalRedirectUrl = null;
                    let redirectUrlSet = false;
                    
                    // First priority: use the hostname directly from message or our extraction
                    if (explicitHostname && 
                        explicitHostname.trim() !== '' && 
                        !explicitHostname.includes('chrome-extension') && 
                        !explicitHostname.includes('debug.html')) {
                        finalRedirectUrl = 'https://' + explicitHostname;
                        console.log("Setting redirect URL from explicit hostname:", finalRedirectUrl);
                        redirectUrlSet = true;
                    }
                    // Second priority: use the hostname from the result
                    else if (result.hostname && 
                             result.hostname.trim() !== '' && 
                             !result.hostname.includes('chrome-extension') && 
                             !result.hostname.includes('debug.html')) {
                        finalRedirectUrl = 'https://' + result.hostname;
                        console.log("Setting redirect URL from result hostname:", finalRedirectUrl);
                        redirectUrlSet = true;
                    }
                    // Third priority: use the processed URL from the result if available
                    else if (result.processedUrl && 
                            !result.processedUrl.includes('chrome-extension://') && 
                            !result.processedUrl.includes('debug.html')) {
                        finalRedirectUrl = result.processedUrl;
                        console.log("Setting redirect URL from processed URL:", finalRedirectUrl);
                        redirectUrlSet = true;
                    }
                    // Fourth priority: use the original URL
                    else if (message.url && 
                            !message.url.includes('chrome-extension://') && 
                            !message.url.includes('debug.html')) {
                        // Format URL with protocol if missing
                        let redirectUrl = message.url;
                        if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
                            redirectUrl = 'https://' + redirectUrl;
                        }
                        finalRedirectUrl = redirectUrl;
                        console.log("Setting redirect URL from original message URL:", finalRedirectUrl);
                        redirectUrlSet = true;
                    }
                    
                    // If we still don't have a valid redirect URL, use the first blocked website
                    if (!redirectUrlSet || 
                        !finalRedirectUrl || 
                        finalRedirectUrl.includes('chrome-extension://') || 
                        finalRedirectUrl.includes('debug.html')) {
                        
                        try {
                            const data = await chrome.storage.local.get(['blockedWebsites']);
                            if (data.blockedWebsites && data.blockedWebsites.length > 0) {
                                // Find first non-empty site
                                for (const site of data.blockedWebsites) {
                                    if (site && site.trim() !== '') {
                                        // Check that it's a real external site
                                        if (!site.includes('chrome-extension://') && !site.includes('debug.html')) {
                                            finalRedirectUrl = site.startsWith('http') ? site : 'https://' + site;
                                            console.log("Using blocked site as redirect:", finalRedirectUrl);
                                            redirectUrlSet = true;
                                            break;
                                        }
                                    }
                                }
                                
                                // If we still don't have a valid URL (unlikely at this point)
                                if (!redirectUrlSet) {
                                    // Absolute fallback - use a known blocked site
                                    finalRedirectUrl = 'https://youtube.com';
                                    console.log("Using guaranteed fallback site:", finalRedirectUrl);
                                    redirectUrlSet = true;
                                }
                            } else {
                                // No blocked sites found, use guaranteed fallback
                                finalRedirectUrl = 'https://youtube.com';
                                console.log("No blocked sites found, using fallback site:", finalRedirectUrl);
                                redirectUrlSet = true;
                            }
                        } catch (e) {
                            console.error("Error getting blocked sites for redirect:", e);
                            finalRedirectUrl = 'https://youtube.com';
                            redirectUrlSet = true;
                        }
                    }
                    
                    // Final safety check - ensure protocol is present
                    if (finalRedirectUrl && !finalRedirectUrl.startsWith('http')) {
                        finalRedirectUrl = 'https://' + finalRedirectUrl;
                    }
                    
                    // One last validation check
                    if (!finalRedirectUrl || finalRedirectUrl.includes('chrome-extension://') || finalRedirectUrl.includes('debug.html')) {
                        console.warn("Final URL validation failed, forcing to youtube.com");
                        finalRedirectUrl = 'https://youtube.com';
                    }
                    
                    // Set the redirect URL in the result
                    result.redirectUrl = finalRedirectUrl;
                    console.log("Final redirect URL being sent to client:", finalRedirectUrl);
                }
                
                console.log("Override result:", result);
                sendResponse(result);
            } catch (error) {
                console.error("Override error:", error);
                sendResponse({ 
                    success: false, 
                    error: error.message || "Unknown error processing override" 
                });
            }
        })();
        
        return true; // Keep the message channel open for async response
    }
    
    // Handle data from popup or webapp
    if (message.timerState || message.blockedWebsites !== undefined) {
        console.log("Received updated data from popup/webapp");
        
        if (message.timerState) {
            updateTimerState(message.timerState);
        }
        
        if (message.blockedWebsites !== undefined) {
            updateBlockedWebsites(message.blockedWebsites);
        }
        
        sendResponse({ success: true });
        return true;
    }
    
    // Default response for unhandled messages
    sendResponse({ success: false, error: 'Unknown message type' });
    return true;
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm fired:", alarm.name);
    
    // Handle timer countdown alarm
    if (alarm.name === timerState.alarmName) {
        if (timerState.timeRemaining > 0) {
            timerState.timeRemaining--;
            console.log("Timer countdown:", timerState.timeRemaining);
            
            // Create a new alarm for the next second
            chrome.alarms.create(timerState.alarmName, { delayInMinutes: 1/60 });
            
            // Save state periodically (every 30 seconds)
            if (timerState.timeRemaining % 30 === 0) {
                saveState();
            }
            
            // Notify content scripts of the updated timer
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    try {
                        chrome.tabs.sendMessage(tab.id, { 
                            action: 'timerUpdate', 
                            timerState: timerState 
                        }).catch(() => {
                            // Ignore errors from tabs that don't have content scripts
                        });
                    } catch (error) {
                        // Ignore errors from tabs that can't receive messages
                    }
                });
            });
            
        } else {
            // Timer has reached zero
            console.log("Timer reached zero");
            
            // Switch between work and break modes
            if (timerState.isWorkInterval) {
                switchToBreakInterval();
            } else {
                switchToWorkInterval();
            }
        }
    }
    
    // Handle override expiration
    if (alarm.name === 'expireOverride') {
        console.log("Override period expired, clearing temporary allowed sites");
        overrideState.temporaryAllowedSites = [];
        saveState();
        
        // Force update blocking rules to apply new restrictions
        updateBlockingRules().then(() => {
            console.log("Blocking rules updated after override expiration");
            
            // Notify active tabs that the override has expired
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    try {
                        // Only send to non-extension tabs
                        if (tab.url && !tab.url.startsWith('chrome-extension://')) {
                            chrome.tabs.sendMessage(tab.id, { 
                                action: 'overrideExpired'
                            }).catch(() => {
                                // Ignore errors from tabs that don't have content scripts
                            });
                        }
                    } catch (error) {
                        // Ignore errors from tabs that can't receive messages
                    }
                });
            });
        });
    }
});

// Initialize the extension
async function init() {
    // Load stored state
    await loadState();
    
    // Set up web request blocking
    await updateBlockingRules();
    
    // Listen for tab updates to make sure previously opened tabs are also checked
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url && blockingEnabled) {
            checkAndBlockTab(tab);
        }
    });
    
    // Debug log - print current state
    console.log("Extension initialized with state:", { 
        timerState, 
        blockedWebsites, 
        blockingEnabled,
        overrideState
    });
}

// Load state from storage
async function loadState() {
    try {
        console.log("Loading state from storage");
        const data = await chrome.storage.local.get([
            'timerState', 
            'blockedWebsites', 
            'blockingEnabled',
            'overrideState'
        ]);
        
        // Update timer state
        if (data.timerState) {
            timerState = {...timerState, ...data.timerState};
            console.log("Loaded timer state from storage:", timerState);
        }
        
        // Update blocked websites
        if (data.blockedWebsites) {
            blockedWebsites = data.blockedWebsites;
            console.log("Loaded blocked websites from storage:", blockedWebsites);
        }
        
        // Update blocking enabled state
        if (data.blockingEnabled !== undefined) {
            blockingEnabled = data.blockingEnabled;
            console.log("Loaded blocking enabled state from storage:", blockingEnabled);
        } else {
            // Default to true if not set
            blockingEnabled = true;
        }
        
        // Update override state
        if (data.overrideState) {
            overrideState = data.overrideState;
            console.log("Loaded override state from storage:", overrideState);
        }
        
        // Apply the state
        await updateBlockingRules();
        updateExtensionIcon();
    } catch (error) {
        console.error("Error loading state from storage:", error);
    }
}

// Update timer state with data from the web app
function updateTimerState(data) {
    console.log("Updating timer state with:", data);
    
    // Clear existing alarm if running
    if (timerState.isRunning) {
        chrome.alarms.clear(timerState.alarmName);
    }
    
    // Update state
    timerState.isRunning = data.isRunning;
    timerState.isWorkInterval = data.isWorkInterval;
    timerState.timeRemaining = data.timeRemaining;
    timerState.workInterval = data.workInterval;
    timerState.breakInterval = data.breakInterval;
    
    // If timer is running, set new alarm
    if (timerState.isRunning) {
        startTimer();
    }
    
    // Update blocking enabled state
    const oldBlockingEnabled = blockingEnabled;
    blockingEnabled = timerState.isRunning && timerState.isWorkInterval;
    
    console.log("Blocking state updated:", { 
        oldBlockingEnabled, 
        newBlockingEnabled: blockingEnabled 
    });
    
    // If blocking state changed, update rules
    if (oldBlockingEnabled !== blockingEnabled) {
        updateBlockingRules();
    }
    
    // Save updated state
    saveState();
}

// Update blocked websites list
function updateBlockedWebsites(websites) {
    if (Array.isArray(websites)) {
        console.log("Updating blocked websites:", websites);
        blockedWebsites = websites;
        saveState();
        
        // Update blocking rules if enabled
        if (blockingEnabled) {
            updateBlockingRules();
        }
    }
}

// Start the timer
function startTimer() {
    // Set the alarm
    const delayInMinutes = timerState.timeRemaining / 60;
    chrome.alarms.create(timerState.alarmName, { delayInMinutes });
    
    // Update icon to indicate timer is running
    updateExtensionIcon();
}

// Switch to break interval
function switchToBreakInterval() {
    timerState.isWorkInterval = false;
    timerState.timeRemaining = timerState.breakInterval;
    
    // Show notification
    showNotification(
        'Break Time!',
        `Time for a ${Math.floor(timerState.breakInterval / 60)} minute break.`
    );
    
    // If timer should continue running, start the break timer
    if (timerState.isRunning) {
        startTimer();
    }
    
    // Update icon
    updateExtensionIcon();
    
    // Disable blocking during break
    blockingEnabled = false;
    updateBlockingRules();
    
    // Save state
    saveState();
}

// Switch to work interval
function switchToWorkInterval() {
    timerState.isWorkInterval = true;
    timerState.timeRemaining = timerState.workInterval;
    
    // Show notification
    showNotification(
        'Focus Time!',
        `Time to focus for ${Math.floor(timerState.workInterval / 60)} minutes.`
    );
    
    // If timer should continue running, start the work timer
    if (timerState.isRunning) {
        startTimer();
    }
    
    // Update icon
    updateExtensionIcon();
    
    // Enable blocking during work
    blockingEnabled = timerState.isRunning;
    updateBlockingRules();
    
    // Save state
    saveState();
}

// Show notification
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message
    });
}

// Update extension icon based on current state
function updateExtensionIcon() {
    // In a real extension, you would have different icons for different states
    // For simplicity, we'll just update the title for now
    let title = 'FocusFlow';
    
    if (timerState.isRunning) {
        title += timerState.isWorkInterval ? ' - Working' : ' - Break';
    }
    
    chrome.action.setTitle({ title });
}

// Update blocking rules based on current state and blocked websites
async function updateBlockingRules() {
    console.log("Updating blocking rules. Enabled:", blockingEnabled, "Websites:", blockedWebsites);
    
    try {
        // First, remove all dynamic rules
        const currentRuleIds = await getDynamicRuleIds();
        if (currentRuleIds.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: currentRuleIds
            });
            console.log("Removed existing rules:", currentRuleIds);
        }

        // If blocking is not enabled or no websites to block, we're done
        if (!blockingEnabled || blockedWebsites.length === 0) {
            console.log("Blocking disabled or no websites to block");
            return;
        }

        // Create new rules for each blocked website
        const newRules = [];
        let ruleCounter = 0;  // Add a counter to ensure unique IDs

        for (let i = 0; i < blockedWebsites.length; i++) {
            const site = blockedWebsites[i];
            
            // Skip empty entries
            if (!site.trim()) continue;
            
            // Clean up the URL for matching
            let cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '');
            
            // Remove trailing slashes
            cleanSite = cleanSite.replace(/\/+$/, '');
            
            // Note: We can't directly pass the original URL to blocked.html with declarativeNetRequest
            // But we'll modify the blocked.html page to extract the hostname from its URL
            
            // Create simple domain matching rule (simplified for reliability)
            newRules.push({
                id: DYNAMIC_RULE_ID_START + ruleCounter++,  // Use counter for unique ID
                priority: 1,
                action: {
                    type: 'redirect',
                    redirect: {
                        extensionPath: '/blocked.html'
                    }
                },
                condition: {
                    urlFilter: cleanSite,
                    resourceTypes: ['main_frame']
                }
            });
            
            // Add a www. version if not present
            if (!cleanSite.startsWith('www.')) {
                newRules.push({
                    id: DYNAMIC_RULE_ID_START + ruleCounter++,  // Use counter for unique ID
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: {
                            extensionPath: '/blocked.html'
                        }
                    },
                    condition: {
                        urlFilter: 'www.' + cleanSite,
                        resourceTypes: ['main_frame']
                    }
                });
            }
        }

        // Add the new rules
        if (newRules.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: newRules
            });
            console.log("Added new blocking rules:", newRules);
        }
        
        // Now check any open tabs to see if they should be blocked
        if (blockingEnabled) {
            checkAllTabs();
        }
    } catch (error) {
        console.error("Error updating blocking rules:", error);
    }
}

// Escape special characters for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get all current dynamic rule IDs
async function getDynamicRuleIds() {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.map(rule => rule.id);
}

// Check if a URL should be blocked and block it if needed
function checkUrlAndBlock(url, tabId) {
    console.log("Checking URL for blocking:", url);
    
    if (!url || url === '' || !blockingEnabled || url.startsWith('chrome-extension://')) {
        console.log("URL exempt from checking:", url);
        return false;
    }
    
    try {
        // Extract hostname for comparison
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        // Safeguard against blocking critical pages
        const criticalDomains = [
            'chrome.google.com',
            'addons.mozilla.org',
            'extensionworkshop.mozilla.org'
        ];
        
        if (criticalDomains.some(domain => hostname.includes(domain))) {
            console.log("URL is a critical page, not blocking:", url);
            return false;
        }
        
        // Check if this site has a temporary override
        if (overrideState.temporaryAllowedSites.some(site => {
            return hostname.includes(site) || site.includes(hostname);
        })) {
            console.log("URL has a current override, not blocking:", url);
            return false;
        }
        
        // Check if URL is in the blocked list
        for (const blockedSite of blockedWebsites) {
            // Normalize URLs for comparison
            const blockedSiteClean = blockedSite.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '');
            
            if (hostname.includes(blockedSiteClean) || blockedSiteClean.includes(hostname)) {
                console.log("URL matches blocked site:", blockedSiteClean);
                
                // Only block during work interval
                if (timerState.isWorkInterval) {
                    console.log("Work interval active, redirecting to blocked page");
                    
                    // Store the URL for potential use later
                    chrome.storage.local.set({ lastBlockedUrl: url });
                    
                    // Redirect to blocked page
                    chrome.tabs.update(tabId, {
                        url: chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(url)
                    });
                    
                    return true;
                } else {
                    console.log("Not blocking during break interval");
                    return false;
                }
            }
        }
    } catch (error) {
        console.error("Error checking URL:", error);
    }
    
    return false;
}

// Check if a tab should be blocked
function checkAndBlockTab(tab) {
    if (!tab || !tab.id) return;
    return checkUrlAndBlock(tab.url, tab.id);
}

// Check all open tabs
async function checkAllTabs() {
    console.log("Checking all open tabs for blocking");
    try {
        const tabs = await chrome.tabs.query({});
        console.log("Found tabs:", tabs.length);
        tabs.forEach(tab => {
            checkAndBlockTab(tab);
        });
    } catch (error) {
        console.error("Error checking tabs:", error);
    }
}

// Handle temporary override request from blocked.html
async function handleTemporaryOverride(url, fromChallenge = false) {
    console.log("Override requested for:", url, "From challenge:", fromChallenge);
    
    try {
        // Validate URL
        if (!url || url.trim() === '') {
            console.error("Empty URL provided for override");
            return {
                success: false,
                reason: 'invalid_url',
                error: 'Empty or invalid URL provided'
            };
        }
        
        // Try to extract just the hostname if a full URL with path is provided
        let cleanHostname = '';
        try {
            // Extract hostname regardless of URL format by trying multiple approaches
            if (url.includes('://')) {
                // It's likely a full URL
                cleanHostname = new URL(url).hostname;
            } else {
                // It might be just a domain or partial URL
                if (url.includes('/')) {
                    // Try to get just the domain part
                    cleanHostname = url.split('/')[0];
                } else {
                    // It might already be just a hostname
                    cleanHostname = url;
                }
            }
            
            console.log("Extracted clean hostname:", cleanHostname);
        } catch (error) {
            console.error("Error extracting hostname:", error);
            // Continue with original URL if we couldn't extract a hostname
        }
        
        // If hostname is invalid or from an extension page, try to get a hostname from the blocked list
        if (!cleanHostname || 
            cleanHostname.includes('chrome-extension') || 
            cleanHostname.includes('debug.html')) {
            
            try {
                const data = await chrome.storage.local.get(['blockedWebsites']);
                if (data.blockedWebsites && data.blockedWebsites.length > 0) {
                    const site = data.blockedWebsites.find(s => s && s.trim() !== '');
                    if (site) {
                        // Extract just the hostname part
                        cleanHostname = site.replace(/^https?:\/\//, '').split('/')[0];
                        console.log("Using hostname from blocked site list:", cleanHostname);
                    }
                }
            } catch (e) {
                console.error("Error getting blocked websites:", e);
            }
        }
        
        // Ensure URL has a protocol
        let processedUrl = url;
        if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
            processedUrl = 'https://' + processedUrl;
            console.log("Added protocol to URL:", processedUrl);
        }
        
        // Check if challenge was completed - required for override
        if (!fromChallenge) {
            console.log("Challenge not completed - override denied");
            return {
                success: false,
                reason: 'challenge_required',
                error: 'You must complete the challenge to access this site'
            };
        }
        
        // Add site to temporary allowed list
        let hostname;
        try {
            hostname = new URL(processedUrl).hostname;
            console.log("Extracted hostname from processed URL:", hostname);
        } catch (error) {
            console.error("Failed to parse URL:", error);
            // Use the clean hostname if extraction from URL failed
            if (cleanHostname) {
                hostname = cleanHostname;
                console.log("Using previously extracted hostname:", hostname);
            } else {
                hostname = url.replace(/^https?:\/\//, '').split('/')[0];
                console.log("Manually extracted hostname:", hostname);
                
                if (!hostname || hostname.includes('chrome-extension') || hostname.includes('debug.html')) {
                    console.error("Could not extract a valid hostname");
                    return {
                        success: false,
                        reason: 'invalid_url',
                        error: 'Could not determine a valid website to navigate to'
                    };
                }
            }
        }
        
        // Don't add duplicates
        if (!overrideState.temporaryAllowedSites.includes(hostname)) {
            overrideState.temporaryAllowedSites.push(hostname);
            console.log("Added to temporary allowed sites:", hostname);
            console.log("Current allowed sites:", overrideState.temporaryAllowedSites);
        } else {
            console.log("Site already in allowed list:", hostname);
        }
        
        // Set up an alarm to expire the override after 5 minutes
        chrome.alarms.create('expireOverride', { delayInMinutes: 5 });
        console.log("Set alarm to expire override in 5 minutes");
        
        // Find any existing tabs with this hostname and reload them
        try {
            chrome.tabs.query({}, (tabs) => {
                let reloadCount = 0;
                tabs.forEach((tab) => {
                    try {
                        if (tab.url && tab.url.includes(hostname)) {
                            console.log("Reloading tab with matching URL:", tab.id, tab.url);
                            chrome.tabs.reload(tab.id);
                            reloadCount++;
                        }
                    } catch (err) {
                        console.error("Error checking tab for reload:", err);
                    }
                });
                console.log(`Reloaded ${reloadCount} tabs with hostname ${hostname}`);
            });
        } catch (error) {
            console.error("Error reloading tabs:", error);
        }
        
        // Create a secure, reliable redirectUrl
        let redirectUrl = '';
        
        // Prioritize using valid hostnames for redirect
        if (hostname && 
            hostname.trim() !== '' && 
            !hostname.includes('chrome-extension') && 
            !hostname.includes('debug.html')) {
            redirectUrl = 'https://' + hostname;
            console.log("Using hostname for redirect URL:", redirectUrl);
        }
        // Only use processed URL if it's not an extension URL and it's a real URL
        else if (processedUrl && 
                processedUrl !== 'https://www.google.com' && 
                !processedUrl.includes('debug.html') && 
                !processedUrl.includes('chrome-extension://')) {
            redirectUrl = processedUrl;
            console.log("Using processed URL for redirect:", redirectUrl);
        }
        // Use clean hostname if available
        else if (cleanHostname && 
                 cleanHostname.trim() !== '' && 
                 !cleanHostname.includes('chrome-extension') && 
                 !cleanHostname.includes('debug.html')) {
            redirectUrl = 'https://' + cleanHostname;
            console.log("Using clean hostname for redirect:", redirectUrl);
        }
        // Final fallback - use a blocked website from storage
        else {
            console.log("No valid redirect URL found, using fallback");
            try {
                const data = await chrome.storage.local.get(['blockedWebsites']);
                if (data.blockedWebsites && data.blockedWebsites.length > 0) {
                    // Find the first non-empty site
                    const site = data.blockedWebsites.find(s => s && s.trim() !== '');
                    if (site) {
                        const siteUrl = site.startsWith('http') ? site : 'https://' + site;
                        redirectUrl = siteUrl;
                        console.log("Using blocked site for redirect:", redirectUrl);
                    }
                }
            } catch (e) {
                console.error("Error getting blocked websites for redirect:", e);
            }
        }
        
        // If we still don't have a valid URL, use youtube.com as a guaranteed fallback
        if (!redirectUrl || 
            redirectUrl === 'https://www.google.com' || 
            redirectUrl.includes('chrome-extension://') || 
            redirectUrl.includes('debug.html')) {
            redirectUrl = 'https://youtube.com';
            console.log("Using guaranteed fallback URL:", redirectUrl);
        }
        
        // Ensure URL has protocol
        if (!redirectUrl.startsWith('http')) {
            redirectUrl = 'https://' + redirectUrl;
        }
        
        console.log("Final redirect URL:", redirectUrl);
        
        // Save state
        await saveState();
        console.log("State saved after override");
        
        // Return success with all possible URL forms for the client to use
        console.log("Override granted for completing challenge");
        
        return {
            success: true,
            expiresIn: 5,
            hostname: hostname,
            originalUrl: url,
            processedUrl: processedUrl,
            redirectUrl: redirectUrl,
            cleanHostname: cleanHostname
        };
    } catch (error) {
        console.error("Error processing override:", error);
        return {
            success: false,
            reason: 'error',
            error: error.message || "Unknown error"
        };
    }
} 