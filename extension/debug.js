// Debug page JavaScript
document.addEventListener('DOMContentLoaded', () => {
    console.log('Debug page loaded');
    
    // Get DOM elements
    const stateOutput = document.getElementById('state-output');
    const tokenOutput = document.getElementById('token-output');
    const overrideOutput = document.getElementById('override-output');
    const allowedOutput = document.getElementById('allowed-output');
    const overrideUrlInput = document.getElementById('override-url');
    
    // Helper function for message sending with error handling
    function sendMessage(message, outputElement, processingMessage = "") {
        if (processingMessage) {
            outputElement.textContent = processingMessage;
        }
        
        console.log('Sending message:', message);
        
        chrome.runtime.sendMessage(message, (response) => {
            console.log('Received response:', response);
            
            // Handle error when response is undefined (connection error)
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                outputElement.textContent = `Error: ${chrome.runtime.lastError.message}`;
                outputElement.classList.add('error');
                outputElement.classList.remove('success');
                return;
            }
            
            // Handle normal response
            outputElement.textContent = JSON.stringify(response, null, 2);
            
            if (response && response.success) {
                outputElement.classList.add('success');
                outputElement.classList.remove('error');
            } else {
                outputElement.classList.add('error');
                outputElement.classList.remove('success');
            }
        });
    }
    
    // Get state button
    document.getElementById('get-state').addEventListener('click', () => {
        console.log('Getting state');
        chrome.storage.local.get(null, (result) => {
            console.log('State retrieved:', result);
            stateOutput.textContent = JSON.stringify(result, null, 2);
        });
    });
    
    // Token buttons
    document.getElementById('get-tokens').addEventListener('click', () => {
        sendMessage({ action: 'getTokens' }, tokenOutput, "Getting tokens...");
    });
    
    document.getElementById('reset-tokens').addEventListener('click', () => {
        sendMessage({ action: 'resetTokens' }, tokenOutput, "Resetting tokens...");
    });
    
    document.getElementById('use-token').addEventListener('click', () => {
        sendMessage({ action: 'useToken' }, tokenOutput, "Using token...");
    });
    
    // Override buttons
    document.getElementById('test-override').addEventListener('click', () => {
        const url = overrideUrlInput.value.trim();
        
        if (!url) {
            overrideOutput.textContent = "Please enter a URL";
            overrideOutput.classList.add('error');
            return;
        }
        
        overrideOutput.textContent = "Processing override...";
        
        console.log('Sending override request for URL:', url);
        
        chrome.runtime.sendMessage({ 
            action: 'temporaryOverride', 
            url: url,
            fromChallenge: false 
        }, (response) => {
            console.log('Override response received:', response);
            
            // Handle error when response is undefined (connection error)
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                overrideOutput.textContent = `Error: ${chrome.runtime.lastError.message}`;
                overrideOutput.classList.add('error');
                overrideOutput.classList.remove('success');
                return;
            }
            
            // Handle normal response
            overrideOutput.textContent = JSON.stringify(response, null, 2);
            
            if (response && response.success) {
                overrideOutput.classList.add('success');
                overrideOutput.classList.remove('error');
                
                // If a redirect URL was provided, offer to navigate there
                if (response.redirectUrl) {
                    console.log('Redirect URL available:', response.redirectUrl);
                    
                    // Create a button to navigate to the URL
                    const redirectButton = document.createElement('button');
                    redirectButton.textContent = `Visit ${response.redirectUrl}`;
                    redirectButton.style.marginTop = '10px';
                    redirectButton.addEventListener('click', () => {
                        console.log('Redirecting to:', response.redirectUrl);
                        window.location.href = response.redirectUrl;
                    });
                    
                    // Add the button after the output
                    overrideOutput.insertAdjacentElement('afterend', redirectButton);
                }
            } else {
                overrideOutput.classList.add('error');
                overrideOutput.classList.remove('success');
            }
        });
    });
    
    document.getElementById('test-challenge-override').addEventListener('click', () => {
        const url = overrideUrlInput.value.trim();
        
        if (!url) {
            overrideOutput.textContent = "Please enter a URL";
            overrideOutput.classList.add('error');
            return;
        }
        
        // First mark challenge as completed, then try override
        overrideOutput.textContent = "Processing challenge completion...";
        
        chrome.runtime.sendMessage({ action: 'challengeCompleted' }, (challengeResponse) => {
            console.log('Challenge response:', challengeResponse);
            
            overrideOutput.textContent = "Processing challenge override...";
            
            // Then try override
            chrome.runtime.sendMessage({ 
                action: 'temporaryOverride', 
                url: url,
                fromChallenge: true 
            }, (response) => {
                console.log('Challenge override response:', response);
                
                // Handle error when response is undefined (connection error)
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    overrideOutput.textContent = `Error: ${chrome.runtime.lastError.message}`;
                    overrideOutput.classList.add('error');
                    overrideOutput.classList.remove('success');
                    return;
                }
                
                // Handle normal response
                overrideOutput.textContent = JSON.stringify(response, null, 2);
                
                if (response && response.success) {
                    overrideOutput.classList.add('success');
                    overrideOutput.classList.remove('error');
                    
                    // If a redirect URL was provided, offer to navigate there
                    if (response.redirectUrl) {
                        console.log('Redirect URL available:', response.redirectUrl);
                        
                        // Create a button to navigate to the URL
                        const redirectButton = document.createElement('button');
                        redirectButton.textContent = `Visit ${response.redirectUrl}`;
                        redirectButton.style.marginTop = '10px';
                        redirectButton.addEventListener('click', () => {
                            console.log('Redirecting to:', response.redirectUrl);
                            window.location.href = response.redirectUrl;
                        });
                        
                        // Add the button after the output
                        overrideOutput.insertAdjacentElement('afterend', redirectButton);
                    }
                } else {
                    overrideOutput.classList.add('error');
                    overrideOutput.classList.remove('success');
                }
            });
        });
    });
    
    // Allowed sites buttons
    document.getElementById('get-allowed').addEventListener('click', () => {
        console.log('Getting allowed sites');
        chrome.storage.local.get(['overrideTokens'], (result) => {
            console.log('Retrieved override tokens:', result);
            if (result.overrideTokens && result.overrideTokens.temporaryAllowedSites) {
                allowedOutput.textContent = JSON.stringify(result.overrideTokens.temporaryAllowedSites, null, 2);
            } else {
                allowedOutput.textContent = "No allowed sites found";
            }
        });
    });
    
    document.getElementById('clear-allowed').addEventListener('click', () => {
        sendMessage({ action: 'clearAllowedSites' }, allowedOutput, "Clearing allowed sites...");
    });

    // YouTube override button
    document.getElementById('youtube-override').addEventListener('click', () => {
        overrideOutput.textContent = "Processing YouTube override...";
        
        chrome.runtime.sendMessage({ 
            action: 'temporaryOverride', 
            url: 'youtube.com',
            fromChallenge: false 
        }, (response) => {
            console.log('YouTube override response:', response);
            
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                overrideOutput.textContent = `Error: ${chrome.runtime.lastError.message}`;
                overrideOutput.classList.add('error');
                overrideOutput.classList.remove('success');
                return;
            }
            
            overrideOutput.textContent = JSON.stringify(response, null, 2);
            
            if (response && response.success) {
                overrideOutput.classList.add('success');
                overrideOutput.classList.remove('error');
                
                if (response.redirectUrl) {
                    window.location.href = response.redirectUrl;
                }
            } else {
                overrideOutput.classList.add('error');
                overrideOutput.classList.remove('success');
            }
        });
    });
}); 