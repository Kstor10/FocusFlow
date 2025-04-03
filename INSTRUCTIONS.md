# FocusFlow Setup Instructions

Follow these steps to get the FocusFlow browser extension working properly:

## Installation

1. **Copy webapp files into extension folder**:
   - Run the `copy-webapp.bat` file in the `extension` folder
   - This will copy the necessary webapp files into your extension

2. **Load the extension in Chrome**:
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle switch in top-right corner)
   - Click "Load unpacked"
   - Select the `extension` folder from your project

3. **Pin the extension to your toolbar**:
   - After installing, click the puzzle icon in Chrome's toolbar
   - Find FocusFlow and click the pin icon

## Using FocusFlow

1. **Click the FocusFlow icon** in your browser toolbar to open the popup
   - This will show you the current status and blocked websites

2. **Add websites to block**:
   - Click "Open Web App" from the popup, or
   - Open the webapp/index.html directly in your browser
   - Enter website URLs in the "Blocked Websites" section
   - Click "Add" for each website 
   - Example format: `facebook.com` (no need to include https:// or www.)

3. **Start blocking**:
   - In the web app, set your desired work and break intervals
   - Click "Start" to begin the timer
   - The extension will now block the websites during work intervals
   - You can also manually toggle blocking from the extension popup

## Override Tokens System

FocusFlow includes an Override Tokens system that allows you to temporarily access blocked websites when necessary:

1. **Daily Token Allowance**:
   - You receive 3 override tokens each day
   - Tokens reset at midnight
   - Each token allows 5 minutes of access to a blocked site

2. **Using Tokens**:
   - When you visit a blocked site, you'll see the option to "Override Block" 
   - If you have tokens available, you can use one to access the site for 5 minutes
   - Your remaining tokens are visible in the extension popup

3. **Productivity Challenge**:
   - If you've used all your tokens, you'll be prompted to complete a typing challenge
   - Successfully completing the challenge grants temporary access without using a token
   - This ensures you're making a conscious decision to break your focus

4. **Managing Access**:
   - The extension popup shows your remaining tokens for the day
   - Temporary access expires automatically after 5 minutes
   - You'll need to use another token or complete another challenge for further access

## Troubleshooting

If websites aren't being blocked:

1. **Check the extension popup** to verify:
   - Blocking is enabled
   - Your websites are listed in "Blocked Websites"
   - The extension is in "Working" mode, not "Break" or "Idle"

2. **Force update the rules**:
   - Click "Force Update Rules" in the extension popup
   - This will refresh all blocking rules

3. **Verify your block list**:
   - Make sure websites are added in the correct format
   - Try adding both with and without "www." if needed

4. **Restart Chrome**:
   - Sometimes Chrome needs a restart for extension changes to take effect
   - Close and reopen Chrome, then try again

5. **Check the console for errors**:
   - Right-click the extension icon
   - Select "Inspect popup"
   - Look for errors in the Console tab

## Common Issues

- **Website still accessible**: Try adding the domain in different formats (e.g., facebook.com, www.facebook.com)
- **Extension not responding**: Check if you need to reload the extension from chrome://extensions/
- **Timer not starting**: Make sure the web app is communicating with the extension by checking the popup status
- **Override not working**: Ensure you have tokens available or complete the productivity challenge correctly
- **Can't go back after seeing blocked page**: Use the "Return" button on the blocked page or click the back button in your browser 