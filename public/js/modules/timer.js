// Timer Module - Công cụ hẹn giờ
const TimerModule = {
    // Timer state
    timers: [],
    activeTimerId: null,

    // Initialize the module
    init() {
        this.loadTimers();
        this.updateUI();
        console.log('TimerModule initialized');
    },

    // Load timers from localStorage
    loadTimers() {
        try {
            const saved = localStorage.getItem('fpt_timers');
            this.timers = saved ? JSON.parse(saved) : [];
            // Update any running timers
            this.timers.forEach(timer => {
                if (timer.isRunning && timer.startedAt) {
                    const elapsed = Date.now() - timer.startedAt;
                    timer.remainingTime = Math.max(0, timer.totalTime - elapsed);
                    if (timer.remainingTime <= 0) {
                        timer.isRunning = false;
                        timer.isFinished = true;
                    }
                }
            });
        } catch (e) {
            console.error('Error loading timers:', e);
            this.timers = [];
        }
    },

    // Save timers to localStorage
    saveTimers() {
        try {
            localStorage.setItem('fpt_timers', JSON.stringify(this.timers));
        } catch (e) {
            console.error('Error saving timers:', e);
        }
    },

    // Create a new timer
    createTimer(name, hours, minutes, seconds) {
        const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
        if (totalMs <= 0) {
            alert('Vui lòng nhập thời gian lớn hơn 0');
            return null;
        }

        const timer = {
            id: Date.now().toString(),
            name: name || 'Timer ' + (this.timers.length + 1),
            totalTime: totalMs,
            remainingTime: totalMs,
            isRunning: false,
            isPaused: false,
            isFinished: false,
            startedAt: null,
            createdAt: Date.now()
        };

        this.timers.unshift(timer);
        this.saveTimers();
        this.updateUI();
        return timer;
    },

    // Start a timer
    startTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (!timer || timer.isFinished) return;

        timer.isRunning = true;
        timer.isPaused = false;
        timer.startedAt = Date.now() - (timer.totalTime - timer.remainingTime);

        this.saveTimers();
        this.startCountdown(timerId);
        this.updateUI();
    },

    // Pause a timer
    pauseTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (!timer) return;

        timer.isRunning = false;
        timer.isPaused = true;

        this.saveTimers();
        this.updateUI();
    },

    // Reset a timer
    resetTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (!timer) return;

        timer.remainingTime = timer.totalTime;
        timer.isRunning = false;
        timer.isPaused = false;
        timer.isFinished = false;
        timer.startedAt = null;

        this.saveTimers();
        this.updateUI();
    },

    // Delete a timer
    deleteTimer(timerId) {
        if (!confirm('Bạn có chắc muốn xóa timer này?')) return;

        this.timers = this.timers.filter(t => t.id !== timerId);
        this.saveTimers();
        this.updateUI();
    },

    // Start countdown interval
    startCountdown(timerId) {
        const intervalId = setInterval(() => {
            const timer = this.timers.find(t => t.id === timerId);
            if (!timer || !timer.isRunning) {
                clearInterval(intervalId);
                return;
            }

            const elapsed = Date.now() - timer.startedAt;
            timer.remainingTime = Math.max(0, timer.totalTime - elapsed);

            if (timer.remainingTime <= 0) {
                timer.isRunning = false;
                timer.isFinished = true;
                clearInterval(intervalId);
                this.onTimerComplete(timer);
            }

            this.saveTimers();
            this.updateTimerDisplay(timerId);
        }, 100);
    },

    // Timer completed
    onTimerComplete(timer) {
        // Play notification sound
        this.playNotificationSound();

        // Show notification
        if (Notification.permission === 'granted') {
            new Notification('⏰ Hẹn giờ hoàn thành!', {
                body: `${timer.name} đã kết thúc!`,
                icon: 'https://caodang.fpt.edu.vn/wp-content/uploads/logo-3.png'
            });
        }

        // Show alert
        setTimeout(() => {
            alert(`⏰ Timer "${timer.name}" đã hoàn thành!`);
        }, 100);

        this.updateUI();
    },

    // Play notification sound
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();

            // Beep pattern
            setTimeout(() => oscillator.frequency.value = 1000, 200);
            setTimeout(() => oscillator.frequency.value = 800, 400);
            setTimeout(() => oscillator.frequency.value = 1000, 600);
            setTimeout(() => {
                oscillator.stop();
                audioContext.close();
            }, 800);
        } catch (e) {
            console.log('Audio not supported');
        }
    },

    // Format time display
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return {
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0'),
            display: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        };
    },

    // Calculate progress percentage
    getProgress(timer) {
        if (timer.totalTime === 0) return 100;
        return ((timer.totalTime - timer.remainingTime) / timer.totalTime) * 100;
    },

    // Update single timer display
    updateTimerDisplay(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (!timer) return;

        const timerEl = document.getElementById(`timer-${timerId}`);
        if (!timerEl) return;

        const timeDisplay = timerEl.querySelector('.timer-time');
        const progressBar = timerEl.querySelector('.timer-progress-bar');

        if (timeDisplay) {
            timeDisplay.textContent = this.formatTime(timer.remainingTime).display;
        }
        if (progressBar) {
            progressBar.style.width = `${this.getProgress(timer)}%`;
        }
    },

    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },

    // Update UI
    updateUI() {
        const container = document.getElementById('timersList');
        if (!container) return;

        if (this.timers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="timer-empty-icon mb-3">
                        <i class="bi bi-stopwatch" style="font-size: 4rem; color: var(--gray-300);"></i>
                    </div>
                    <p class="text-muted mb-0">Chưa có timer nào. Hãy tạo timer mới!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.timers.map(timer => this.renderTimer(timer)).join('');

        // Restart countdowns for running timers
        this.timers.filter(t => t.isRunning).forEach(timer => {
            this.startCountdown(timer.id);
        });
    },

    // Render a single timer card
    renderTimer(timer) {
        const time = this.formatTime(timer.remainingTime);
        const progress = this.getProgress(timer);

        let statusClass = 'timer-idle';
        let statusText = 'Chờ';
        let statusIcon = 'bi-pause-circle';

        if (timer.isFinished) {
            statusClass = 'timer-finished';
            statusText = 'Hoàn thành';
            statusIcon = 'bi-check-circle-fill';
        } else if (timer.isRunning) {
            statusClass = 'timer-running';
            statusText = 'Đang chạy';
            statusIcon = 'bi-play-circle-fill';
        } else if (timer.isPaused) {
            statusClass = 'timer-paused';
            statusText = 'Tạm dừng';
            statusIcon = 'bi-pause-circle-fill';
        }

        return `
            <div class="col-md-6 col-lg-4">
                <div class="timer-card ${statusClass}" id="timer-${timer.id}">
                    <div class="timer-header">
                        <div class="timer-name-wrapper">
                            <i class="bi bi-stopwatch timer-icon"></i>
                            <span class="timer-name">${this.escapeHtml(timer.name)}</span>
                        </div>
                        <span class="timer-status">
                            <i class="bi ${statusIcon}"></i>
                            ${statusText}
                        </span>
                    </div>
                    
                    <div class="timer-display">
                        <div class="timer-time">${time.display}</div>
                        <div class="timer-progress">
                            <div class="timer-progress-bar" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    
                    <div class="timer-actions">
                        ${timer.isFinished ? `
                            <button class="btn btn-sm btn-outline-success" onclick="TimerModule.resetTimer('${timer.id}')">
                                <i class="bi bi-arrow-clockwise"></i> Đặt lại
                            </button>
                        ` : timer.isRunning ? `
                            <button class="btn btn-sm btn-warning" onclick="TimerModule.pauseTimer('${timer.id}')">
                                <i class="bi bi-pause-fill"></i> Tạm dừng
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-success" onclick="TimerModule.startTimer('${timer.id}')">
                                <i class="bi bi-play-fill"></i> Bắt đầu
                            </button>
                        `}
                        <button class="btn btn-sm btn-outline-secondary" onclick="TimerModule.resetTimer('${timer.id}')" ${timer.isFinished ? 'style="display:none"' : ''}>
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="TimerModule.deleteTimer('${timer.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Handle create timer form
    handleCreateTimer() {
        const name = document.getElementById('timerName').value;
        const hours = parseInt(document.getElementById('timerHours').value) || 0;
        const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;

        const timer = this.createTimer(name, hours, minutes, seconds);

        if (timer) {
            // Clear form
            document.getElementById('timerName').value = '';
            document.getElementById('timerHours').value = '0';
            document.getElementById('timerMinutes').value = '5';
            document.getElementById('timerSeconds').value = '0';

            // Request notification permission
            this.requestNotificationPermission();
        }
    },

    // Quick timer presets
    createQuickTimer(minutes, name) {
        const timer = this.createTimer(name, 0, minutes, 0);
        if (timer) {
            this.startTimer(timer.id);
            this.requestNotificationPermission();
        }
    }
};

// Make it globally available
window.TimerModule = TimerModule;
