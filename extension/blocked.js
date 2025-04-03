// FocusFlow Blocked Page Script
document.addEventListener('DOMContentLoaded', () => {
    console.log('Blocked page script loaded');
    
    // DOM Elements
    const backBtn = document.getElementById('back-btn');
    const overrideBtn = document.getElementById('override-btn');
    const overrideOptions = document.getElementById('override-options');
    const challengeContainer = document.getElementById('challenge-container');
    const challengeText = document.getElementById('challenge-text');
    const challengeInput = document.getElementById('challenge-input');
    const challengeProgressBar = document.getElementById('challenge-progress-bar');
    const backFromChallengeBtn = document.getElementById('back-from-challenge-btn');
    const completeChallengeBtn = document.getElementById('complete-challenge-btn');
    const overrideConfirmation = document.getElementById('override-confirmation');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    // State
    let referrerUrl = '';
    let challengeCompleted = false;
    
    // Get the blocked URL - try multiple methods for reliability
    function getBlockedUrl() {
        // Try to get URL from the query string first (most reliable)
        const urlParams = new URLSearchParams(window.location.search);
        const blockedUrl = urlParams.get('url');
        
        if (blockedUrl) {
            console.log('Got blocked URL from query parameter:', blockedUrl);
            
            // Store in localStorage for future use
            try {
                localStorage.setItem('last_blocked_url', blockedUrl);
            } catch (e) {
                console.error('Error storing blocked URL in localStorage:', e);
            }
            
            return blockedUrl;
        }
        
        // Check localStorage for a previously stored URL
        try {
            const storedUrl = localStorage.getItem('last_blocked_url');
            if (storedUrl && !storedUrl.includes('chrome-extension://') && !storedUrl.includes('debug.html')) {
                console.log('Found URL in localStorage:', storedUrl);
                return storedUrl;
            }
            
            const overrideTarget = localStorage.getItem('last_override_target');
            if (overrideTarget && !overrideTarget.includes('chrome-extension://') && !overrideTarget.includes('debug.html')) {
                console.log('Found override target in localStorage:', overrideTarget);
                return overrideTarget;
            }
        } catch (e) {
            console.error('Error checking localStorage:', e);
        }
        
        // Synchronously try to extract hostname from a blocked website list
        let blockedSiteUrl = '';
        chrome.storage.local.get(['blockedWebsites'], function(result) {
            if (result.blockedWebsites && result.blockedWebsites.length > 0) {
                let site = result.blockedWebsites.find(s => s && s.trim() !== '');
                if (site) {
                    if (!site.startsWith('http://') && !site.startsWith('https://')) {
                        site = 'https://' + site;
                    }
                    console.log('Found blocked site in storage:', site);
                    blockedSiteUrl = site;
                    
                    // Update referrerUrl for immediate use since this function will have already returned
                    referrerUrl = site;
                }
            }
        });
        
        // Check chrome.storage for the last URL (set by content script)
        chrome.storage.local.get(['lastBlockedUrl'], function(result) {
            if (result.lastBlockedUrl) {
                console.log('Found lastBlockedUrl in storage:', result.lastBlockedUrl);
                referrerUrl = result.lastBlockedUrl;
                // The function will have already returned, but we update for future use
            }
        });
        
        // Fall back to referrer
        if (document.referrer && document.referrer !== '') {
            console.log('Using referrer URL:', document.referrer);
            return document.referrer;
        }
        
        // If we still don't have a URL, try to extract it from the current tab URL
        // This happens when blocked by declarative rules
        try {
            // Get the current tab URL to recreate the original URL
            const currentUrl = window.location.href;
            console.log('Current URL:', currentUrl);
            
            // Try to determine what was blocked from browser tabs
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs.length > 0) {
                    console.log('Current tab:', tabs[0]);
                    if (tabs[0].url && tabs[0].url.includes('blocked.html')) {
                        console.log('Tab URL contains blocked.html');
                    }
                }
            });
            
            // If we're in a chrome-extension:// URL for blocked.html, check if any sites are currently blocked
            if (currentUrl.includes('blocked.html')) {
                // Get the list of blocked sites
                chrome.storage.local.get(['blockedWebsites'], function(result) {
                    if (result.blockedWebsites && result.blockedWebsites.length > 0) {
                        console.log('Blocked websites:', result.blockedWebsites);
                        
                        // For debugging only
                        const firstBlockedSite = result.blockedWebsites[0];
                        if (firstBlockedSite) {
                            console.log('First blocked site:', firstBlockedSite);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error getting tab URL:', error);
        }
        
        // Ask storage for lastVisitedUrl as final attempt
        chrome.storage.local.get(['lastVisitedUrl'], function(result) {
            if (result.lastVisitedUrl) {
                console.log('Found lastVisitedUrl in storage:', result.lastVisitedUrl);
                referrerUrl = result.lastVisitedUrl;
            }
        });
        
        // Use blockedSiteUrl if we found one in storage
        if (blockedSiteUrl) {
            console.log('Using blocked site URL found in storage:', blockedSiteUrl);
            return blockedSiteUrl;
        }
        
        // Default fallback - we'll improve this with blocked sites list
        console.log('No URL found, returning fallback');
        
        return 'https://www.google.com';
    }
    
    // Set the initial referrer URL
    referrerUrl = getBlockedUrl();
    console.log('Initial referrer URL:', referrerUrl);
    
    // Display the blocked domain
    updateBlockedDomainInfo(referrerUrl);
    
    // Get timer state from extension
    chrome.storage.local.get(['timerState'], (result) => {
        if (result.timerState) {
            updateTimerDisplay(result.timerState);
        } else {
            console.log('No timer state found');
        }
    });
    
    // Set up button actions
    backBtn.addEventListener('click', () => {
        console.log('Back button clicked');
        try {
            if (document.referrer && document.referrer !== '') {
                console.log('Going back to:', document.referrer);
                history.back();
            } else {
                // If no referrer, try the original blocked URL
                if (referrerUrl && referrerUrl !== '' && 
                   !referrerUrl.includes('chrome-extension://') && 
                   !referrerUrl.includes('blocked.html')) {
                    console.log('No referrer, but we have a URL to go to:', referrerUrl);
                    window.location.href = referrerUrl;
                } else {
                    // If all else fails, go to Google
                    console.log('No valid URL to go back to, going to Google');
                    window.location.href = 'https://www.google.com';
                }
            }
        } catch (error) {
            console.error('Error navigating back:', error);
            window.location.href = 'https://www.google.com';
        }
    });
    
    overrideBtn.addEventListener('click', () => {
        console.log('Override button clicked, showing challenge');
        showChallenge();
    });
    
    backFromChallengeBtn.addEventListener('click', () => {
        console.log('Back from challenge button clicked');
        challengeContainer.classList.add('hidden');
        overrideOptions.classList.remove('hidden');
    });
    
    completeChallengeBtn.addEventListener('click', () => {
        console.log('Complete challenge button clicked');
        if (challengeCompleted) {
            completeChallengeBtn.disabled = true;
            completeChallengeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            requestOverride(true);
        } else {
            console.error('Challenge not completed but button was clicked');
        }
    });
    
    // Challenge input logic
    challengeInput.addEventListener('input', () => {
        const input = challengeInput.value;
        const target = challengeText.textContent;
        
        // Calculate match percentage
        const percentage = calculateMatchPercentage(input, target);
        console.log('Challenge match percentage:', percentage);
        
        // Update progress bar
        challengeProgressBar.style.width = `${percentage}%`;
        
        // Complete at 90% match to account for tiny typos
        if (percentage >= 90) {
            console.log('Challenge completed!');
            challengeCompleted = true;
            completeChallengeBtn.disabled = false;
            challengeInput.classList.add('challenge-success');
        } else {
            challengeCompleted = false;
            completeChallengeBtn.disabled = true;
            challengeInput.classList.remove('challenge-success');
        }
    });
    
    // Helper function to show challenge
    function showChallenge() {
        overrideOptions.classList.add('hidden');
        challengeContainer.classList.remove('hidden');
        challengeInput.focus();
    }
    
    // Request override from extension
    function requestOverride(fromChallenge) {
        console.log('Requesting override, fromChallenge:', fromChallenge);
        
        // First, show a loading state or disable buttons to prevent multiple clicks
        if (fromChallenge) {
            completeChallengeBtn.disabled = true;
            completeChallengeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        } else {
            overrideBtn.disabled = true;
            overrideBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
        
        // Get the blocked site from storage directly first
        chrome.storage.local.get(['blockedWebsites'], function(result) {
            // Make sure we have a valid URL before proceeding
            if (!referrerUrl || 
                referrerUrl === '' || 
                referrerUrl === 'https://www.google.com' || 
                referrerUrl.includes('chrome-extension://') || 
                referrerUrl.includes('debug.html')) {
                
                console.log('No valid URL available in referrerUrl:', referrerUrl);
                
                // Try to use a blocked site from the list instead
                if (result.blockedWebsites && result.blockedWebsites.length > 0) {
                    // Get the first non-empty site
                    let site = result.blockedWebsites.find(s => s && s.trim() !== '');
                    
                    if (site) {
                        // Format the URL properly
                        if (!site.startsWith('http://') && !site.startsWith('https://')) {
                            site = 'https://' + site;
                        }
                        console.log('Using blocked site from list:', site);
                        
                        // Set as our target and continue
                        referrerUrl = site;
                        proceedWithOverride(true); // Always treat as challenge completion
                    } else {
                        showError('No site URL to override - no blocked sites in list');
                        resetButtons();
                    }
                } else {
                    showError('No site URL to override - please try reloading the page');
                    resetButtons();
                }
            } else {
                // We have a valid URL, proceed
                proceedWithOverride(true); // Always treat as challenge completion
            }
        });
        
        function proceedWithOverride(fromChallenge) {
            // Display the URL we're trying to override for debugging
            console.log('Attempting to override access to URL:', referrerUrl);
            
            // Clean URL format - ensure it starts with http/https
            if (!referrerUrl.startsWith('http://') && !referrerUrl.startsWith('https://')) {
                referrerUrl = 'https://' + referrerUrl;
                console.log('Updated URL format:', referrerUrl);
            }
            
            // Extract hostname for logging and potential use
            let hostname;
            try {
                const urlObj = new URL(referrerUrl);
                hostname = urlObj.hostname;
                console.log('Extracted hostname for override:', hostname);
                
                // Clean up the hostname (remove www. if present)
                hostname = hostname.replace(/^www\./, '');
            } catch (error) {
                console.error('Error extracting hostname:', error);
                
                // If URL parsing failed, try to extract hostname manually
                hostname = referrerUrl.replace(/^https?:\/\//, '').split('/')[0];
                hostname = hostname.replace(/^www\./, '');
                console.log('Manually extracted hostname:', hostname);
            }
            
            // Clear any existing error
            errorMessage.classList.add('hidden');
            
            // Create the message
            const message = { 
                action: 'temporaryOverride', 
                url: referrerUrl,
                hostname: hostname, // Explicitly pass hostname
                fromChallenge: fromChallenge // Always true now
            };
            
            console.log('Sending override message:', message);
            
            // Set a timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                console.error('Override request timed out');
                showError('Request timed out. Please try again.');
                resetButtons();
            }, 8000);
            
            chrome.runtime.sendMessage(message, (response) => {
                console.log('Override response received:', response);
                
                // Clear the timeout since we got a response
                clearTimeout(timeoutId);
                
                // Check for runtime errors first
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError);
                    showError("Extension error: " + chrome.runtime.lastError.message);
                    resetButtons();
                    return;
                }
                
                if (response && response.success) {
                    // Show success message
                    console.log('Override successful');
                    overrideOptions.classList.add('hidden');
                    challengeContainer.classList.add('hidden');
                    overrideConfirmation.classList.remove('hidden');
                    
                    // Set session flag for immediate redirection on next page load
                    try {
                        sessionStorage.setItem('override_success', 'true');
                    } catch (e) {
                        console.error('Error setting session storage flag:', e);
                    }
                    
                    // Determine the final redirect URL
                    let redirectTarget = '';
                    
                    // First priority: use the cleaned hostname
                    if (hostname && hostname.trim() !== '') {
                        redirectTarget = 'https://' + hostname;
                        console.log('Using cleaned hostname for redirect:', redirectTarget);
                    }
                    // Second priority: use response.redirectUrl if it's valid
                    else if (response.redirectUrl && 
                            !response.redirectUrl.includes('chrome-extension://') && 
                            !response.redirectUrl.includes('debug.html')) {
                        redirectTarget = response.redirectUrl;
                        console.log('Using response.redirectUrl:', redirectTarget);
                    }
                    // Third priority: use the referrer URL
                    else if (referrerUrl && 
                            !referrerUrl.includes('chrome-extension://') && 
                            !referrerUrl.includes('debug.html')) {
                        redirectTarget = referrerUrl;
                        console.log('Using referrerUrl:', redirectTarget);
                    }
                    // Last resort: use response hostname
                    else if (response.hostname) {
                        redirectTarget = 'https://' + response.hostname;
                        console.log('Using response.hostname:', redirectTarget);
                    }
                    
                    // If we still don't have a valid redirect target, try to get one from storage
                    if (!redirectTarget || 
                        redirectTarget.includes('chrome-extension://') || 
                        redirectTarget.includes('debug.html')) {
                        chrome.storage.local.get(['blockedWebsites'], function(result) {
                            if (result.blockedWebsites && result.blockedWebsites.length > 0) {
                                let site = result.blockedWebsites[0];
                                if (!site.startsWith('http://') && !site.startsWith('https://')) {
                                    site = 'https://' + site;
                                }
                                redirectTarget = site;
                                console.log('Using first blocked site as redirect target:', redirectTarget);
                                completeRedirect(redirectTarget);
                            } else {
                                showError('Could not determine redirect target');
                                resetButtons();
                            }
                        });
                    } else {
                        // We have a valid redirect target, proceed with the redirect
                        completeRedirect(redirectTarget);
                    }
                } else {
                    // Handle error
                    let errorMsg = 'Unable to override block. Please try again.';
                    
                    if (response) {
                        if (response.error) {
                            errorMsg = response.error;
                        } else if (response.message) {
                            errorMsg = response.message;
                        }
                        console.log("Override failed", response);
                    } else {
                        console.error("No response from background script");
                        errorMsg = "No response from extension. Try reloading the page.";
                    }
                    
                    showError(errorMsg);
                    resetButtons();
                }
            });
        }
        
        function completeRedirect(redirectTarget) {
            console.log('Final redirect target:', redirectTarget);
            
            // Ensure we have a valid URL with protocol
            if (!redirectTarget.startsWith('http://') && !redirectTarget.startsWith('https://')) {
                redirectTarget = 'https://' + redirectTarget;
            }
            
            // Parse the URL to get the hostname
            let hostname;
            try {
                const urlObj = new URL(redirectTarget);
                hostname = urlObj.hostname;
            } catch (e) {
                console.error('Error parsing URL:', e);
                hostname = redirectTarget.replace(/^https?:\/\//, '').split('/')[0];
            }
            
            // Make sure the confirmation section is visible
            overrideConfirmation.classList.remove('hidden');
            
            // Clear any existing redirect elements
            const redirectContainer = document.getElementById('redirect-target-container');
            if (!redirectContainer) {
                console.error('Redirect container not found!');
                return;
            }
            redirectContainer.innerHTML = '';
            
            // Create the main redirect button
            const redirectButton = document.createElement('button');
            redirectButton.className = 'redirect-button';
            redirectButton.innerHTML = `<i class="fas fa-external-link-alt"></i> Visit ${hostname}`;
            redirectButton.onclick = function(e) {
                e.preventDefault();
                console.log('Redirect button clicked, navigating to:', redirectTarget);
                window.location.href = redirectTarget;
            };
            
            // Create the backup link
            const redirectLink = document.createElement('a');
            redirectLink.href = redirectTarget;
            redirectLink.className = 'redirect-link';
            redirectLink.textContent = `Click here to visit ${hostname}`;
            redirectLink.onclick = function(e) {
                e.preventDefault();
                console.log('Redirect link clicked, navigating to:', redirectTarget);
                window.location.href = redirectTarget;
            };
            
            // Add both elements to the container
            redirectContainer.appendChild(redirectButton);
            redirectContainer.appendChild(redirectLink);
            
            // Store the target for future use
            try {
                localStorage.setItem('last_override_target', redirectTarget);
                sessionStorage.setItem('override_success', 'true');
                console.log('Stored redirect target:', redirectTarget);
            } catch (e) {
                console.error('Could not store redirect target:', e);
            }
            
            // Create a countdown element
            const countdownElement = document.createElement('div');
            countdownElement.className = 'redirect-countdown';
            countdownElement.textContent = 'Auto-redirecting in 3 seconds...';
            redirectContainer.appendChild(countdownElement);
            
            // Set up countdown for automatic redirect
            let countdown = 3;
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    countdownElement.textContent = 'Redirecting now...';
                    console.log('Countdown finished, redirecting to:', redirectTarget);
                    window.location.href = redirectTarget;
                } else {
                    countdownElement.textContent = `Auto-redirecting in ${countdown} seconds...`;
                }
            }, 1000);
            
            // Backup redirect after a delay in case the interval fails
            setTimeout(() => {
                if (window.location.href.includes('blocked.html')) {
                    console.log('Backup redirect triggered, navigating to:', redirectTarget);
                    window.location.href = redirectTarget;
                }
            }, 4000);
        }
    }
    
    // Reset button states
    function resetButtons() {
        overrideBtn.disabled = false;
        overrideBtn.innerHTML = '<i class="fas fa-brain"></i> Complete Challenge to Access';
        
        completeChallengeBtn.disabled = !challengeCompleted;
        completeChallengeBtn.innerHTML = '<i class="fas fa-check"></i> Complete Challenge';
    }
    
    // Show error message
    function showError(message) {
        console.error('Error:', message);
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        
        // Reset buttons to ensure the user can try again
        resetButtons();
        
        // Show detailed information in console for debugging
        console.debug('Current state:', {
            referrerUrl: referrerUrl,
            challengeCompleted: challengeCompleted
        });
        
        // Hide after 8 seconds
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 8000);
    }
    
    // Update blocked domain information
    function updateBlockedDomainInfo(url) {
        const blockedDomainElement = document.getElementById('blocked-domain');
        
        if (!url || url === 'https://www.google.com') {
            blockedDomainElement.textContent = 'Unknown domain';
            
            // Try to get blocked domain from storage
            chrome.storage.local.get(['blockedWebsites'], function(result) {
                if (result.blockedWebsites && result.blockedWebsites.length > 0) {
                    // Format the list of blocked sites for display
                    const sitesText = result.blockedWebsites
                        .filter(site => site.trim() !== '')
                        .map(site => {
                            // Clean up the site name for display
                            return site.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '');
                        })
                        .join(', ');
                    
                    if (sitesText) {
                        blockedDomainElement.innerHTML = `This page is part of your blocked sites list.<br><strong>${sitesText}</strong>`;
                    }
                }
            });
            return;
        }
        
        try {
            // Try to extract the hostname
            let hostname;
            try {
                hostname = new URL(url).hostname;
            } catch (error) {
                // If URL parsing fails, just use the raw URL (it might be just a hostname)
                hostname = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/+$/, '');
            }
            
            blockedDomainElement.innerHTML = `You are attempting to access:<br><strong>${hostname}</strong>`;
            
            // Also update the page title to show the blocked domain
            document.title = `${hostname} Blocked - FocusFlow`;
        } catch (error) {
            console.error('Error extracting hostname for display:', error);
            blockedDomainElement.textContent = 'Unknown domain';
        }
    }
    
    // Calculate match percentage for typing challenge
    function calculateMatchPercentage(input, target) {
        if (!target) return 0;
        if (!input) return 0;
        
        // Trim input to target length to prevent input > 100%
        if (input.length > target.length) {
            input = input.substring(0, target.length);
        }
        
        let correctChars = 0;
        for (let i = 0; i < input.length; i++) {
            if (input[i] === target[i]) {
                correctChars++;
            }
        }
        
        return Math.floor((correctChars / target.length) * 100);
    }
    
    // Create glitch effect
    setInterval(() => {
        const glitchLines = document.querySelectorAll('.glitch-line');
        glitchLines.forEach(line => {
            const height = Math.floor(Math.random() * 10) + 1;
            const top = Math.floor(Math.random() * window.innerHeight);
            
            line.style.height = `${height}px`;
            line.style.top = `${top}px`;
            line.style.left = `-100%`;
            
            setTimeout(() => {
                line.style.left = `100%`;
            }, 100);
        });
    }, 3000);
});

// Update the timer display
function updateTimerDisplay(timerState) {
    console.log('Updating timer display:', timerState);
    const minutes = Math.floor(timerState.timeRemaining / 60);
    const seconds = timerState.timeRemaining % 60;
    
    document.getElementById('countdown').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
    document.getElementById('status-message').textContent = 
        `${timerState.isWorkInterval ? 'WORK' : 'BREAK'} MODE: ${Math.floor(timerState.workInterval / 60)}:00 interval active`;
}

function showOverrideSuccess(redirectUrl) {
    // Hide the override options and challenge container
    document.getElementById('override-options').classList.add('hidden');
    document.getElementById('challenge-container').classList.add('hidden');
    
    // Show the override confirmation
    const overrideConfirmation = document.getElementById('override-confirmation');
    overrideConfirmation.classList.remove('hidden');
    
    // Create and add the redirect button and link
    const redirectContainer = document.getElementById('redirect-target-container');
    redirectContainer.innerHTML = ''; // Clear any existing content
    
    // Create the button
    const redirectButton = document.createElement('button');
    redirectButton.innerHTML = `<i class="fas fa-external-link-alt"></i> Visit ${new URL(redirectUrl).hostname}`;
    redirectButton.addEventListener('click', () => {
        window.location.href = redirectUrl;
    });
    
    // Create the link
    const redirectLink = document.createElement('a');
    redirectLink.href = redirectUrl;
    redirectLink.textContent = `Click here to visit ${new URL(redirectUrl).hostname}`;
    
    // Add both to the container
    redirectContainer.appendChild(redirectButton);
    redirectContainer.appendChild(redirectLink);
    
    // Start automatic redirect after a short delay
    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 2000);
} 