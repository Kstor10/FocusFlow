// FocusFlow Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    const currentStatus = document.getElementById('current-status');
    const timerStatus = document.getElementById('timer-status');
    const blockingStatus = document.getElementById('blocking-status');
    const blockedSitesCount = document.getElementById('blocked-sites-count');
    const blockedSitesList = document.getElementById('blocked-sites-list');
    const toggleBlockingBtn = document.getElementById('toggle-blocking');
    const openWebappBtn = document.getElementById('open-webapp');
    const openDecisionQuickBtn = document.getElementById('open-decisonquick');
    const forceUpdateBtn = document.getElementById('force-update');
    const errorMessage = document.getElementById('error-message');
    const extensionId = document.getElementById('extension-id');
    const lastUpdated = document.getElementById('last-updated');
    const tokenDisplay = document.getElementById('token-display');
    const tokensRemaining = document.getElementById('tokens-remaining');
    
    // Display extension ID for debugging
    extensionId.textContent = chrome.runtime.id;
    
    // Update the UI with current state
    function updateUI(state) {
        if (!state) {
            currentStatus.textContent = 'Error loading state';
            return;
        }
        
        // Set current status
        if (state.timerState && state.timerState.isRunning) {
            currentStatus.textContent = state.timerState.isWorkInterval ? 'Working' : 'Break';
        } else {
            currentStatus.textContent = 'Idle';
        }
        
        // Set timer status
        if (state.timerState) {
            const minutes = Math.floor(state.timerState.timeRemaining / 60);
            const seconds = state.timerState.timeRemaining % 60;
            timerStatus.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            timerStatus.textContent = '--:--';
        }
        
        // Set blocking status
        blockingStatus.textContent = state.blockingEnabled ? 'Enabled' : 'Disabled';
        toggleBlockingBtn.textContent = state.blockingEnabled ? 'Disable Blocking' : 'Enable Blocking';
        
        // Set blocked sites
        if (state.blockedWebsites && state.blockedWebsites.length > 0) {
            blockedSitesCount.textContent = `${state.blockedWebsites.length} website(s) blocked`;
            
            // Clear and repopulate the list
            blockedSitesList.innerHTML = '';
            state.blockedWebsites.forEach(site => {
                if (!site.trim()) return; // Skip empty entries
                
                const li = document.createElement('li');
                li.textContent = site;
                blockedSitesList.appendChild(li);
            });
        } else {
            blockedSitesCount.textContent = 'No websites blocked';
            blockedSitesList.innerHTML = '';
        }
        
        // Update last updated timestamp
        lastUpdated.textContent = new Date().toLocaleTimeString();
        
        // Update token display if available
        if (state.overrideTokens) {
            updateTokenDisplay(state.overrideTokens);
        } else {
            // If not available in state, request token info separately
            requestTokenInfo();
        }
    }
    
    // Update token display
    function updateTokenDisplay(tokenData) {
        if (!tokenData) return;
        
        const remaining = tokenData.remaining;
        const maxDaily = tokenData.maxDaily;
        
        // Update the token visual display
        tokenDisplay.innerHTML = '';
        for (let i = 0; i < maxDaily; i++) {
            const token = document.createElement('div');
            token.className = i < remaining ? 'token active' : 'token used';
            tokenDisplay.appendChild(token);
        }
        
        // Update the text display
        tokensRemaining.textContent = remaining;
    }
    
    // Request token information from background script
    function requestTokenInfo() {
        chrome.runtime.sendMessage({ action: 'getTokens' }, (response) => {
            if (response && response.success && response.tokens) {
                updateTokenDisplay(response.tokens);
            }
        });
    }
    
    // Load initial state from background script
    try {
        // Get current state from storage
        chrome.storage.local.get(['timerState', 'blockedWebsites', 'blockingEnabled', 'overrideTokens'], (result) => {
            updateUI(result);
        });
    } catch (error) {
        errorMessage.textContent = `Error loading state: ${error.message}`;
    }
    
    // Toggle blocking status
    toggleBlockingBtn.addEventListener('click', () => {
        chrome.storage.local.get(['blockingEnabled'], (result) => {
            const newBlockingEnabled = !result.blockingEnabled;
            
            // Send message to background script to update blocking status
            chrome.runtime.sendMessage(
                { action: 'setBlockingEnabled', enabled: newBlockingEnabled },
                (response) => {
                    if (chrome.runtime.lastError) {
                        errorMessage.textContent = `Error: ${chrome.runtime.lastError.message}`;
                    } else if (response && response.success) {
                        // Refresh UI after update
                        chrome.storage.local.get(['timerState', 'blockedWebsites', 'blockingEnabled', 'overrideTokens'], (result) => {
                            updateUI(result);
                        });
                        
                        errorMessage.textContent = '';
                    } else {
                        errorMessage.textContent = 'Failed to update blocking status';
                    }
                }
            );
        });
    });
    
    // Open the web app
    openWebappBtn.addEventListener('click', () => {
        // Chrome requires absolute URL for opening tabs
        const webappUrl = chrome.runtime.getURL('webapp/index.html');
        chrome.tabs.create({ url: webappUrl });
    });
    
    // Open DecisionQuick Matrix
    openDecisionQuickBtn.addEventListener('click', () => {
        const webappUrl = chrome.runtime.getURL('webapp/index.html');
        chrome.tabs.create({ url: webappUrl + '#dq-module' });
    });
    
    // Force update of blocking rules
    forceUpdateBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'forceUpdateRules' }, (response) => {
            if (chrome.runtime.lastError) {
                errorMessage.textContent = `Error: ${chrome.runtime.lastError.message}`;
            } else if (response && response.success) {
                errorMessage.textContent = '';
                
                // Refresh UI after update
                chrome.storage.local.get(['timerState', 'blockedWebsites', 'blockingEnabled', 'overrideTokens'], (result) => {
                    updateUI(result);
                });
            } else {
                errorMessage.textContent = 'Failed to update rules';
            }
        });
    });
    
    // Message listener for updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'stateUpdated') {
            // Refresh the UI
            chrome.storage.local.get(['timerState', 'blockedWebsites', 'blockingEnabled', 'overrideTokens'], (result) => {
                updateUI(result);
            });
        }
        
        sendResponse({ received: true });
        return true;
    });
}); 