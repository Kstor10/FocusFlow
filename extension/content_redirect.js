// content_redirect.js - Helps enforce redirects from blocked.html
console.log('Content redirect script loaded');

// IMMEDIATE ACTION: Try to redirect immediately if we have a stored target
(function immediateRedirectCheck() {
    try {
        // Check if we should redirect based on session storage flag
        const shouldRedirect = sessionStorage.getItem('override_success') === 'true';
        const redirectTarget = localStorage.getItem('last_override_target');
        
        if (shouldRedirect && redirectTarget && 
            !redirectTarget.includes('chrome-extension://') && 
            !redirectTarget.includes('debug.html')) {
            
            console.log('IMMEDIATE REDIRECT TRIGGERED:', redirectTarget);
            sessionStorage.removeItem('override_success');
            
            // Force redirection NOW, don't wait for the rest of the script
            window.location.href = redirectTarget;
        }
    } catch (e) {
        console.error('Error in immediate redirect check:', e);
    }
})();

// This script runs on blocked.html to assist with redirection
// by bypassing potential browser navigation blocks

// Create global redirection function that will be used by multiple triggers
function forceRedirectTo(url) {
    console.log('Force redirecting to:', url);
    
    // Attempt multiple methods with minimal delay between
    try {
        // Method 1: Standard location change (most compatible)
        window.location.href = url;
        
        // Method 2: Replace current history entry (harder to go back)
        setTimeout(() => {
            try {
                window.location.replace(url);
            } catch (e) {
                console.error('Replace method failed:', e);
            }
        }, 50);
        
        // Method 3: Window open method (works in some contexts where others fail)
        setTimeout(() => {
            try {
                window.open(url, '_self');
            } catch (e) {
                console.error('Window.open method failed:', e);
            }
        }, 100);
    } catch (e) {
        console.error('Initial redirect attempt failed:', e);
        
        // Last resort - create a direct user-clickable link
        try {
            const emergencyLinkDiv = document.createElement('div');
            emergencyLinkDiv.style.position = 'fixed';
            emergencyLinkDiv.style.top = '10px';
            emergencyLinkDiv.style.left = '10px';
            emergencyLinkDiv.style.right = '10px';
            emergencyLinkDiv.style.zIndex = '99999';
            emergencyLinkDiv.style.backgroundColor = 'red';
            emergencyLinkDiv.style.padding = '20px';
            emergencyLinkDiv.style.textAlign = 'center';
            emergencyLinkDiv.style.borderRadius = '5px';
            
            const emergencyLink = document.createElement('a');
            emergencyLink.href = url;
            emergencyLink.textContent = '⚠️ EMERGENCY REDIRECT LINK - CLICK HERE NOW ⚠️';
            emergencyLink.style.color = 'white';
            emergencyLink.style.fontWeight = 'bold';
            emergencyLink.style.fontSize = '18px';
            emergencyLink.style.textDecoration = 'underline';
            
            emergencyLinkDiv.appendChild(emergencyLink);
            document.body.appendChild(emergencyLinkDiv);
            
            // Flash the emergency link to attract attention
            let visible = true;
            const flashInterval = setInterval(() => {
                visible = !visible;
                emergencyLinkDiv.style.display = visible ? 'block' : 'none';
            }, 500);
            
            // Stop flashing after 10 seconds
            setTimeout(() => clearInterval(flashInterval), 10000);
        } catch (err) {
            console.error('Failed to create emergency link:', err);
        }
    }
}

// Function to get redirect URL from the page
function getRedirectTarget() {
    // Look for the URL in multiple places
    const redirectTargetElement = document.querySelector('.redirect-target strong');
    
    if (redirectTargetElement && redirectTargetElement.textContent) {
        return redirectTargetElement.textContent;
    }
    
    // Try to get from localStorage as fallback
    try {
        const storedTarget = localStorage.getItem('last_override_target');
        if (storedTarget && !storedTarget.includes('chrome-extension://') && !storedTarget.includes('debug.html')) {
            return storedTarget;
        }
    } catch (e) {
        console.error('Error getting stored redirect target:', e);
    }
    
    return null;
}

// Setup redirection handler
function setupRedirection() {
    // Find all elements that could trigger a redirect
    const redirectButtons = document.querySelectorAll('.manual-redirect-button, a[href^="http"]');
    const redirectTarget = getRedirectTarget();
    
    if (!redirectTarget) {
        console.log('No redirect target found');
        return;
    }
    
    console.log('Found redirect target:', redirectTarget);
    
    // Enhance all redirect buttons/links
    redirectButtons.forEach(button => {
        console.log('Enhancing redirect element:', button);
        
        if (button.tagName === 'A') {
            // If it's already an anchor, make sure it has the correct href
            if (!button.href || button.href === '#' || button.href.includes('chrome-extension://')) {
                button.href = redirectTarget;
            }
            
            // Add additional click handler for maximum reliability
            button.addEventListener('click', function(e) {
                console.log('Enhanced link clicked:', redirectTarget);
                forceRedirectTo(redirectTarget);
            });
        } else {
            // If it's a button, add a click handler
            button.addEventListener('click', function(e) {
                console.log('Enhanced button clicked');
                forceRedirectTo(redirectTarget);
            });
        }
    });
    
    // Also set up auto-redirect if appropriate
    if (document.querySelector('.redirect-countdown')) {
        console.log('Auto-redirect countdown detected');
        setTimeout(() => {
            const redirectTarget = getRedirectTarget();
            if (redirectTarget && window.location.href.includes('blocked.html')) {
                console.log('Auto-redirect triggered after countdown');
                forceRedirectTo(redirectTarget);
            }
        }, 6000); // Use 6 seconds to give the main script's 5-second countdown time to work
    }
}

// Handle immediate redirect for cases where the page loads with redirect info already present
function handleImmediateRedirect() {
    const redirectTarget = getRedirectTarget();
    
    // Check if we have the override_success flag in sessionStorage
    try {
        const shouldRedirect = sessionStorage.getItem('override_success') === 'true';
        if (shouldRedirect && redirectTarget) {
            console.log('Immediate redirect condition detected!');
            sessionStorage.removeItem('override_success');
            forceRedirectTo(redirectTarget);
            return true;
        }
    } catch (e) {
        console.error('Error checking session storage:', e);
    }
    
    return false;
}

// Run immediately
if (!handleImmediateRedirect()) {
    // Monitor for when elements appear in the DOM
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                const redirectButton = document.querySelector('.manual-redirect-button');
                const redirectTarget = document.querySelector('.redirect-target strong');
                
                if (redirectButton || redirectTarget) {
                    console.log('Redirect elements detected in DOM');
                    observer.disconnect();
                    setupRedirection();
                }
            }
        });
    });
    
    // Start observing changes
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Ensure we run even if the observer fails
    setTimeout(setupRedirection, 1000);
    
    // Also try again after a longer delay as a safety measure
    setTimeout(function() {
        if (window.location.href.includes('blocked.html')) {
            console.log('Still on blocked page after 5 seconds, making final attempt');
            setupRedirection();
            
            // If we're still here, try an emergency redirect
            const redirectTarget = getRedirectTarget();
            if (redirectTarget) {
                setTimeout(() => {
                    if (window.location.href.includes('blocked.html')) {
                        console.log('Final emergency redirect attempt');
                        forceRedirectTo(redirectTarget);
                    }
                }, 2000);
            }
        }
    }, 5000);
}

// Direct global event listener for reliability
document.addEventListener('click', (e) => {
    // Check if any redirect-related element was clicked
    const isRedirectElement = e.target.closest('.manual-redirect-button, .redirect-button, a[href^="http"]');
    
    if (isRedirectElement) {
        console.log('Redirect element clicked through global handler');
        
        // Try to get the URL from the element first
        let url = null;
        
        if (isRedirectElement.tagName === 'A' && isRedirectElement.href) {
            url = isRedirectElement.href;
        }
        
        // If no URL, try to get from the page
        if (!url) {
            url = getRedirectTarget();
        }
        
        if (url) {
            console.log('Global handler redirecting to:', url);
            forceRedirectTo(url);
        }
    }
}, true); 