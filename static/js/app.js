class TextSurgeryGame {
    constructor() {
        this.currentExercise = null;
        this.doctor = null;
        this.qiValue = 100;
        this.score = 0;
        this.selectedPosition = null;
        this.isExerciseCompleted = false;
        
        this.initElements();
        this.initEventListeners();
        this.loadGame();
    }

    initElements() {
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
        
        this.feedbackPopupEl = document.getElementById('feedbackPopup');
        this.feedbackIconEl = document.getElementById('feedbackIcon');
        this.feedbackMessageEl = document.getElementById('feedbackMessage');
        this.feedbackExplanationEl = document.getElementById('feedbackExplanation');
        
        this.gameContainerEl = document.querySelector('.game-container');
    }

    initEventListeners() {
        this.nextBtnEl.addEventListener('click', () => this.loadNextExercise());
        
        this.modalCloseEl.addEventListener('click', () => this.closeModal());
        this.modalCancelEl.addEventListener('click', () => this.closeModal());
        this.modalSubmitEl.addEventListener('click', () => this.submitCorrection());
        this.modalDeleteEl.addEventListener('click', () => this.deleteWord());
        
        this.correctionInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.currentExercise && 
                    this.currentExercise.error_type === '赘字' && 
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
            const response = await fetch('/api/exercise/random');
            const data = await response.json();
            if (data.success) {
                this.currentExercise = data.data;
                this.isExerciseCompleted = false;
                this.updateExerciseDisplay();
                this.nextBtnEl.style.display = 'none';
            }
        } catch (error) {
            console.error('加载练习失败:', error);
            this.diagnosisTextEl.textContent = '加载失败，请刷新页面重试';
        }
    }

    async loadNextExercise() {
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
        
        if (this.currentExercise.error_type === '赘字') {
            this.doctorSaysEl.textContent = '这个句子里有多余的字哦，找出来并删除它吧！';
        } else {
            this.doctorSaysEl.textContent = '这个句子里有错别字哦，找出来并改正它吧！';
        }
    }

    handleCharClick(e) {
        if (this.isExerciseCompleted) return;
        
        const charEl = e.target;
        const position = parseInt(charEl.dataset.position);
        
        this.diagnosisTextEl.querySelectorAll('.char-word').forEach(el => {
            el.classList.remove('clicked');
        });
        
        charEl.classList.add('clicked');
        
        this.selectedPosition = position;
        this.openModal(charEl.textContent, position);
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
        
        this.score++;
        this.scoreValueEl.textContent = this.score;
        
        this.showFeedback(true, '太棒了！你成功修复了这个语病！', result.explanation);
        
        this.doctorSaysEl.textContent = '干得漂亮！这个病句已经被你治好了！';
        
        this.completeExercise();
    }

    handleCorrectDelete(error, result) {
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
        
        this.score++;
        this.scoreValueEl.textContent = this.score;
        
        this.showFeedback(true, '太棒了！你成功删除了多余的字！', result.explanation);
        
        this.doctorSaysEl.textContent = '完美！这个句子现在简洁多了！';
        
        this.completeExercise();
    }

    handleWrongSelection() {
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

    updateQiValue() {
        this.qiValue = Math.max(0, this.qiValue);
        this.qiValueEl.textContent = this.qiValue;
        this.qiBarEl.style.width = `${this.qiValue}%`;
        
        if (this.qiValue <= 30) {
            this.qiBarEl.style.background = 'linear-gradient(90deg, var(--error-color), #ff5722)';
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
                this.updateQiValue();
                this.scoreValueEl.textContent = this.score;
                this.loadGame();
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
}

document.addEventListener('DOMContentLoaded', () => {
    new TextSurgeryGame();
});
