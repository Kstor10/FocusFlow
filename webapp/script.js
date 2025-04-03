document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const timerLabel = document.getElementById('timer-label');
    const countdown = document.getElementById('countdown');
    const workIntervalInput = document.getElementById('work-interval');
    const breakIntervalInput = document.getElementById('break-interval');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const websiteInput = document.getElementById('website-input');
    const addWebsiteBtn = document.getElementById('add-website-btn');
    const blockedWebsitesList = document.getElementById('blocked-websites');

    // Timer state
    let timerState = {
        isRunning: false,
        isWorkInterval: true,
        timeRemaining: 0,
        workInterval: 25 * 60, // in seconds
        breakInterval: 5 * 60, // in seconds
        intervalId: null
    };

    // Website blocking state
    let blockedWebsites = [];

    // Initialize
    init();

    function init() {
        // Load settings from local storage
        loadSettings();
        
        // Update UI with loaded settings
        updateTimerDisplay();
        renderBlockedWebsites();
        
        // Set initial timer value
        setTimerToWorkInterval();
    }

    function loadSettings() {
        // Load timer settings
        const workInterval = localStorage.getItem('workInterval');
        const breakInterval = localStorage.getItem('breakInterval');
        
        if (workInterval) {
            timerState.workInterval = parseInt(workInterval) * 60;
            workIntervalInput.value = parseInt(workInterval);
        }
        
        if (breakInterval) {
            timerState.breakInterval = parseInt(breakInterval) * 60;
            breakIntervalInput.value = parseInt(breakInterval);
        }
        
        // Load blocked websites
        const savedWebsites = localStorage.getItem('blockedWebsites');
        if (savedWebsites) {
            blockedWebsites = JSON.parse(savedWebsites);
        }
    }

    function saveSettings() {
        // Save timer settings
        localStorage.setItem('workInterval', workIntervalInput.value);
        localStorage.setItem('breakInterval', breakIntervalInput.value);
        
        // Save blocked websites
        localStorage.setItem('blockedWebsites', JSON.stringify(blockedWebsites));
        
        // Communicate with extension
        sendDataToExtension();
    }

    function setTimerToWorkInterval() {
        timerState.isWorkInterval = true;
        timerState.timeRemaining = timerState.workInterval;
        timerLabel.textContent = 'Work Time';
        updateTimerDisplay();
    }

    function setTimerToBreakInterval() {
        timerState.isWorkInterval = false;
        timerState.timeRemaining = timerState.breakInterval;
        timerLabel.textContent = 'Break Time';
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timerState.timeRemaining / 60);
        const seconds = timerState.timeRemaining % 60;
        countdown.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startTimer() {
        if (!timerState.isRunning) {
            timerState.isRunning = true;
            startBtn.textContent = 'Running...';
            
            // Update timer values from inputs
            timerState.workInterval = parseInt(workIntervalInput.value) * 60;
            timerState.breakInterval = parseInt(breakIntervalInput.value) * 60;
            
            // If timer was reset or just initialized, set to appropriate interval
            if (timerState.timeRemaining === 0) {
                if (timerState.isWorkInterval) {
                    setTimerToWorkInterval();
                } else {
                    setTimerToBreakInterval();
                }
            }
            
            // Start the interval
            timerState.intervalId = setInterval(decrementTimer, 1000);
            
            // Save settings and notify extension
            saveSettings();
        }
    }

    function pauseTimer() {
        if (timerState.isRunning) {
            timerState.isRunning = false;
            startBtn.textContent = 'Start';
            clearInterval(timerState.intervalId);
            
            // Notify extension that timer is paused
            sendDataToExtension();
        }
    }

    function resetTimer() {
        pauseTimer();
        setTimerToWorkInterval();
        // Notify extension that timer is reset
        sendDataToExtension();
    }

    function decrementTimer() {
        if (timerState.timeRemaining > 0) {
            timerState.timeRemaining--;
            updateTimerDisplay();
        } else {
            // Switch intervals
            clearInterval(timerState.intervalId);
            
            if (timerState.isWorkInterval) {
                setTimerToBreakInterval();
            } else {
                setTimerToWorkInterval();
            }
            
            // Restart the timer
            timerState.intervalId = setInterval(decrementTimer, 1000);
            
            // Notify extension of interval switch
            sendDataToExtension();
        }
    }

    function addBlockedWebsite() {
        const website = websiteInput.value.trim();
        
        if (website && !blockedWebsites.includes(website)) {
            blockedWebsites.push(website);
            websiteInput.value = '';
            
            renderBlockedWebsites();
            saveSettings();
        }
    }

    function removeBlockedWebsite(website) {
        blockedWebsites = blockedWebsites.filter(site => site !== website);
        renderBlockedWebsites();
        saveSettings();
    }

    function renderBlockedWebsites() {
        blockedWebsitesList.innerHTML = '';
        
        blockedWebsites.forEach(website => {
            const li = document.createElement('li');
            
            const websiteText = document.createElement('span');
            websiteText.textContent = website;
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.className = 'remove-website';
            removeBtn.addEventListener('click', () => removeBlockedWebsite(website));
            
            li.appendChild(websiteText);
            li.appendChild(removeBtn);
            
            blockedWebsitesList.appendChild(li);
        });
    }

    function sendDataToExtension() {
        // Send data to extension
        const data = {
            isRunning: timerState.isRunning,
            isWorkInterval: timerState.isWorkInterval,
            timeRemaining: timerState.timeRemaining,
            workInterval: timerState.workInterval,
            breakInterval: timerState.breakInterval,
            blockedWebsites: blockedWebsites
        };
        
        // Check if we're in a browser extension context
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            console.log("Sending data to extension:", data);
            try {
                chrome.runtime.sendMessage(data, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message to extension:", chrome.runtime.lastError);
                        // Store in localStorage as fallback
                        localStorage.setItem('focusFlowState', JSON.stringify(data));
                    } else {
                        console.log("Message sent to extension, response:", response);
                    }
                });
            } catch (error) {
                console.error("Error communicating with extension:", error);
                // Store in localStorage as fallback
                localStorage.setItem('focusFlowState', JSON.stringify(data));
            }
        } else {
            console.log("Extension not available, storing in localStorage");
            // For development outside extension, store in localStorage
            localStorage.setItem('focusFlowState', JSON.stringify(data));
        }
    }

    // Event listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    addWebsiteBtn.addEventListener('click', addBlockedWebsite);
    
    // Input event listeners
    workIntervalInput.addEventListener('change', () => {
        if (!timerState.isRunning) {
            timerState.workInterval = parseInt(workIntervalInput.value) * 60;
            if (timerState.isWorkInterval) {
                timerState.timeRemaining = timerState.workInterval;
                updateTimerDisplay();
            }
            saveSettings();
        }
    });
    
    breakIntervalInput.addEventListener('change', () => {
        if (!timerState.isRunning) {
            timerState.breakInterval = parseInt(breakIntervalInput.value) * 60;
            if (!timerState.isWorkInterval) {
                timerState.timeRemaining = timerState.breakInterval;
                updateTimerDisplay();
            }
            saveSettings();
        }
    });
    
    websiteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addBlockedWebsite();
        }
    });
});

// --- DecisionQuick Module Logic ---
(function() {
    // DOM Elements
    let taskInput = document.getElementById('dq-task-input');
    let addTaskBtn = document.getElementById('dq-add-task-btn');
    const quadrants = document.querySelectorAll('.dq-quadrant');
    const taskLists = document.querySelectorAll('.dq-task-list');
    
    // Statistics elements
    const totalTasksEl = document.getElementById('dq-total-tasks');
    const completedTasksEl = document.getElementById('dq-completed-tasks');
    const completionRateEl = document.getElementById('dq-completion-rate');
    
    // Tools buttons
    const exportBtn = document.getElementById('dq-export-btn');
    const clearCompletedBtn = document.getElementById('dq-clear-completed-btn');
    const resetBtn = document.getElementById('dq-reset-btn');
    
    // Chart elements
    const taskChartCanvas = document.getElementById('dq-task-chart');
    
    // State variables
    let draggedTask = null;
    let taskStats = {
        total: 0,
        completed: 0,
        byQuadrant: {
            'dq-quadrant-do': 0,
            'dq-quadrant-schedule': 0,
            'dq-quadrant-delegate': 0,
            'dq-quadrant-delete': 0
        },
        completedByQuadrant: {
            'dq-quadrant-do': 0,
            'dq-quadrant-schedule': 0,
            'dq-quadrant-delegate': 0,
            'dq-quadrant-delete': 0
        }
    };
    
    // Task Chart
    let taskChart = null;
    
    // Initialize chart
    function initializeChart() {
        if (!taskChartCanvas) return;
        
        const ctx = taskChartCanvas.getContext('2d');
        
        // Define chart colors to match quadrant colors
        const chartColors = {
            'dq-quadrant-do': '#ff4d4d',
            'dq-quadrant-schedule': '#4da6ff',
            'dq-quadrant-delegate': '#ffa64d',
            'dq-quadrant-delete': '#888888',
            completed: '#00e5ff'
        };
        
        // Create chart
        taskChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Urgent & Important', 'Not Urgent & Important', 'Urgent & Not Important', 'Not Urgent & Not Important', 'Completed'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        chartColors['dq-quadrant-do'],
                        chartColors['dq-quadrant-schedule'],
                        chartColors['dq-quadrant-delegate'],
                        chartColors['dq-quadrant-delete'],
                        chartColors.completed
                    ],
                    borderColor: 'rgba(25, 25, 25, 0.8)',
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#b0b0b0',
                            font: {
                                family: "'Rajdhani', sans-serif",
                                size: 12
                            },
                            padding: 10
                        }
                    },
                    title: {
                        display: true,
                        text: 'Task Distribution',
                        color: '#00e5ff',
                        font: {
                            family: "'Orbitron', sans-serif",
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }
    
    // Function to update stats display
    function updateStatsDisplay() {
        if (totalTasksEl) totalTasksEl.textContent = taskStats.total;
        if (completedTasksEl) completedTasksEl.textContent = taskStats.completed;
        
        // Calculate completion rate
        let completionRate = taskStats.total > 0 
            ? Math.round((taskStats.completed / (taskStats.total + taskStats.completed)) * 100) 
            : 0;
            
        if (completionRateEl) completionRateEl.textContent = `${completionRate}%`;
        
        // Update chart if it exists
        if (taskChart) {
            taskChart.data.datasets[0].data = [
                taskStats.byQuadrant['dq-quadrant-do'],
                taskStats.byQuadrant['dq-quadrant-schedule'],
                taskStats.byQuadrant['dq-quadrant-delegate'],
                taskStats.byQuadrant['dq-quadrant-delete'],
                taskStats.completed
            ];
            taskChart.update();
        }
    }
    
    // Function to compute stats based on DOM
    function computeTaskStats() {
        // Reset stats
        taskStats.total = 0;
        
        // Count tasks in each quadrant
        Object.keys(taskStats.byQuadrant).forEach(quadrantId => {
            const taskList = document.getElementById(quadrantId)?.querySelector('.dq-task-list');
            if (taskList) {
                taskStats.byQuadrant[quadrantId] = taskList.querySelectorAll('.dq-task').length;
                taskStats.total += taskStats.byQuadrant[quadrantId];
            }
        });
        
        // Update display
        updateStatsDisplay();
    }
    
    // Handle hash navigation
    function handleHashChange() {
        if (window.location.hash === '#dq-module') {
            // Scroll to the DecisionQuick module
            const dqModule = document.querySelector('.dq-module');
            if (dqModule) {
                dqModule.scrollIntoView({ behavior: 'smooth' });
                // Optional: add a highlight effect
                dqModule.classList.add('highlight-section');
                setTimeout(() => {
                    dqModule.classList.remove('highlight-section');
                }, 2000);
            }
        }
    }
    
    // Function to save tasks to storage
    function saveTasksToStorage() {
        const tasks = {};
        
        // Loop through each quadrant and collect tasks
        document.querySelectorAll('.dq-quadrant').forEach(quadrant => {
            const quadrantId = quadrant.id;
            const tasksInQuadrant = [];
            
            quadrant.querySelectorAll('.dq-task').forEach(task => {
                tasksInQuadrant.push(task.textContent);
            });
            
            tasks[quadrantId] = tasksInQuadrant;
        });
        
        // Save stats too
        const statsData = {
            completed: taskStats.completed,
            completedByQuadrant: taskStats.completedByQuadrant
        };
        
        // Save to chrome.storage.local if in extension context
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 
                dqTasks: tasks,
                dqStats: statsData
            });
        } else {
            // Fallback to localStorage for non-extension context
            localStorage.setItem('dqTasks', JSON.stringify(tasks));
            localStorage.setItem('dqStats', JSON.stringify(statsData));
        }
    }

    // Function to load tasks from storage
    function loadTasksFromStorage() {
        // Load stats
        function loadStats(statsData) {
            if (statsData) {
                taskStats.completed = statsData.completed || 0;
                if (statsData.completedByQuadrant) {
                    taskStats.completedByQuadrant = statsData.completedByQuadrant;
                }
            }
        }
        
        // Function to process the loaded tasks
        function processTasks(tasks) {
            if (!tasks) return;
            
            Object.keys(tasks).forEach(quadrantId => {
                const quadrant = document.getElementById(quadrantId);
                if (!quadrant) return;
                
                const taskList = quadrant.querySelector('.dq-task-list');
                if (!taskList) return;
                
                tasks[quadrantId].forEach(taskText => {
                    const task = createTaskElement(taskText);
                    taskList.appendChild(task);
                });
            });
            
            // Compute stats after loading
            computeTaskStats();
        }
        
        // Try to load from chrome.storage.local if in extension context
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['dqTasks', 'dqStats'], (result) => {
                if (result.dqTasks) {
                    processTasks(result.dqTasks);
                }
                if (result.dqStats) {
                    loadStats(result.dqStats);
                }
                updateStatsDisplay();
            });
        } else {
            // Fallback to localStorage for non-extension context
            const tasksJson = localStorage.getItem('dqTasks');
            if (tasksJson) {
                try {
                    const tasks = JSON.parse(tasksJson);
                    processTasks(tasks);
                } catch (e) {
                    console.error('Error parsing tasks from localStorage:', e);
                }
            }
            
            const statsJson = localStorage.getItem('dqStats');
            if (statsJson) {
                try {
                    const statsData = JSON.parse(statsJson);
                    loadStats(statsData);
                    updateStatsDisplay();
                } catch (e) {
                    console.error('Error parsing stats from localStorage:', e);
                }
            }
        }
    }

    // Function to create a new task element
    function createTaskElement(taskText) {
        const task = document.createElement('li');
        task.classList.add('dq-task');
        task.draggable = true;
        
        // Create text span for task content
        const textSpan = document.createElement('span');
        textSpan.classList.add('dq-task-text');
        textSpan.textContent = taskText;
        
        // Create actions div
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('dq-task-actions');
        
        // Create complete button
        const completeBtn = document.createElement('button');
        completeBtn.classList.add('dq-task-action', 'dq-complete-action');
        completeBtn.innerHTML = '<i class="fas fa-check"></i>';
        completeBtn.title = "Mark as Complete";
        completeBtn.addEventListener('click', handleTaskComplete);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('dq-task-action', 'dq-delete-action');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = "Delete Task";
        deleteBtn.addEventListener('click', handleTaskDelete);
        
        // Append buttons to actions div
        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(deleteBtn);
        
        // Append all elements to task
        task.appendChild(textSpan);
        task.appendChild(actionsDiv);

        // Add drag event listeners to the task
        task.addEventListener('dragstart', handleDragStart);
        task.addEventListener('dragend', handleDragEnd);

        return task;
    }

    // Function to add a new task
    function addTask() {
        console.log('Add task function called');
        
        if (!taskInput) {
            console.error('Task input element not found!');
            return;
        }
        
        const taskText = taskInput.value.trim();
        console.log('Task text:', taskText);
        
        if (taskText === '') {
            console.log('Empty task text, not adding');
            return; // Don't add empty tasks
        }

        const newTask = createTaskElement(taskText);
        // Add new tasks to the 'Do' quadrant by default
        const doQuadrant = document.getElementById('dq-quadrant-do');
        if (!doQuadrant) {
            console.error('Do quadrant element not found!');
            return;
        }
        
        const doQuadrantList = doQuadrant.querySelector('.dq-task-list');
        if (!doQuadrantList) {
            console.error('Do quadrant task list not found!');
            return;
        }
        
        console.log('Adding task to Do quadrant');
        doQuadrantList.appendChild(newTask);
        
        // Update stats
        computeTaskStats();
        saveTasksToStorage(); // Save after adding
        
        taskInput.value = ''; // Clear input field
        console.log('Task added successfully');
    }

    // Event Handlers for Drag and Drop
    function handleDragStart(e) {
        draggedTask = this;
        setTimeout(() => {
            this.classList.add('dq-dragging'); // Use class for visual feedback
        }, 0);
    }

    function handleDragEnd(e) {
        this.classList.remove('dq-dragging');
        draggedTask = null;
        
        // Update stats after drag operation
        computeTaskStats();
        saveTasksToStorage(); // Save after drag operation is complete
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        const targetList = e.target.closest('.dq-task-list');
        if (targetList || e.target.classList.contains('dq-quadrant')) {
             const quadrant = e.target.closest('.dq-quadrant');
             if(quadrant) {
                 quadrant.classList.add('dq-drag-over');
             }
        }
    }

    function handleDragLeave(e) {
        const quadrant = e.target.closest('.dq-quadrant');
        if(quadrant) {
             quadrant.classList.remove('dq-drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetList = e.target.closest('.dq-task-list');
        const quadrant = e.target.closest('.dq-quadrant');

        if (quadrant) {
            quadrant.classList.remove('dq-drag-over'); // Remove highlight on drop
            const list = quadrant.querySelector('.dq-task-list');
            if (list && draggedTask && draggedTask.parentNode !== list) {
                // Find the element we are dropping before, if any
                const afterElement = getDragAfterElement(list, e.clientY);
                if (afterElement == null) {
                    list.appendChild(draggedTask);
                } else {
                    list.insertBefore(draggedTask, afterElement);
                }
            }
        } else if (targetList && draggedTask && draggedTask.parentNode !== targetList) {
            // Allow dropping directly onto the list as well
            const afterElement = getDragAfterElement(targetList, e.clientY);
             if (afterElement == null) {
                targetList.appendChild(draggedTask);
            } else {
                targetList.insertBefore(draggedTask, afterElement);
            }
        }
    }

    // Helper function to determine where to insert the dragged item
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.dq-task:not(.dq-dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Event Handler for completing a task (clicking on check icon)
    function handleTaskComplete(e) {
        e.stopPropagation(); // Stop event bubbling
        const task = e.target.closest('.dq-task');
        if (task) {
            const quadrant = task.closest('.dq-quadrant');
            if (quadrant) {
                // Update stats
                taskStats.completed++;
                taskStats.completedByQuadrant[quadrant.id]++;
                
                // Visual feedback and removal
                task.classList.add('dq-completed');
                task.addEventListener('transitionend', () => {
                    task.remove();
                    computeTaskStats();
                    saveTasksToStorage(); // Save after removing
                }, { once: true }); // Ensure listener runs only once
            }
        }
    }

    // Event Handler for deleting a task (clicking on trash icon)
    function handleTaskDelete(e) {
        e.stopPropagation(); // Stop event bubbling
        const task = e.target.closest('.dq-task');
        if (task) {
            // Animate fade out
            task.style.opacity = '0';
            task.style.transform = 'translateX(30px)';
            setTimeout(() => {
                task.remove();
                computeTaskStats();
                saveTasksToStorage();
            }, 300);
        }
    }

    // Export tasks to CSV
    function exportTasks() {
        // Create CSV content
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Quadrant,Task\n"; // Header row
        
        // Add tasks from each quadrant
        document.querySelectorAll('.dq-quadrant').forEach(quadrant => {
            const quadrantName = quadrant.querySelector('h3').textContent.trim();
            const tasks = quadrant.querySelectorAll('.dq-task');
            
            tasks.forEach(task => {
                const taskText = task.querySelector('.dq-task-text').textContent.trim();
                // Escape quotes in task text
                const escapedText = taskText.replace(/"/g, '""');
                csvContent += `"${quadrantName}","${escapedText}"\n`;
            });
        });
        
        // Create download link and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `DecisionQuick_Tasks_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Clear completed tasks stats
    function clearCompletedTasks() {
        if (confirm('Clear completed tasks statistics?')) {
            taskStats.completed = 0;
            Object.keys(taskStats.completedByQuadrant).forEach(key => {
                taskStats.completedByQuadrant[key] = 0;
            });
            updateStatsDisplay();
            saveTasksToStorage();
        }
    }
    
    // Reset all tasks
    function resetAllTasks() {
        if (confirm('This will remove all tasks. Are you sure?')) {
            // Clear task lists
            document.querySelectorAll('.dq-task-list').forEach(list => {
                list.innerHTML = '';
            });
            
            // Reset stats
            taskStats.total = 0;
            taskStats.completed = 0;
            Object.keys(taskStats.byQuadrant).forEach(key => {
                taskStats.byQuadrant[key] = 0;
            });
            Object.keys(taskStats.completedByQuadrant).forEach(key => {
                taskStats.completedByQuadrant[key] = 0;
            });
            
            // Update UI
            updateStatsDisplay();
            saveTasksToStorage();
        }
    }

    // Initialize: Add event listeners and load saved tasks
    function initialize() {
        console.log('Initializing DecisionQuick module');
        
        // Make sure we get fresh references to DOM elements
        taskInput = document.getElementById('dq-task-input');
        addTaskBtn = document.getElementById('dq-add-task-btn');
        
        console.log('Task input element:', taskInput);
        console.log('Add task button element:', addTaskBtn);
        
        // Initialize chart
        initializeChart();
        
        // Add event listeners only if elements exist
        if (addTaskBtn) {
            console.log('Adding click event listener to add task button');
            addTaskBtn.addEventListener('click', function(e) {
                console.log('Add task button clicked directly');
                e.preventDefault();
                addTask();
            });
        } else {
            console.error('Add task button element not found!');
        }
        
        if (taskInput) {
            console.log('Adding keypress event listener to task input');
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter key pressed in task input');
                    e.preventDefault();
                    addTask();
                }
            });
        } else {
            console.error('Task input element not found!');
        }

        // Add drop listeners to quadrants
        quadrants.forEach(quadrant => {
            quadrant.addEventListener('dragover', handleDragOver);
            quadrant.addEventListener('dragleave', handleDragLeave);
            quadrant.addEventListener('drop', handleDrop);
        });
        
        // Tools button listeners
        if (exportBtn) {
            exportBtn.addEventListener('click', exportTasks);
        }
        
        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', clearCompletedTasks);
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', resetAllTasks);
        }

        // Load tasks from storage
        loadTasksFromStorage();
        
        // Handle hash navigation on load
        handleHashChange();
        
        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        
        console.log('DecisionQuick initialization complete');
    }

    // Call initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})(); // End of DecisionQuick IIFE 