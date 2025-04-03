// CRITICAL FIX: Add aggressive redirect handling directly in head script
// This runs immediately before any other scripts can potentially interfere

// Helper function for extracting URL parameters
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Function to safely redirect with multiple methods
function safeRedirectTo(url) {
    if (!url || 
        url.includes('chrome-extension://') || 
        url.includes('debug.html') ||
        url === 'https://www.google.com') {
        console.error('Invalid redirect URL:', url);
        return false;
    }
    
    console.log('Head script redirecting to:', url);
    
    try {
        // Method 1: Direct location change
        window.location.href = url;
        
        // Method 2: Location replace
        setTimeout(function() {
            window.location.replace(url);
        }, 100);
        
        // Method 3: window.open
        setTimeout(function() {
            window.open(url, '_self');
        }, 200);
        
        return true;
    } catch(e) {
        console.error('Error during head script redirect:', e);
        return false;
    }
}

// ATTEMPT 1: Check URL parameter for immediate redirection
const urlRedirect = getUrlParam('redirectUrl');
if (urlRedirect && !urlRedirect.includes('chrome-extension://') && !urlRedirect.includes('debug.html')) {
    console.log('Immediate redirect from URL parameter:', urlRedirect);
    safeRedirectTo(urlRedirect);
}

// ATTEMPT 2: Check session storage for redirect flag
try {
    const shouldRedirect = sessionStorage.getItem('override_success') === 'true';
    const lastRedirect = localStorage.getItem('last_override_target');
    
    if (shouldRedirect && lastRedirect && 
        !lastRedirect.includes('chrome-extension://') && 
        !lastRedirect.includes('debug.html')) {
        
        console.log('Immediate redirect from session storage:', lastRedirect);
        sessionStorage.removeItem('override_success');
        safeRedirectTo(lastRedirect);
    }
} catch (e) {
    console.error('Error checking session storage:', e);
}

// Add a backup redirect that will run after the page loads
window.addEventListener('DOMContentLoaded', function() {
    try {
        // Get potential redirect URL from storage
        const lastRedirect = localStorage.getItem('last_override_target');
        
        if (lastRedirect && 
            !lastRedirect.includes('chrome-extension://') && 
            !lastRedirect.includes('debug.html')) {
            
            console.log('Found redirect URL in localStorage:', lastRedirect);
            
            // Create a direct link the user can click
            const emergencyLink = document.createElement('a');
            emergencyLink.href = lastRedirect;
            emergencyLink.target = '_self';
            emergencyLink.style.position = 'fixed';
            emergencyLink.style.top = '10px';
            emergencyLink.style.right = '10px';
            emergencyLink.style.zIndex = '9999';
            emergencyLink.style.background = '#2ecc71';
            emergencyLink.style.color = 'white';
            emergencyLink.style.padding = '10px 15px';
            emergencyLink.style.borderRadius = '4px';
            emergencyLink.style.textDecoration = 'none';
            emergencyLink.style.fontWeight = 'bold';
            emergencyLink.textContent = 'CLICK TO ACCESS SITE';
            
            // Add to body when ready
            document.body.appendChild(emergencyLink);
        }
    } catch(e) {
        console.error('Error in DOM loaded handler:', e);
    }
}); 