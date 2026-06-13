document.addEventListener('DOMContentLoaded', () => {
    // 모바일 브라우저 핀치 줌 및 제스처 방지
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    });

    // 1. 객체 생성 및 인스턴스화
    const soundManager = new SoundManager();
    const shopManager = new ShopManager();
    const engine = new GameEngine(800, 450);
    const canvas = document.getElementById('game-canvas');
    const renderer = new CanvasRenderer(canvas, engine);

    // 오디오 콜백 바인딩
    engine.onPlaySFX = (type) => soundManager.playSFX(type);

    // 첫 터치/클릭 시 오디오 컨텍스트 사전 활성화 (브라우저 정책 강제 잠금 해제)
    const unlockAudio = () => {
        soundManager.initContext();
    };
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    // 2. DOM 엘리먼트 수집
    // 화면 스크린들
    const screens = {
        intro: document.getElementById('intro-screen'),
        lobby: document.getElementById('lobby-screen'),
        game: document.getElementById('game-screen'),
        result: document.getElementById('result-screen')
    };

    // 모달창들
    const modals = {
        pause: document.getElementById('pause-modal'),
        shop: document.getElementById('shop-modal'),
        skillSelect: document.getElementById('skill-select-modal')
    };

    // 버튼 및 조작 엘리먼트
    const nextSlideBtn = document.getElementById('next-slide-btn');
    const skipIntroBtn = document.getElementById('skip-intro-btn');
    const startBtn = document.getElementById('start-game-btn');
    const openShopBtn = document.getElementById('open-shop-btn');
    const closeShopBtn = document.getElementById('close-shop-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const quitBtn = document.getElementById('quit-btn');
    const closeSkillModalBtn = document.getElementById('close-skill-modal-btn');
    
    // 결과 화면 UI 항목
    const retryBtn = document.getElementById('retry-game-btn');
    const resultLobbyBtn = document.getElementById('result-lobby-btn');
    
    // 장착 슬롯 터치 버튼
    const lobbySlot1 = document.getElementById('slot-1');
    const lobbySlot2 = document.getElementById('slot-2');

    // 인게임 HUD 항목
    const hpBarInner = document.getElementById('hp-bar-inner');
    const hpText = document.getElementById('hp-text');
    const gameTimer = document.getElementById('game-timer');
    const gameCoinCount = document.getElementById('game-coin-count');
    const skillActionBtn1 = document.getElementById('action-skill-1');
    const skillActionBtn2 = document.getElementById('action-skill-2');

    // 조작 스틱 엘리먼트
    const joystickContainer = document.getElementById('joystick-container');
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');

    // 3. 인게임 입력 및 루프 상태 변수
    let currentSlide = 0;
    let inputVector = { x: 0, y: 0 };
    let activeSkillsPressed = [false, false];
    
    // 키보드 키 매핑
    let keysPressed = {};
    
    // 터치 조작 데이터
    let isTouchingJoystick = false;
    let joystickStartPos = { x: 0, y: 0 };
    let joystickMaxDistance = 50; // 스틱 최대 이동 거리 (px)

    // 게임 루프 변수
    let animationFrameId = null;
    let lastTime = 0;
    let isPaused = false;
    let targetSkillSlotIndex = 0; // 스킬 장착 시 대상 슬롯

    // 스킬 사전 메타데이터 (아이콘 및 한글 이름)
    const skillMeta = {
        salt: { name: "소금 뿌리기", icon: "🧂", desc: "주변 사방 기름 병정들을 기절/사살" },
        ice: { name: "아이스 팩", icon: "🧊", desc: "HP 즉시 25 회복 & 2초간 방어 50%" },
        dash: { name: "알맹이 대시", icon: "⚡", desc: "입력 방향으로 순간 무적 대시 슬라이딩" }
    };

    // ==========================================================================
    // 화면 이동/제어 헬퍼 함수
    // ==========================================================================
    function showScreen(screenKey) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenKey].classList.add('active');
        
        if (screenKey === 'lobby') {
            updateLobbyUI();
        }
    }

    function openModal(modal) {
        modal.classList.add('active');
        if (modal === modals.shop) {
            updateShopUI();
        }
    }

    function closeModal(modal) {
        modal.classList.remove('active');
    }

    // ==========================================================================
    // 1. 인트로 슬라이드쇼 기능
    // ==========================================================================
    const slides = document.querySelectorAll('.story-slide');
    const dots = document.querySelectorAll('.slide-dots .dot');

    function updateSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;

        if (currentSlide === slides.length - 1) {
            nextSlideBtn.innerText = '로비로 가기';
        } else {
            nextSlideBtn.innerText = '다음';
        }
    }

    nextSlideBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        if (currentSlide < slides.length - 1) {
            updateSlide(currentSlide + 1);
        } else {
            showScreen('lobby');
        }
    });

    skipIntroBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        showScreen('lobby');
    });

    // ==========================================================================
    // 2. 로비 UI 제어 & 스킬 장착 기능
    // ==========================================================================
    function updateLobbyUI() {
        document.getElementById('lobby-coin-count').innerText = shopManager.saveData.coins;
        
        // 장착 스킬 표시
        const equipped = shopManager.saveData.equippedSkills;
        setupLobbySlot(lobbySlot1, equipped[0]);
        setupLobbySlot(lobbySlot2, equipped[1]);
    }

    function setupLobbySlot(slotEl, skillKey) {
        const iconEl = slotEl.querySelector('.equipped-skill-icon');
        if (skillKey && skillMeta[skillKey]) {
            slotEl.classList.remove('empty');
            slotEl.classList.add('equipped');
            iconEl.innerText = skillMeta[skillKey].icon;
        } else {
            slotEl.classList.add('empty');
            slotEl.classList.remove('equipped');
            iconEl.innerText = '';
        }
    }

    // 장착 슬롯 클릭 시 스킬 선택창 띄우기
    lobbySlot1.addEventListener('click', () => {
        soundManager.playSFX('click');
        openSkillSelectModal(0);
    });
    lobbySlot2.addEventListener('click', () => {
        soundManager.playSFX('click');
        openSkillSelectModal(1);
    });

    function openSkillSelectModal(slotIndex) {
        targetSkillSlotIndex = slotIndex;
        const listContainer = document.getElementById('modal-skill-list');
        listContainer.innerHTML = '';

        // 해금 가능한 전체 스킬들을 나열
        Object.keys(skillMeta).forEach(skillKey => {
            const isUnlocked = shopManager.saveData.unlockedSkills[skillKey];
            const meta = skillMeta[skillKey];
            const item = document.createElement('div');
            item.className = `skill-select-item ${isUnlocked ? '' : 'locked'}`;
            
            item.innerHTML = `
                <div class="skill-item-info">
                    <span class="skill-item-icon">${meta.icon}</span>
                    <div class="skill-item-text">
                        <h4>${meta.name}</h4>
                        <p>${meta.desc}</p>
                    </div>
                </div>
                ${isUnlocked 
                    ? `<button class="btn primary skill-item-btn">장착</button>`
                    : `<button class="btn secondary skill-item-btn" disabled>🔒 잠김</button>`
                }
            `;

            if (isUnlocked) {
                item.querySelector('.skill-item-btn').addEventListener('click', () => {
                    soundManager.playSFX('upgrade');
                    shopManager.equipSkill(targetSkillSlotIndex, skillKey);
                    closeModal(modals.skillSelect);
                    updateLobbyUI();
                });
            }

            listContainer.appendChild(item);
        });

        openModal(modals.skillSelect);
    }

    closeSkillModalBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        closeModal(modals.skillSelect);
    });

    // ==========================================================================
    // 3. 상점 (Shop) 기능 구현
    // ==========================================================================
    openShopBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        openModal(modals.shop);
    });
    closeShopBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        closeModal(modals.shop);
    });

    // 탭 제어
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.shop-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playSFX('click');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    function updateShopUI() {
        document.getElementById('shop-coin-count').innerText = shopManager.saveData.coins;
        
        // 능력치 강화 렌더링
        const statContainer = document.getElementById('tab-stat');
        statContainer.innerHTML = '';
        
        const stats = [
            { key: 'maxHp', name: '두꺼운 껍질 (최대 체력)', desc: '알맹이의 껍질을 늘려 최대 HP를 늘립니다.', max: 3 },
            { key: 'speed', name: '말랑 부스터 (이동 속도)', desc: '이동 속도가 영구히 증가합니다.', max: 3 }
        ];

        stats.forEach(stat => {
            const lvl = shopManager.saveData.upgrades[stat.key];
            const cost = shopManager.costs[stat.key][lvl + 1];
            const isMax = lvl >= stat.max;

            const item = document.createElement('div');
            item.className = 'shop-item';
            
            let lvlDots = '';
            for (let i = 1; i <= stat.max; i++) {
                lvlDots += `<span class="level-dot ${i <= lvl ? 'active' : ''}"></span>`;
            }

            item.innerHTML = `
                <div class="shop-item-left">
                    <div class="shop-item-details">
                        <h4>${stat.name}</h4>
                        <p>${stat.desc}</p>
                        <div class="shop-level-indicators">${lvlDots}</div>
                    </div>
                </div>
                <div>
                    ${isMax 
                        ? `<button class="btn secondary buy-btn" disabled>Max</button>` 
                        : `<button class="btn primary buy-btn">🍿 ${cost}</button>`
                    }
                </div>
            `;

            if (!isMax) {
                item.querySelector('.buy-btn').addEventListener('click', () => {
                    soundManager.playSFX('click');
                    const res = shopManager.buyStatUpgrade(stat.key);
                    if (res.success) {
                        soundManager.playSFX('upgrade');
                        updateShopUI();
                        updateLobbyUI();
                    } else {
                        alert(res.message);
                    }
                });
            }

            statContainer.appendChild(item);
        });

        // 스킬 구매/강화 렌더링
        const skillContainer = document.getElementById('tab-skill');
        skillContainer.innerHTML = '';

        // 대시 스킬 해금 항목 추가
        const isDashUnlocked = shopManager.saveData.unlockedSkills.dash;
        const dashItem = document.createElement('div');
        dashItem.className = 'shop-item';
        
        dashItem.innerHTML = `
            <div class="shop-item-left">
                <span class="skill-item-icon" style="font-size: 2.2rem; margin-right: 8px;">⚡</span>
                <div class="shop-item-details">
                    <h4>알맹이 대시 스킬 해금</h4>
                    <p>뜨거운 적을 기절시키고 무적 상태로 돌진합니다.</p>
                </div>
            </div>
            <div>
                ${isDashUnlocked 
                    ? `<button class="btn secondary buy-btn" disabled>해금됨</button>` 
                    : `<button class="btn primary buy-btn">🍿 150</button>`
                }
            </div>
        `;

        if (!isDashUnlocked) {
            dashItem.querySelector('.buy-btn').addEventListener('click', () => {
                soundManager.playSFX('click');
                const res = shopManager.unlockDashSkill();
                if (res.success) {
                    soundManager.playSFX('upgrade');
                    updateShopUI();
                } else {
                    alert(res.message);
                }
            });
        }
        skillContainer.appendChild(dashItem);
    }

    // ==========================================================================
    // 4. 인게임 흐름 및 조작부 연동
    // ==========================================================================
    startBtn.addEventListener('click', startNewGame);
    retryBtn.addEventListener('click', startNewGame);
    resultLobbyBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        showScreen('lobby');
    });

    function startNewGame() {
        soundManager.initContext();
        soundManager.playSFX('click');
        soundManager.playBGM();

        // 게임 엔진 초기화 (세이브 데이터 전달)
        engine.init(shopManager.saveData);
        
        // HUD 초기 세팅
        hpBarInner.style.width = '100%';
        hpText.innerText = `${engine.player.hp}/${engine.player.maxHp}`;
        gameTimer.innerText = '60.0';
        gameCoinCount.innerText = '0';

        // 모바일 스킬 버튼 활성화/아이콘 갱신
        setupGameSkillBtn(skillActionBtn1, engine.player.equippedSkills[0]);
        setupGameSkillBtn(skillActionBtn2, engine.player.equippedSkills[1]);

        inputVector = { x: 0, y: 0 };
        activeSkillsPressed = [false, false];
        keysPressed = {};
        isPaused = false;
        lastTime = performance.now();

        // 캔버스 크기 맞춤
        resizeCanvas();

        showScreen('game');

        // 이전에 도는 루프가 있다면 정지
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // 루프 구동
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function setupGameSkillBtn(btnEl, skillKey) {
        const iconEl = btnEl.querySelector('.btn-icon');
        btnEl.querySelector('.btn-cooldown').style.transform = 'scale(0)';
        
        if (skillKey && skillMeta[skillKey]) {
            btnEl.classList.remove('disabled');
            btnEl.classList.add('active-ready');
            iconEl.innerText = skillMeta[skillKey].icon;
        } else {
            btnEl.classList.add('disabled');
            btnEl.classList.remove('active-ready');
            iconEl.innerText = '🔒';
        }
    }

    // 윈도우 크기 변화에 대응해 Canvas 비율 유지 리사이즈
    window.addEventListener('resize', resizeCanvas);
    function resizeCanvas() {
        const rect = canvas.parentNode.getBoundingClientRect();
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }

    // ==========================================================================
    // 가상 조작패드 (Touch Joystick) 연동
    // ==========================================================================
    canvas.addEventListener('touchstart', (e) => {
        if (engine.status !== 'PLAYING') return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        isTouchingJoystick = true;
        
        // 터치 시작점 기록
        joystickStartPos = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };

        // 가상 스틱 UI 노출
        joystickContainer.style.left = `${joystickStartPos.x - 65}px`;
        joystickContainer.style.top = `${joystickStartPos.y - 65}px`;
        joystickContainer.classList.add('active');
        
        joystickStick.style.transform = 'translate(0px, 0px)';
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!isTouchingJoystick) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        const currentPos = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };

        // 중심거리 연산
        let dx = currentPos.x - joystickStartPos.x;
        let dy = currentPos.y - joystickStartPos.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) {
            // 정규화 입력 할당
            inputVector.x = dx / distance;
            inputVector.y = dy / distance;
            
            // 입력 벡터 스케일
            const stickDist = Math.min(distance, joystickMaxDistance);
            inputVector.x *= (stickDist / joystickMaxDistance);
            inputVector.y *= (stickDist / joystickMaxDistance);

            // 스틱 이동 렌더링
            const visualX = (dx / distance) * stickDist;
            const visualY = (dy / distance) * stickDist;
            joystickStick.style.transform = `translate(${visualX}px, ${visualY}px)`;
        }
    });

    canvas.addEventListener('touchend', () => {
        isTouchingJoystick = false;
        inputVector = { x: 0, y: 0 };
        
        joystickContainer.classList.remove('active');
        joystickStick.style.transform = 'translate(0px, 0px)';
    });

    // ==========================================================================
    // PC 키보드 키 연동 (WASD/Arrows + J/K)
    // ==========================================================================
    window.addEventListener('keydown', (e) => {
        keysPressed[e.code] = true;
        updatePCInput();
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.code] = false;
        
        // 스킬 키 바인딩 릴리즈
        if (e.code === 'KeyJ') activeSkillsPressed[0] = false;
        if (e.code === 'KeyK') activeSkillsPressed[1] = false;

        updatePCInput();
    });

    function updatePCInput() {
        if (isTouchingJoystick) return; // 터치 중이면 키보드 무시

        let kx = 0;
        let ky = 0;

        if (keysPressed['KeyW'] || keysPressed['ArrowUp']) ky -= 1;
        if (keysPressed['KeyS'] || keysPressed['ArrowDown']) ky += 1;
        if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) kx -= 1;
        if (keysPressed['KeyD'] || keysPressed['ArrowRight']) kx += 1;

        // 키 입력 정규화
        const len = Math.sqrt(kx * kx + ky * ky);
        if (len > 0.1) {
            inputVector.x = kx / len;
            inputVector.y = ky / len;
        } else {
            inputVector.x = 0;
            inputVector.y = 0;
        }

        // 스킬 단축키 감지
        if (keysPressed['KeyJ']) activeSkillsPressed[0] = true;
        if (keysPressed['KeyK']) activeSkillsPressed[1] = true;
    }

    // 모달/스킬 버튼 모바일 터치 이벤트 연결
    skillActionBtn1.addEventListener('touchstart', (e) => {
        e.preventDefault();
        activeSkillsPressed[0] = true;
    });
    skillActionBtn1.addEventListener('touchend', () => {
        activeSkillsPressed[0] = false;
    });
    skillActionBtn1.addEventListener('mousedown', () => {
        activeSkillsPressed[0] = true;
    });
    skillActionBtn1.addEventListener('mouseup', () => {
        activeSkillsPressed[0] = false;
    });

    skillActionBtn2.addEventListener('touchstart', (e) => {
        e.preventDefault();
        activeSkillsPressed[1] = true;
    });
    skillActionBtn2.addEventListener('touchend', () => {
        activeSkillsPressed[1] = false;
    });
    skillActionBtn2.addEventListener('mousedown', () => {
        activeSkillsPressed[1] = true;
    });
    skillActionBtn2.addEventListener('mouseup', () => {
        activeSkillsPressed[1] = false;
    });

    // ==========================================================================
    // 5. 프레임 틱 루프 (Game Loop)
    // ==========================================================================
    function gameLoop(time) {
        if (isPaused || engine.status !== 'PLAYING') return;

        let dt = (time - lastTime) / 1000.0;
        lastTime = time;

        // 최대 델타 타임 제한 (탭 비활성화 후 복귀 시 비정상 순간 이동 방지)
        if (dt > 0.1) dt = 0.1;

        // 엔진 연산 수행
        engine.update(dt, inputVector, activeSkillsPressed);

        // 렌더러 Canvas 드로잉
        renderer.draw();

        // 인게임 UI HUD 갱신
        updateHUD();

        // 스킬 버튼 활성화 릴리즈 (PC 키가 아닐 경우 다음 프레임에 뗌 처리)
        if (!keysPressed['KeyJ']) activeSkillsPressed[0] = false;
        if (!keysPressed['KeyK']) activeSkillsPressed[1] = false;

        // 게임 결과 판정
        if (engine.status === 'GAMEOVER' || engine.status === 'VICTORY') {
            triggerGameEnd();
        } else {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    function updateHUD() {
        // 체력 바 업데이트
        const hpRatio = engine.player.hp / engine.player.maxHp;
        hpBarInner.style.width = `${hpRatio * 100}%`;
        hpText.innerText = `${Math.ceil(engine.player.hp)}/${engine.player.maxHp}`;
        
        // HP 부족 시 깜빡임 이펙트 바인딩
        if (hpRatio <= 0.4) {
            hpBarInner.style.animation = 'pulse 0.5s infinite alternate';
        } else {
            hpBarInner.style.animation = 'none';
        }

        // 타이머 업데이트 (소수점 1자리)
        const leftTime = Math.max(0, 60.0 - engine.gameTime);
        gameTimer.innerText = leftTime.toFixed(1);

        // 코인 텍스트
        gameCoinCount.innerText = engine.coinsEarned;

        // 스킬 버튼 쿨타임 애니메이션 갱신
        updateSkillBtnCooldown(skillActionBtn1, 0);
        updateSkillBtnCooldown(skillActionBtn2, 1);
    }

    function updateSkillBtnCooldown(btnEl, slotIndex) {
        const cdOverlay = btnEl.querySelector('.btn-cooldown');
        const currentCd = engine.player.skillCooldowns[slotIndex];
        const maxCd = engine.player.skillMaxCooldowns[slotIndex];

        if (currentCd > 0) {
            btnEl.classList.add('cooldown');
            btnEl.classList.remove('active-ready');
            cdOverlay.style.transform = 'scale(1)';
            cdOverlay.innerText = currentCd.toFixed(1);
        } else {
            btnEl.classList.remove('cooldown');
            if (!btnEl.classList.contains('disabled')) {
                btnEl.classList.add('active-ready');
            }
            cdOverlay.style.transform = 'scale(0)';
            cdOverlay.innerText = '';
        }
    }

    function triggerGameEnd() {
        cancelAnimationFrame(animationFrameId);
        soundManager.stopBGM();
        
        // 세이브 데이터에 코인 가산 및 디스크 저장
        shopManager.addCoins(engine.coinsEarned);

        // 결과화면 UI 설정
        const isWin = engine.status === 'VICTORY';
        const titleEl = document.getElementById('result-title');
        const charEl = document.getElementById('result-corn-char');

        if (isWin) {
            soundManager.playSFX('victory');
            titleEl.innerText = "🎉 생존 성공!";
            titleEl.className = "result-title victory";
            charEl.innerText = "🌽✨💃"; // 춤추는 옥수수
        } else {
            titleEl.innerText = "🍿 팝콘 팡!";
            titleEl.className = "result-title gameover";
            charEl.innerText = "🍿😇👼"; // 천사 팝콘
        }

        // 시간 포맷팅
        const minutes = Math.floor(engine.gameTime / 60);
        const seconds = Math.floor(engine.gameTime % 60);
        document.getElementById('result-time').innerText = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // 킬 카운트 집계
        const kills = Math.floor((engine.coinsEarned - Math.floor(engine.gameTime) - (isWin ? 100 : 0)) / 2);
        document.getElementById('result-kills').innerText = Math.max(0, kills);
        
        // 코인 증정 액수 표시
        document.getElementById('result-coins').innerText = `+${engine.coinsEarned}`;

        showScreen('result');
    }

    // ==========================================================================
    // 6. 일시정지 및 포커스 아웃 예외 제어
    // ==========================================================================
    pauseBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        togglePause();
    });
    resumeBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        togglePause();
    });
    quitBtn.addEventListener('click', () => {
        soundManager.playSFX('click');
        soundManager.stopBGM();
        closeModal(modals.pause);
        isPaused = false;
        cancelAnimationFrame(animationFrameId);
        showScreen('lobby');
    });

    function togglePause() {
        if (engine.status !== 'PLAYING') return;

        if (!isPaused) {
            // 정지
            isPaused = true;
            cancelAnimationFrame(animationFrameId);
            openModal(modals.pause);
        } else {
            // 재개
            closeModal(modals.pause);
            isPaused = false;
            lastTime = performance.now();
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }

    // 브라우저 탭 포커스 변경 감지(Window Blur) 시 자동 일시정지
    window.addEventListener('blur', () => {
        if (engine.status === 'PLAYING' && !isPaused) {
            togglePause();
        }
    });

    // 최초 로드 시 인트로 화면 띄우기
    showScreen('intro');
});
