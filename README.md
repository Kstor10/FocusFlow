# FocusFlow - Productivity Chrome Extension

![FocusFlow Banner](extension/icons/icon128.png)

FocusFlow is a comprehensive productivity Chrome extension designed to help you stay focused, manage your time efficiently, and prioritize tasks effectively. It combines three powerful tools in one:

1. A customizable Pomodoro timer
2. A website blocking system
3. A DecisionQuick Matrix for task prioritization

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [File Structure](#file-structure)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [FAQ](#faq)
- [License](#license)

## ✨ Features

### 🕒 Pomodoro Timer
- **Customizable intervals**: Set work and break duration to fit your productivity style
- **Visual countdown**: See remaining time at a glance
- **Session tracking**: Keep track of completed work sessions
- **Notifications**: Get alerts when intervals end
- **Controls**: Start, pause, and reset functionality

### 🚫 Website Blocker
- **Smart blocking**: Block distracting websites only during work intervals
- **Easy management**: Add and remove websites from the blocklist
- **Productivity challenge**: Override blocking by completing a typing test challenge
- **Block page**: Custom page with motivational messages when visiting blocked sites

### 📊 DecisionQuick Matrix
- **Eisenhower Matrix**: Categorize tasks by urgency and importance
- **Drag and drop**: Easily move tasks between quadrants
- **Task stats**: Track completion rates and task distribution
- **Data visualization**: Interactive doughnut chart showing task allocation
- **Export functionality**: Save your tasks to CSV for external use

## 💻 Installation

### From Source Code
1. Clone this repository:
   ```bash
   git clone https://github.com/Kstor10/FocusFlow.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" by toggling the switch in the top-right corner

4. Click "Load unpacked" and select the `extension` folder from the cloned repository

5. The FocusFlow extension should now appear in your extensions list and be ready to use

### Chrome Web Store
*Coming soon*

## 🔍 Usage Guide

### Timer Module
1. Set your preferred work and break durations in minutes
2. Click "Start" to begin the Pomodoro timer
3. Work until the timer ends, then take a break
4. The extension icon changes color to indicate current mode:
   - 🔴 Red: Work interval
   - 🔵 Blue: Break interval
   - ⚪ Gray: Paused

### Website Blocker
1. Add distracting websites to your blocklist (e.g., facebook.com, twitter.com)
2. During work intervals, attempts to visit these sites will redirect to the block page
3. If you need to access a blocked site, complete the typing challenge for temporary access

### DecisionQuick Matrix
1. Add tasks using the input field and "Add Task" button
2. Tasks are automatically added to the "Urgent & Important" quadrant
3. Drag tasks between quadrants to prioritize them:
   - **Do**: Urgent & Important - Tasks to be done immediately
   - **Schedule**: Not Urgent but Important - Tasks to plan for later
   - **Delegate**: Urgent but Not Important - Tasks that could be delegated
   - **Delete**: Not Urgent & Not Important - Tasks to eliminate
4. Mark tasks complete or delete them using the action buttons
5. View statistics on task completion and distribution in the chart

## 🛠️ Development

### Prerequisites
- Chrome browser
- Basic knowledge of HTML, CSS, and JavaScript
- Text editor or IDE

### Local Development
1. Fork and clone the repository
2. Make changes to the code as needed
3. To test changes:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the FocusFlow extension
   - Or, remove the extension and load it again using "Load unpacked"

### Building for Production
1. Make your changes to the extension code
2. Test thoroughly across different use cases
3. Update version number in `manifest.json` if necessary
4. Create a zip file of the extension folder for distribution

## 📁 File Structure

```
FocusFlow/
├── extension/              # Main extension code
│   ├── background.js       # Background script for timer and blocking logic
│   ├── blocked.html        # Page shown when a site is blocked
│   ├── blocked.js          # Logic for the blocked page
│   ├── content.js          # Content script for page modifications
│   ├── manifest.json       # Extension configuration
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup logic
│   ├── icons/              # Extension icons
│   └── webapp/             # Embedded web application
├── webapp/                 # Standalone web application version
└── README.md               # This documentation
```

## 🔧 Technologies Used

- **HTML/CSS/JavaScript**: Core web technologies
- **Chrome Extension APIs**: For browser integration
- **Chart.js**: For data visualization
- **FontAwesome**: For icons
- **Custom CSS Framework**: For the cyberpunk-inspired UI

## 👥 Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please read the [Contributing Guidelines](CONTRIBUTING.md) for more information.

## ❓ FAQ

### Q: Does the extension work offline?
**A:** Yes, FocusFlow works entirely offline. No internet connection is required for the timer, task management, or website blocking.

### Q: Will my data be synced across devices?
**A:** Currently, settings and blocked websites are stored locally. Cross-device sync is planned for a future update.

### Q: How can I recover after accidentally blocking an important website?
**A:** You can access any blocked website by completing the typing challenge on the blocked page, or by adding the site to the exceptions list in the extension options.

### Q: Is there a mobile version?
**A:** Not currently. FocusFlow is designed for desktop Chrome browsers.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ by <a href="https://github.com/Kstor10">Kstor10</a></p> 