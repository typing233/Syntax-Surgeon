class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playHeartbeat() {
        this.init();
        this.playTone(60, 0.1, 'sine', 0.4);
        setTimeout(() => {
            this.playTone(80, 0.08, 'sine', 0.3);
        }, 150);
    }

    playSuccess() {
        this.init();
        this.playTone(523.25, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.3), 150);
        setTimeout(() => this.playTone(783.99, 0.3, 'sine', 0.3), 300);
    }

    playError() {
        this.init();
        this.playTone(200, 0.2, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.2), 200);
    }

    playScissors() {
        this.init();
        this.playTone(800, 0.05, 'square', 0.1);
        setTimeout(() => this.playTone(600, 0.05, 'square', 0.1), 50);
    }

    playClick() {
        this.init();
        this.playTone(400, 0.05, 'sine', 0.1);
    }

    playEmergency() {
        this.init();
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playTone(880, 0.1, 'square', 0.3);
            }, i * 200);
            setTimeout(() => {
                this.playTone(440, 0.1, 'square', 0.3);
            }, i * 200 + 100);
        }
    }
}

class VibrationManager {
    constructor() {
        this.supported = 'vibrate' in navigator;
    }

    vibrate(pattern) {
        if (this.supported) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.log('Vibration not available');
            }
        }
    }

    success() {
        this.vibrate([100, 50, 100]);
    }

    error() {
        this.vibrate([200, 100, 200, 100, 200]);
    }

    click() {
        this.vibrate(50);
    }

    emergency() {
        this.vibrate([100, 50, 100, 50, 100, 50, 100, 50, 100]);
    }

    combo() {
        this.vibrate([50, 30, 50, 30, 50, 30, 100]);
    }
}

class TextSurgeryGame {
    constructor() {
        this.gameMode = 'menu';
        this.currentExercise = null;
        this.doctor = null;
        this.qiValue = 100;
        this.score = 0;
        this.totalAttempts = 0;
        this.correctAttempts = 0;
        this.selectedPosition = null;
        this.isExerciseCompleted = false;
        this.currentLevel = '竹簡';
        this.levelProgress = 0;
        this.levelExercises = 5;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        this.selectedTool = 'tweezers';
        this.audioManager = new AudioManager();
        this.vibrationManager = new VibrationManager();
        this.socket = null;
        this.sessionId = null;
        this.playerName = '';
        this.isHost = false;
        this.players = [];
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.mainMenuEl = document.getElementById('mainMenu');
        this.levelSelectEl = document.getElementById('levelSelect');
        this.consultLobbyEl = document.getElementById('consultLobby');
        this.consultRoomEl = document.getElementById('consultRoom');
        this.gameScreenEl = document.getElementById('gameScreen');
        
        this.startSoloBtnEl = document.getElementById('startSoloBtn');
        this.startConsultBtnEl = document.getElementById('startConsultBtn');
        this.viewLevelsBtnEl = document.getElementById('viewLevelsBtn');
        
        this.backFromLevelBtnEl = document.getElementById('backFromLevelBtn');
        this.backFromLobbyBtnEl = document.getElementById('backFromLobbyBtn');
        this.backFromGameBtnEl = document.getElementById('backFromGameBtn');
        
        this.levelCardsEl = document.getElementById('levelCards');
        
        this.playerNameInputEl = document.getElementById('playerNameInput');
        this.createSessionBtnEl = document.getElementById('createSessionBtn');
        this.sessionIdInputEl = document.getElementById('sessionIdInput');
        this.joinNameInputEl = document.getElementById('joinNameInput');
        this.joinSessionBtnEl = document.getElementById('joinSessionBtn');
        
        this.currentRoomIdEl = document.getElementById('currentRoomId');
        this.copyRoomIdBtnEl = document.getElementById('copyRoomIdBtn');
        this.leaveRoomBtnEl = document.getElementById('leaveRoomBtn');
        this.playersContainerEl = document.getElementById('playersContainer');
        this.startConsultExerciseBtnEl = document.getElementById('startConsultExerciseBtn');
        
        this.consultDiagnosisTextEl = document.getElementById('consultDiagnosisText');
        this.consultErrorTypeEl = document.getElementById('consultErrorType');
        
        this.chatMessagesEl = document.getElementById('chatMessages');
        this.chatInputEl = document.getElementById('chatInput');
        this.sendChatBtnEl = document.getElementById('sendChatBtn');
        
        this.qiValueEl = document.getElementById('qiValue');
        this.qiBarEl = document.getElementById('qiBar');
        this.scoreValueEl = document.getElementById('scoreValue');
        this.errorTypeEl = document.getElementById('errorType');
        this.diagnosisTextEl = document.getElementById('diagnosisText');
        this.hintTextEl = document.getElementById('hintText');
        this.doctorAvatarEl = document.getElementById('doctorAvatar');
        this.doctorNameEl = document.getElementById('doctorName');
        this.doctorSaysEl = document.getElementById('doctorSays');
        this.nextBtnEl = document.getElementById('nextBtn');
        
        this.comboDisplayEl = document.getElementById('comboDisplay');
        this.comboCountEl = document.getElementById('comboCount');
        this.comboMultiplierEl = document.getElementById('comboMultiplier');
        this.currentLevelEl = document.getElementById('currentLevel');
        this.levelProgressEl = document.getElementById('levelProgress');
        
        this.toolsBarEl = document.getElementById('toolsBar');
        this.toolItemsEl = this.toolsBarEl.querySelectorAll('.tool-item');
        
        this.modalOverlayEl = document.getElementById('modalOverlay');
        this.modalEl = document.getElementById('modal');
        this.modalTitleEl = document.getElementById('modalTitle');
        this.modalOriginalTextEl = document.getElementById('modalOriginalText');
        this.modalHintEl = document.getElementById('modalHint');
        this.correctionInputEl = document.getElementById('correctionInput');
        
        this.modalCloseEl = document.getElementById('modalClose');
        this.modalCancelEl = document.getElementById('modalCancel');
        this.modalSubmitEl = document.getElementById('modalSubmit');
        this.modalDeleteEl = document.getElementById('modalDelete');
        
        this.complicationModalEl = document.getElementById('complicationModal');
        this.complicationHeaderEl = document.getElementById('complicationHeader');
        this.complicationTitleEl = document.getElementById('complicationTitle');
        this.complicationDescriptionEl = document.getElementById('complicationDescription');
        this.timerDisplayEl = document.getElementById('timerDisplay');
        this.timerValueEl = document.getElementById('timerValue');
        this.complicationOptionsEl = document.getElementById('complicationOptions');
        this.currentComplication = null;
        this.complicationTimer = null;
        
        this.feedbackPopupEl = document.getElementById('feedbackPopup');
        this.feedbackIconEl = document.getElementById('feedbackIcon');
        this.feedbackMessageEl = document.getElementById('feedbackMessage');
        this.feedbackExplanationEl = document.getElementById('feedbackExplanation');
        
        this.gameContainerEl = document.querySelector('.game-container');
        this.medicalRecordContainerEl = document.getElementById('medicalRecordContainer');
        
        this.levelCompleteModalEl = document.getElementById('levelCompleteModal');
        this.certificateNameEl = document.getElementById('certificateName');
        this.certificateLevelEl = document.getElementById('certificateLevel');
        this.certificateScoreEl = document.getElementById('certificateScore');
        this.certificateComboEl = document.getElementById('certificateCombo');
        this.certificateAccuracyEl = document.getElementById('certificateAccuracy');
        this.certificateDateEl = document.getElementById('certificateDate');
        this.shareCertificateBtnEl = document.getElementById('shareCertificateBtn');
        this.continueGameBtnEl = document.getElementById('continueGameBtn');
        
        this.posterModalEl = document.getElementById('posterModal');
        this.posterCanvasEl = document.getElementById('posterCanvas');
        this.downloadPosterBtnEl = document.getElementById('downloadPosterBtn');
        this.closePosterBtnEl = document.getElementById('closePosterBtn');
    }

    initEventListeners() {
        this.startSoloBtnEl.addEventListener('click', () => {
            this.audioManager.playClick();
            this.vibrationManager.click();
            this.showLevelSelect();
        });
        
        this.startConsultBtnEl.addEventListener('click', () => {
            this.audioManager.playClick();
            this.vibrationManager.click();
            this.showConsultLobby();
        });
        
        this.viewLevelsBtnEl.addEventListener('click', () => {
            this.audioManager.playClick();
            this.vibrationManager.click();
            this.showLevelSelect();
        });
        
        this.backFromLevelBtnEl.addEventListener('click', () => {
            this.audioManager.playClick();
            this.vibrationManager.click();
            this.showMainMenu();
        });
        
        this.backFromLobbyBtnEl.addEventListener('click', () => {
            this.audioManager.playClick();
            this.vibrationManager.click();
            this.showMainMenu();
        });
        
        this.backFromGameBtnEl.addEventListener('click', () => {
            this.audioManager.playClick();
            this.vibrationManager.click();
            if (confirm('确定要返回主菜单吗？当前进度将丢失。')) {
                this.showMainMenu();
            }
        });
        
        this.createSessionBtnEl.addEventListener('click', () => this.createConsultSession());
        this.joinSessionBtnEl.addEventListener('click', () => this.joinConsultSession());
        
        this.copyRoomIdBtnEl.addEventListener('click', () => {
            navigator.clipboard.writeText(this.sessionId);
            this.showFeedback(true, '房间号已复制！', '');
        });
        
        this.leaveRoomBtnEl.addEventListener('click', () => this.leaveConsultSession());
        this.startConsultExerciseBtnEl.addEventListener('click', () => this.startConsultExercise());
        
        this.sendChatBtnEl.addEventListener('click', () => this.sendChatMessage());
        this.chatInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        this.nextBtnEl.addEventListener('click', () => this.loadNextExercise());
        
        this.modalCloseEl.addEventListener('click', () => this.closeModal());
        this.modalCancelEl.addEventListener('click', () => this.closeModal());
        this.modalSubmitEl.addEventListener('click', () => this.submitCorrection());
        this.modalDeleteEl.addEventListener('click', () => this.deleteWord());
        
        this.correctionInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.currentExercise && 
                    this.currentExercise.error_type === '贅字' && 
                    this.currentExercise.errors.find(e => e.position === this.selectedPosition)?.correct_char === '') {
                    this.deleteWord();
                } else {
                    this.submitCorrection();
                }
            }
        });
        
        this.modalOverlayEl.addEventListener('click', (e) => {
            if (e.target === this.modalOverlayEl) {
                this.closeModal();
            }
        });
        
        this.toolItemsEl.forEach(toolEl => {
            toolEl.addEventListener('click', () => {
                this.selectTool(toolEl.dataset.tool);
            });
        });
        
        this.shareCertificateBtnEl.addEventListener('click', () => this.generatePoster());
        this.continueGameBtnEl.addEventListener('click', () => this.continueAfterLevelComplete());
        this.closePosterBtnEl.addEventListener('click', () => this.closePosterModal());
        this.downloadPosterBtnEl.addEventListener('click', () => this.downloadPoster());
    }

    showMainMenu() {
        this.gameMode = 'menu';
        this.mainMenuEl.style.display = 'flex';
        this.levelSelectEl.style.display = 'none';
        this.consultLobbyEl.style.display = 'none';
        this.consultRoomEl.style.display = 'none';
        this.gameScreenEl.style.display = 'none';
        this.levelCompleteModalEl.style.display = 'none';
        this.posterModalEl.style.display = 'none';
    }

    showLevelSelect() {
        this.gameMode = 'level_select';
        this.mainMenuEl.style.display = 'none';
        this.levelSelectEl.style.display = 'flex';
        this.consultLobbyEl.style.display = 'none';
        this.renderLevelCards();
    }

    async renderLevelCards() {
        try {
            const response = await fetch('/api/levels');
            const data = await response.json();
            if (data.success) {
                const levels = data.data;
                let html = '';
                const levelOrder = ['竹簡', '帛書', '宣紙'];
                const levelStyles = {
                    '竹簡': 'bamboo',
                    '帛書': 'silk',
                    '宣紙': 'rice'
                };
                
                levelOrder.forEach((levelName, index) => {
                    const level = levels[levelName];
                    const isUnlocked = this.score >= level.unlock_score;
                    
                    html += `
                        <div class="level-card ${levelStyles[levelName]} ${isUnlocked ? '' : 'locked'}" data-level="${levelName}">
                            <div class="level-card-header">
                                <span class="level-card-title">${levelName}</span>
                                <div class="level-card-difficulty">
                                    ${this.renderStars(level.difficulty)}
                                </div>
                            </div>
                            <p class="level-card-description">${level.description}</p>
                            <div class="level-card-stats">
                                <div class="level-stat">
                                    <span class="level-stat-value">${level.max_score}</span>
                                    <span class="level-stat-label">最高分数</span>
                                </div>
                                <div class="level-stat">
                                    <span class="level-stat-value">${level.unlock_score}</span>
                                    <span class="level-stat-label">解锁分数</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                this.levelCardsEl.innerHTML = html;
                
                this.levelCardsEl.querySelectorAll('.level-card').forEach(card => {
                    if (!card.classList.contains('locked')) {
                        card.addEventListener('click', () => {
                            this.audioManager.playClick();
                            this.vibrationManager.click();
                            this.startGame(card.dataset.level);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('加载关卡失败:', error);
        }
    }

    renderStars(count) {
        let stars = '';
        for (let i = 0; i < 3; i++) {
            stars += `<span class="star ${i < count ? 'filled' : ''}">★</span>`;
        }
        return stars;
    }

    showConsultLobby() {
        this.gameMode = 'consult_lobby';
        this.mainMenuEl.style.display = 'none';
        this.levelSelectEl.style.display = 'none';
        this.consultLobbyEl.style.display = 'flex';
    }

    async createConsultSession() {
        const name = this.playerNameInputEl.value.trim() || '匿名医生';
        this.playerName = name;
        
        try {
            const response = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.data.session_id;
                this.isHost = true;
                this.connectToSocket();
                this.showConsultRoom();
            }
        } catch (error) {
            console.error('创建房间失败:', error);
            this.showFeedback(false, '创建房间失败', '请重试');
        }
    }

    async joinConsultSession() {
        const sessionId = this.sessionIdInputEl.value.trim();
        const name = this.joinNameInputEl.value.trim() || '匿名医生';
        
        if (!sessionId) {
            this.showFeedback(false, '请输入房间号', '');
            return;
        }
        
        this.sessionId = sessionId;
        this.playerName = name;
        this.isHost = false;
        this.connectToSocket();
        this.showConsultRoom();
    }

    connectToSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.socket = io(`${protocol}//${host}`);
        
        this.socket.on('connect', () => {
            this.socket.emit('join_session', {
                session_id: this.sessionId,
                player_name: this.playerName
            });
        });
        
        this.socket.on('player_joined', (data) => {
            this.players = data.players;
            this.updatePlayerList();
            if (this.isHost && this.players.length >= 1) {
                this.startConsultExerciseBtnEl.style.display = 'inline-block';
            }
        });
        
        this.socket.on('player_left', (data) => {
            this.players = data.players;
            this.updatePlayerList();
        });
        
        this.socket.on('exercise_started', (data) => {
            this.currentExercise = data.exercise;
            this.renderConsultExercise();
        });
        
        this.socket.on('position_selected', (data) => {
            this.highlightOtherPlayerSelection(data.position);
        });
        
        this.socket.on('answer_submitted', (data) => {
            this.players = data.players;
            this.updatePlayerList();
        });
        
        this.socket.on('new_message', (data) => {
            this.addChatMessage(data.player_name, data.message, data.player_name === this.playerName);
        });
        
        this.socket.on('error', (data) => {
            this.showFeedback(false, data.message, '');
        });
    }

    showConsultRoom() {
        this.consultLobbyEl.style.display = 'none';
        this.consultRoomEl.style.display = 'flex';
        this.currentRoomIdEl.textContent = this.sessionId;
    }

    updatePlayerList() {
        let html = '';
        this.players.forEach(player => {
            const isSelf = player.name === this.playerName;
            html += `
                <div class="player-item ${isSelf ? 'self' : ''}">
                    <div class="player-avatar">${player.name.charAt(0)}</div>
                    <div class="player-info">
                        <div class="player-name">${player.name} ${isSelf ? '(你)' : ''}</div>
                        <div class="player-score">得分: ${player.score}</div>
                    </div>
                </div>
            `;
        });
        this.playersContainerEl.innerHTML = html;
    }

    async startConsultExercise() {
        try {
            const response = await fetch('/api/exercise/random');
            const data = await response.json();
            
            if (data.success) {
                this.socket.emit('start_exercise', {
                    session_id: this.sessionId,
                    exercise: data.data
                });
            }
        } catch (error) {
            console.error('加载练习失败:', error);
        }
    }

    renderConsultExercise() {
        if (!this.currentExercise) return;
        
        this.consultErrorTypeEl.textContent = this.currentExercise.error_type;
        
        const text = this.currentExercise.original_text;
        const errors = this.currentExercise.errors;
        
        let html = '';
        for (let i = 0; i < text.length; i++) {
            const isError = errors.some(e => i >= e.position && i < e.position + e.original_char.length);
            html += `<span class="char-word" data-position="${i}" data-is-error="${isError}">${text[i]}</span>`;
        }
        
        this.consultDiagnosisTextEl.innerHTML = html;
        
        this.consultDiagnosisTextEl.querySelectorAll('.char-word').forEach(charEl => {
            charEl.addEventListener('click', (e) => this.handleConsultCharClick(e));
        });
    }

    handleConsultCharClick(e) {
        const charEl = e.target;
        const position = parseInt(charEl.dataset.position);
        
        this.socket.emit('select_position', {
            session_id: this.sessionId,
            position: position,
            player_name: this.playerName
        });
        
        this.selectedPosition = position;
        this.openConsultModal(charEl.textContent, position);
    }

    openConsultModal(originalChar, position) {
        this.modalOriginalTextEl.textContent = originalChar;
        this.correctionInputEl.value = '';
        
        const error = this.currentExercise.errors.find(e => {
            const errorLength = e.original_char.length;
            return position >= e.position && position < e.position + errorLength;
        });
        
        if (error && error.correct_char === '') {
            this.modalTitleEl.textContent = '诊断修改 - 删除赘字';
            this.modalHintEl.textContent = '这是一个赘字（多余的字），点击"确认删除"按钮即可';
            this.modalSubmitEl.style.display = 'none';
            this.modalDeleteEl.style.display = 'inline-block';
        } else {
            this.modalTitleEl.textContent = '诊断修改';
            this.modalHintEl.textContent = '请输入正确的字，然后点击"确认修改"';
            this.modalSubmitEl.style.display = 'inline-block';
            this.modalDeleteEl.style.display = 'none';
        }
        
        this.modalOverlayEl.style.display = 'flex';
        setTimeout(() => {
            this.correctionInputEl.focus();
        }, 100);
    }

    highlightOtherPlayerSelection(position) {
        this.consultDiagnosisTextEl.querySelectorAll('.char-word').forEach(el => {
            if (parseInt(el.dataset.position) === position) {
                el.classList.add('selected-by-other');
            }
        });
    }

    sendChatMessage() {
        const message = this.chatInputEl.value.trim();
        if (!message || !this.socket) return;
        
        this.socket.emit('chat_message', {
            session_id: this.sessionId,
            message: message,
            player_name: this.playerName
        });
        
        this.chatInputEl.value = '';
    }

    addChatMessage(sender, message, isSelf = false) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${isSelf ? 'self' : ''}`;
        messageEl.innerHTML = `
            <span class="sender">${sender}</span>
            <div class="message-text">${message}</div>
        `;
        this.chatMessagesEl.appendChild(messageEl);
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
    }

    leaveConsultSession() {
        if (this.socket) {
            this.socket.emit('leave_session', { session_id: this.sessionId });
            this.socket.disconnect();
        }
        this.sessionId = null;
        this.playerName = '';
        this.isHost = false;
        this.players = [];
        this.showConsultLobby();
    }

    startGame(level) {
        this.currentLevel = level;
        this.levelProgress = 0;
        this.qiValue = 100;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.totalAttempts = 0;
        this.correctAttempts = 0;
        
        this.updateLevelDisplay();
        this.updatePaperStyle();
        
        this.levelSelectEl.style.display = 'none';
        this.gameScreenEl.style.display = 'flex';
        this.gameMode = 'playing';
        
        this.loadGame();
    }

    updateLevelDisplay() {
        this.currentLevelEl.textContent = this.currentLevel;
        this.levelProgressEl.textContent = `${this.levelProgress + 1}/${this.levelExercises}`;
    }

    updatePaperStyle() {
        this.medicalRecordContainerEl.classList.remove('bamboo', 'silk', 'rice');
        const styleMap = {
            '竹簡': 'bamboo',
            '帛書': 'silk',
            '宣紙': 'rice'
        };
        if (styleMap[this.currentLevel]) {
            this.medicalRecordContainerEl.classList.add(styleMap[this.currentLevel]);
        }
    }

    selectTool(toolId) {
        this.selectedTool = toolId;
        this.audioManager.playClick();
        this.vibrationManager.click();
        
        this.toolItemsEl.forEach(el => {
            el.classList.remove('active');
            if (el.dataset.tool === toolId) {
                el.classList.add('active');
            }
        });
        
        if (toolId === 'stethoscope') {
            this.showHint();
        }
    }

    showHint() {
        if (!this.currentExercise) return;
        
        const errors = this.currentExercise.errors;
        if (errors.length > 0) {
            const error = errors[0];
            this.hintTextEl.textContent = `💡 提示：在位置 ${error.position + 1} 附近可能有问题...`;
            this.audioManager.playClick();
        }
    }

    async loadGame() {
        await Promise.all([
            this.loadDoctor(),
            this.loadExercise()
        ]);
    }

    async loadDoctor() {
        try {
            const response = await fetch('/api/doctor/random');
            const data = await response.json();
            if (data.success) {
                this.doctor = data.data;
                this.updateDoctorDisplay();
            }
        } catch (error) {
            console.error('加载医生角色失败:', error);
            this.doctor = {
                name: '啄木鸟医生',
                image: '🐦',
                description: '森林里最厉害的语言医生，专门吃掉错别字'
            };
            this.updateDoctorDisplay();
        }
    }

    async loadExercise() {
        try {
            const response = await fetch(`/api/exercise/level/${this.currentLevel}`);
            const data = await response.json();
            if (data.success) {
                this.currentExercise = data.data;
                this.isExerciseCompleted = false;
                this.updateExerciseDisplay();
                this.nextBtnEl.style.display = 'none';
                
                if (Math.random() < 0.3) {
                    setTimeout(() => this.triggerComplication(), 2000);
                }
            }
        } catch (error) {
            console.error('加载练习失败:', error);
            this.diagnosisTextEl.textContent = '加载失败，请刷新页面重试';
        }
    }

    async loadNextExercise() {
        this.levelProgress++;
        
        if (this.levelProgress >= this.levelExercises) {
            this.showLevelComplete();
            return;
        }
        
        this.updateLevelDisplay();
        await this.loadExercise();
    }

    updateDoctorDisplay() {
        if (this.doctor) {
            this.doctorAvatarEl.textContent = this.doctor.image;
            this.doctorNameEl.textContent = this.doctor.name;
        }
    }

    updateExerciseDisplay() {
        if (!this.currentExercise) return;
        
        this.errorTypeEl.textContent = this.currentExercise.error_type;
        
        const text = this.currentExercise.original_text;
        const errors = this.currentExercise.errors;
        
        const errorPositions = new Map();
        errors.forEach(error => {
            errorPositions.set(error.position, error.original_char);
        });
        
        let html = '';
        let currentPos = 0;
        
        const sortedErrors = [...errors].sort((a, b) => a.position - b.position);
        
        for (const error of sortedErrors) {
            while (currentPos < error.position) {
                html += `<span class="char-word" data-position="${currentPos}">${text[currentPos]}</span>`;
                currentPos++;
            }
            
            const errorLength = error.original_char.length;
            for (let i = 0; i < errorLength; i++) {
                if (currentPos < text.length) {
                    html += `<span class="char-word" data-position="${currentPos}" data-is-error="true">${text[currentPos]}</span>`;
                    currentPos++;
                }
            }
        }
        
        while (currentPos < text.length) {
            html += `<span class="char-word" data-position="${currentPos}">${text[currentPos]}</span>`;
            currentPos++;
        }
        
        this.diagnosisTextEl.innerHTML = html;
        
        this.diagnosisTextEl.querySelectorAll('.char-word').forEach(charEl => {
            charEl.addEventListener('click', (e) => this.handleCharClick(e));
        });
        
        this.hintTextEl.textContent = `💡 提示：点击你认为有错误的字词进行诊断（错误类型：${this.currentExercise.error_type}）`;
        
        if (this.currentExercise.error_type === '贅字') {
            this.doctorSaysEl.textContent = '这个句子里有多余的字哦，找出来并删除它吧！';
        } else {
            this.doctorSaysEl.textContent = '这个句子里有错别字哦，找出来并改正它吧！';
        }
    }

    handleCharClick(e) {
        if (this.isExerciseCompleted) return;
        
        const charEl = e.target;
        const position = parseInt(charEl.dataset.position);
        
        this.audioManager.playClick();
        this.vibrationManager.click();
        
        this.diagnosisTextEl.querySelectorAll('.char-word').forEach(el => {
            el.classList.remove('clicked');
        });
        
        charEl.classList.add('clicked');
        
        this.selectedPosition = position;
        
        if (this.selectedTool === 'scalpel') {
            this.handleToolAction('delete', charEl.textContent, position);
        } else if (this.selectedTool === 'suture_needle') {
            this.openModal(charEl.textContent, position);
        } else {
            this.openModal(charEl.textContent, position);
        }
    }

    handleToolAction(action, char, position) {
        if (action === 'delete') {
            this.modalOriginalTextEl.textContent = char;
            this.selectedPosition = position;
            this.deleteWord();
        }
    }

    openModal(originalChar, position) {
        this.modalOriginalTextEl.textContent = originalChar;
        this.correctionInputEl.value = '';
        
        const error = this.currentExercise.errors.find(e => {
            const errorLength = e.original_char.length;
            return position >= e.position && position < e.position + errorLength;
        });
        
        if (error && error.correct_char === '') {
            this.modalTitleEl.textContent = '诊断修改 - 删除赘字';
            this.modalHintEl.textContent = '这是一个赘字（多余的字），点击"确认删除"按钮即可';
            this.modalSubmitEl.style.display = 'none';
            this.modalDeleteEl.style.display = 'inline-block';
        } else {
            this.modalTitleEl.textContent = '诊断修改';
            this.modalHintEl.textContent = '请输入正确的字，然后点击"确认修改"';
            this.modalSubmitEl.style.display = 'inline-block';
            this.modalDeleteEl.style.display = 'none';
        }
        
        this.modalOverlayEl.style.display = 'flex';
        setTimeout(() => {
            this.correctionInputEl.focus();
        }, 100);
    }

    closeModal() {
        this.modalOverlayEl.style.display = 'none';
        this.correctionInputEl.value = '';
        
        this.diagnosisTextEl.querySelectorAll('.char-word').forEach(el => {
            el.classList.remove('clicked');
        });
        
        this.selectedPosition = null;
    }

    async submitCorrection() {
        const userAnswer = this.correctionInputEl.value.trim();
        this.totalAttempts++;
        
        if (!userAnswer) {
            this.showFeedback(false, '请输入正确的字！', '');
            return;
        }
        
        const error = this.currentExercise.errors.find(e => {
            const errorLength = e.original_char.length;
            return this.selectedPosition >= e.position && this.selectedPosition < e.position + errorLength;
        });
        
        if (!error) {
            this.handleWrongSelection();
            return;
        }
        
        try {
            const response = await fetch('/api/exercise/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    exercise_id: this.currentExercise.id,
                    position: error.position,
                    user_answer: userAnswer
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.data.correct) {
                    this.handleCorrectAnswer(error, data.data);
                } else {
                    this.handleWrongAnswer(data.data);
                }
            }
        } catch (error) {
            console.error('提交答案失败:', error);
            this.showFeedback(false, '网络错误，请重试', '');
        }
        
        this.closeModal();
    }

    async deleteWord() {
        const error = this.currentExercise.errors.find(e => {
            const errorLength = e.original_char.length;
            return this.selectedPosition >= e.position && this.selectedPosition < e.position + errorLength;
        });
        
        this.totalAttempts++;
        
        if (!error || error.correct_char !== '') {
            this.handleWrongSelection();
            this.closeModal();
            return;
        }
        
        try {
            const response = await fetch('/api/exercise/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    exercise_id: this.currentExercise.id,
                    position: error.position,
                    user_answer: ''
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.data.correct) {
                this.handleCorrectDelete(error, data.data);
            } else {
                this.handleWrongAnswer(data.data);
            }
        } catch (error) {
            console.error('删除失败:', error);
            this.showFeedback(false, '网络错误，请重试', '');
        }
        
        this.closeModal();
    }

    handleCorrectAnswer(error, result) {
        this.audioManager.playSuccess();
        this.vibrationManager.success();
        this.correctAttempts++;
        
        const errorLength = error.original_char.length;
        const charEls = this.diagnosisTextEl.querySelectorAll('.char-word');
        
        let charsToUpdate = [];
        charEls.forEach(el => {
            const pos = parseInt(el.dataset.position);
            if (pos >= error.position && pos < error.position + errorLength) {
                charsToUpdate.push(el);
            }
        });
        
        if (charsToUpdate.length > 0) {
            const firstEl = charsToUpdate[0];
            firstEl.textContent = result.correct_char;
            firstEl.classList.add('correct');
            firstEl.classList.remove('clicked');
            
            charsToUpdate.slice(1).forEach(el => {
                el.remove();
            });
        }
        
        this.increaseCombo();
        
        const baseScore = 10;
        const comboBonus = Math.floor(baseScore * (this.comboMultiplier - 1));
        const totalScore = baseScore + comboBonus;
        this.score += totalScore;
        this.scoreValueEl.textContent = this.score;
        
        this.showFeedback(true, `太棒了！+${totalScore}分`, result.explanation);
        
        this.doctorSaysEl.textContent = '干得漂亮！这个病句已经被你治好了！';
        
        this.completeExercise();
    }

    handleCorrectDelete(error, result) {
        this.audioManager.playScissors();
        this.vibrationManager.success();
        this.correctAttempts++;
        
        const charEls = this.diagnosisTextEl.querySelectorAll('.char-word');
        
        charEls.forEach(el => {
            const pos = parseInt(el.dataset.position);
            if (pos >= error.position && pos < error.position + error.original_char.length) {
                el.classList.add('correct');
                setTimeout(() => {
                    el.style.opacity = '0.5';
                    el.style.textDecoration = 'line-through';
                }, 300);
            }
        });
        
        this.increaseCombo();
        
        const baseScore = 10;
        const comboBonus = Math.floor(baseScore * (this.comboMultiplier - 1));
        const totalScore = baseScore + comboBonus;
        this.score += totalScore;
        this.scoreValueEl.textContent = this.score;
        
        this.showFeedback(true, `太棒了！+${totalScore}分`, result.explanation);
        
        this.doctorSaysEl.textContent = '完美！这个句子现在简洁多了！';
        
        this.completeExercise();
    }

    handleWrongSelection() {
        this.audioManager.playError();
        this.vibrationManager.error();
        this.resetCombo();
        
        this.qiValue -= 10;
        this.updateQiValue();
        
        if (this.qiValue <= 0) {
            this.gameOver();
            return;
        }
        
        this.gameContainerEl.classList.add('screen-shake');
        setTimeout(() => {
            this.gameContainerEl.classList.remove('screen-shake');
        }, 500);
        
        this.showFeedback(false, '哎呀，这个位置没有错误哦！', '再仔细找找看吧~');
        
        this.doctorSaysEl.textContent = '这里没有问题哦，再仔细看看其他地方吧！';
    }

    handleWrongAnswer(result) {
        this.audioManager.playError();
        this.vibrationManager.error();
        this.resetCombo();
        
        this.qiValue -= 15;
        this.updateQiValue();
        
        if (this.qiValue <= 0) {
            this.gameOver();
            return;
        }
        
        this.gameContainerEl.classList.add('screen-shake');
        setTimeout(() => {
            this.gameContainerEl.classList.remove('screen-shake');
        }, 500);
        
        const charEls = this.diagnosisTextEl.querySelectorAll('.char-word');
        charEls.forEach(el => {
            if (el.classList.contains('clicked')) {
                el.classList.add('wrong');
                setTimeout(() => {
                    el.classList.remove('wrong');
                }, 500);
            }
        });
        
        this.showFeedback(false, '哎呀，答案不太对哦！', result.explanation);
        
        this.doctorSaysEl.textContent = '别灰心，再试一次吧！仔细想想正确的字应该是什么？';
    }

    increaseCombo() {
        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }
        
        if (this.combo >= 3) {
            this.comboMultiplier = 1 + Math.floor((this.combo - 2) * 0.5);
            this.showCombo();
            this.vibrationManager.combo();
        } else {
            this.comboMultiplier = 1;
        }
    }

    resetCombo() {
        this.combo = 0;
        this.comboMultiplier = 1;
        this.hideCombo();
    }

    showCombo() {
        this.comboDisplayEl.style.display = 'flex';
        this.comboCountEl.textContent = this.combo;
        this.comboMultiplierEl.textContent = `x${this.comboMultiplier}`;
    }

    hideCombo() {
        this.comboDisplayEl.style.display = 'none';
    }

    updateQiValue() {
        this.qiValue = Math.max(0, this.qiValue);
        this.qiValueEl.textContent = this.qiValue;
        this.qiBarEl.style.width = `${this.qiValue}%`;
        
        if (this.qiValue <= 30) {
            this.qiBarEl.style.background = 'linear-gradient(90deg, var(--error-color), #ff5722)';
            this.audioManager.playHeartbeat();
        } else if (this.qiValue <= 60) {
            this.qiBarEl.style.background = 'linear-gradient(90deg, var(--warning-color), #ffc107)';
        } else {
            this.qiBarEl.style.background = 'linear-gradient(90deg, var(--success-color), #8bc34a)';
        }
    }

    completeExercise() {
        this.isExerciseCompleted = true;
        this.nextBtnEl.style.display = 'inline-block';
        
        this.hintTextEl.textContent = '🎉 太棒了！这个病例已经治愈！点击"下一个病例"继续挑战吧！';
    }

    gameOver() {
        this.showFeedback(false, '文气值耗尽了...', '别担心，游戏可以重新开始！');
        
        setTimeout(() => {
            if (confirm('文气值耗尽了！是否重新开始游戏？')) {
                this.qiValue = 100;
                this.score = 0;
                this.combo = 0;
                this.maxCombo = 0;
                this.levelProgress = 0;
                this.totalAttempts = 0;
                this.correctAttempts = 0;
                this.updateQiValue();
                this.scoreValueEl.textContent = this.score;
                this.updateLevelDisplay();
                this.hideCombo();
                this.loadGame();
            } else {
                this.showMainMenu();
            }
        }, 2000);
    }

    showFeedback(isSuccess, message, explanation) {
        if (isSuccess) {
            this.feedbackIconEl.textContent = '✅';
            this.feedbackMessageEl.className = 'feedback-message success';
        } else {
            this.feedbackIconEl.textContent = '❌';
            this.feedbackMessageEl.className = 'feedback-message error';
        }
        
        this.feedbackMessageEl.textContent = message;
        this.feedbackExplanationEl.textContent = explanation;
        
        this.feedbackPopupEl.style.display = 'block';
        
        setTimeout(() => {
            this.feedbackPopupEl.style.display = 'none';
        }, 3000);
    }

    async triggerComplication() {
        try {
            const response = await fetch('/api/complication/random');
            const data = await response.json();
            
            if (data.success) {
                this.currentComplication = data.data;
                this.showComplication();
            }
        } catch (error) {
            console.error('获取并发症失败:', error);
        }
    }

    showComplication() {
        if (!this.currentComplication) return;
        
        this.audioManager.playEmergency();
        this.vibrationManager.emergency();
        
        this.complicationTitleEl.textContent = this.currentComplication.title;
        this.complicationDescriptionEl.textContent = this.currentComplication.description;
        
        if (this.currentComplication.type === 'timed_diagnosis' || this.currentComplication.type === 'emergency') {
            this.timerDisplayEl.style.display = 'flex';
            this.complicationOptionsEl.style.display = 'none';
            this.startComplicationTimer();
        } else if (this.currentComplication.type === 'side_effect') {
            this.timerDisplayEl.style.display = 'none';
            this.complicationOptionsEl.style.display = 'flex';
            this.renderComplicationOptions();
        }
        
        this.complicationModalEl.style.display = 'flex';
    }

    startComplicationTimer() {
        let timeLeft = this.currentComplication.time_limit;
        this.timerValueEl.textContent = timeLeft;
        
        this.complicationTimer = setInterval(() => {
            timeLeft--;
            this.timerValueEl.textContent = timeLeft;
            
            if (timeLeft <= 3) {
                this.audioManager.playClick();
                this.vibrationManager.click();
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.complicationTimer);
                this.handleComplicationTimeout();
            }
        }, 1000);
    }

    renderComplicationOptions() {
        let html = '';
        this.currentComplication.options.forEach((option, index) => {
            html += `
                <div class="complication-option" data-index="${index}">
                    ${option.text}
                </div>
            `;
        });
        this.complicationOptionsEl.innerHTML = html;
        
        this.complicationOptionsEl.querySelectorAll('.complication-option').forEach(optionEl => {
            optionEl.addEventListener('click', () => {
                this.handleComplicationChoice(parseInt(optionEl.dataset.index));
            });
        });
    }

    async handleComplicationChoice(choiceIndex) {
        try {
            const response = await fetch('/api/complication/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    complication_id: this.currentComplication.id,
                    choice: choiceIndex
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.data.correct) {
                    this.score += Math.abs(data.data.bonus);
                    this.scoreValueEl.textContent = this.score;
                    this.showFeedback(true, '处理正确！', `获得 ${data.data.bonus} 分奖励`);
                    this.audioManager.playSuccess();
                    this.vibrationManager.success();
                } else {
                    this.qiValue += data.data.bonus;
                    this.updateQiValue();
                    this.showFeedback(false, '处理错误！', data.data.explanation);
                    this.audioManager.playError();
                    this.vibrationManager.error();
                }
            }
        } catch (error) {
            console.error('检查并发症答案失败:', error);
        }
        
        this.closeComplication();
    }

    handleComplicationTimeout() {
        this.qiValue += this.currentComplication.penalty;
        this.updateQiValue();
        this.showFeedback(false, '时间到了！', `文气值 ${this.currentComplication.penalty}`);
        this.audioManager.playError();
        this.vibrationManager.error();
        this.closeComplication();
    }

    closeComplication() {
        if (this.complicationTimer) {
            clearInterval(this.complicationTimer);
        }
        this.complicationModalEl.style.display = 'none';
        this.currentComplication = null;
    }

    showLevelComplete() {
        const accuracy = this.totalAttempts > 0 ? Math.round((this.correctAttempts / this.totalAttempts) * 100) : 0;
        
        this.certificateNameEl.textContent = this.playerName || '医生';
        this.certificateLevelEl.textContent = this.currentLevel;
        this.certificateScoreEl.textContent = this.score;
        this.certificateComboEl.textContent = this.maxCombo;
        this.certificateAccuracyEl.textContent = `${accuracy}%`;
        
        const now = new Date();
        this.certificateDateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
        
        this.audioManager.playSuccess();
        this.vibrationManager.success();
        
        this.levelCompleteModalEl.style.display = 'flex';
    }

    continueAfterLevelComplete() {
        this.levelCompleteModalEl.style.display = 'none';
        this.showLevelSelect();
    }

    generatePoster() {
        const canvas = this.posterCanvasEl;
        const ctx = canvas.getContext('2d');
        
        canvas.width = 600;
        canvas.height = 800;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#fef9e7');
        gradient.addColorStop(1, '#fdebd0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 8;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        
        ctx.setLineDash([10, 5]);
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
        ctx.setLineDash([]);
        
        ctx.font = 'bold 48px Microsoft YaHei';
        ctx.fillStyle = '#8b4513';
        ctx.textAlign = 'center';
        ctx.fillText('🏅 行医资格证书', canvas.width / 2, 120);
        
        ctx.font = '20px Microsoft YaHei';
        ctx.fillStyle = '#a0522d';
        ctx.fillText('CERTIFICATE OF MEDICAL PRACTICE', canvas.width / 2, 160);
        
        ctx.font = '24px Microsoft YaHei';
        ctx.fillStyle = '#5d4037';
        ctx.fillText('兹证明', canvas.width / 2, 230);
        
        ctx.font = 'bold 36px Microsoft YaHei';
        ctx.fillStyle = '#4a90d9';
        ctx.fillText(this.certificateNameEl.textContent, canvas.width / 2, 290);
        
        ctx.font = '24px Microsoft YaHei';
        ctx.fillStyle = '#5d4037';
        ctx.fillText('已完成', canvas.width / 2, 340);
        
        ctx.font = 'bold 32px Microsoft YaHei';
        ctx.fillStyle = '#4caf50';
        ctx.fillText(this.certificateLevelEl.textContent, canvas.width / 2, 390);
        
        ctx.font = '20px Microsoft YaHei';
        ctx.fillStyle = '#5d4037';
        ctx.fillText('等级的全部诊疗任务', canvas.width / 2, 430);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(80, 470, canvas.width - 160, 120);
        
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.fillStyle = '#4a90d9';
        ctx.textAlign = 'center';
        ctx.fillText(this.certificateScoreEl.textContent, 180, 520);
        ctx.font = '16px Microsoft YaHei';
        ctx.fillStyle = '#666';
        ctx.fillText('治愈病例', 180, 550);
        
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.fillStyle = '#ff9800';
        ctx.fillText(this.certificateComboEl.textContent, 300, 520);
        ctx.font = '16px Microsoft YaHei';
        ctx.fillStyle = '#666';
        ctx.fillText('最高连击', 300, 550);
        
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.fillStyle = '#4caf50';
        ctx.fillText(this.certificateAccuracyEl.textContent, 420, 520);
        ctx.font = '16px Microsoft YaHei';
        ctx.fillStyle = '#666';
        ctx.fillText('准确率', 420, 550);
        
        ctx.font = '18px Microsoft YaHei';
        ctx.fillStyle = '#8b7355';
        ctx.fillText(this.certificateDateEl.textContent, canvas.width / 2, 660);
        
        ctx.font = 'italic 20px Microsoft YaHei';
        ctx.fillStyle = '#8b4513';
        ctx.fillText('✒️ 语言医学院', canvas.width / 2, 710);
        
        ctx.font = '14px Microsoft YaHei';
        ctx.fillStyle = '#999';
        ctx.fillText('文字手术模拟器 - 语言医生', canvas.width / 2, 760);
        
        this.posterModalEl.style.display = 'flex';
    }

    closePosterModal() {
        this.posterModalEl.style.display = 'none';
    }

    downloadPoster() {
        const canvas = this.posterCanvasEl;
        const link = document.createElement('a');
        link.download = `行医资格证_${this.currentLevel}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        this.showFeedback(true, '海报已保存！', '快去朋友圈分享你的成就吧！');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TextSurgeryGame();
});
