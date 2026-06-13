(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SoundManager = factory().SoundManager;
    }
}(typeof self !== 'undefined' ? self : this, function () {

    class SoundManager {
        constructor() {
            this.ctx = null;
            this.bgmInterval = null;
            this.bgmNotes = [];
            this.bgmStep = 0;
            this.bgmVolume = 0.06; // BGM 볼륨 상향 (6%)
            this.sfxVolume = 0.22;  // SFX 볼륨 상향 (22%)
            this.isBgmPlaying = false;
        }

        initContext() {
            if (!this.ctx) {
                // 브라우저 Web Audio Context 생성
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    this.ctx = new AudioContextClass();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        // ==========================================================================
        // 8비트 Retro Chiptune BGM 합성 (코드 및 멜로디 루프)
        // ==========================================================================
        playBGM() {
            this.initContext();
            if (!this.ctx || this.isBgmPlaying) return;

            this.isBgmPlaying = true;
            this.bgmStep = 0;
            
            // C - G - Am - F 귀여운 4코드 멜로디 시퀀스
            // [멜로디 주파수, 베이스 주파수]
            const C = 261.63, D = 293.66, E = 329.63, G = 392.00, A = 440.00, B = 493.88;
            const C3 = 130.81, G2 = 98.00, A2 = 110.00, F2 = 87.31;
            
            this.bgmNotes = [
                // Bar 1: C 코드
                { melody: E, bass: C3 }, { melody: G, bass: null }, { melody: C * 2, bass: null }, { melody: G, bass: null },
                // Bar 2: G 코드
                { melody: D, bass: G2 }, { melody: G, bass: null }, { melody: B, bass: null }, { melody: G, bass: null },
                // Bar 3: Am 코드
                { melody: E, bass: A2 }, { melody: A, bass: null }, { melody: C * 2, bass: null }, { melody: A, bass: null },
                // Bar 4: F 코드
                { melody: F2 * 4, bass: F2 }, { melody: A, bass: null }, { melody: C * 2, bass: null }, { melody: A, bass: null }
            ];

            const tempo = 150; // BPM
            const stepDuration = 60 / tempo / 2; // 8분 음표 간격 (초)

            this.bgmInterval = setInterval(() => {
                if (!this.isBgmPlaying || !this.ctx) return;
                
                const note = this.bgmNotes[this.bgmStep];
                
                // 1. 멜로디 노트 연주 (Square Wave - 레트로 느낌)
                if (note.melody) {
                    this.playSynthNote(note.melody, 'square', stepDuration * 0.8, this.bgmVolume);
                }
                
                // 2. 베이스 노트 연주 (Triangle Wave - 부드러운 중저음)
                if (note.bass) {
                    this.playSynthNote(note.bass, 'triangle', stepDuration * 1.5, this.bgmVolume * 1.5);
                }

                this.bgmStep = (this.bgmStep + 1) % this.bgmNotes.length;
            }, stepDuration * 1000);
        }

        stopBGM() {
            this.isBgmPlaying = false;
            if (this.bgmInterval) {
                clearInterval(this.bgmInterval);
                this.bgmInterval = null;
            }
        }

        playSynthNote(freq, type, duration, volume) {
            if (!this.ctx) return;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            // 틱 소리 방지를 위한 페이드 아웃
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        }

        // ==========================================================================
        // 효과음(SFX) 신디사이징 연산 (Web Audio API)
        // ==========================================================================
        playSFX(type) {
            this.initContext();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            
            if (type === 'click') {
                // 버튼 클릭: 짧고 쨍한 비프음
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
                
                gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.08);
            } 
            else if (type === 'dash') {
                // 대시: 주파수가 빠르게 위로 치솟는 소리
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
                
                gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.2);
            }
            else if (type === 'salt') {
                // 소금 뿌리기: 화이트 노이즈 필터링 버스트 (바스락 쉭-)
                const bufferSize = this.ctx.sampleRate * 0.25; // 0.25초
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                
                // 랜덤 노이즈 채우기
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                const noiseNode = this.ctx.createBufferSource();
                noiseNode.buffer = buffer;
                
                // 쉭- 소리를 위한 하이패스 필터 연결
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(2500, now);
                
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(this.sfxVolume * 0.9, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
                
                noiseNode.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                
                noiseNode.start();
                noiseNode.stop(now + 0.25);
            }
            else if (type === 'ice') {
                // 아이스팩 힐링: 귀여운 청아한 아르페지오 차임벨소리 (도-미-솔-도)
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, idx) => {
                    const noteTime = now + idx * 0.07;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, noteTime);
                    
                    gain.gain.setValueAtTime(this.sfxVolume * 0.7, noteTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.25);
                    
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(noteTime);
                    osc.stop(noteTime + 0.25);
                });
            }
            else if (type === 'hit') {
                // 피격: 베이스가 떨어지며 디스토션된 소리
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.15);
                
                gain.gain.setValueAtTime(this.sfxVolume * 1.2, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.15);
            }
            else if (type === 'pop') {
                // 팝콘 폭발 (사망): 날카로운 비프음 + 노이즈 버스트
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);
                
                gain.gain.setValueAtTime(this.sfxVolume * 1.5, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.15);

                // 짧은 터지는 팝 노이즈 추가
                const bufferSize = this.ctx.sampleRate * 0.1;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(this.sfxVolume * 1.2, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
                noise.connect(noiseGain);
                noiseGain.connect(this.ctx.destination);
                noise.start();
                noise.stop(now + 0.1);
            }
            else if (type === 'victory') {
                // 승리: 경쾌하고 빵빠레 부는 듯한 상승 메이저 아르페지오
                const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, idx) => {
                    const noteTime = now + idx * 0.08;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, noteTime);
                    
                    gain.gain.setValueAtTime(this.sfxVolume * 0.8, noteTime);
                    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);
                    
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(noteTime);
                    osc.stop(noteTime + 0.35);
                });
            }
            else if (type === 'upgrade') {
                // 상점 업그레이드 성공: 디리링- 귀여운 상승 2음
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(880, now + 0.08);
                
                gain.gain.setValueAtTime(this.sfxVolume * 0.7, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.2);
            }
            else if (type === 'butterWarning') {
                // 빅버터 출현 경고음: 낮고 묵직하게 울리는 경고음 2번 (쿵! 쿵!)
                const playBeep = (delay, freq) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + delay);
                    
                    gain.gain.setValueAtTime(this.sfxVolume * 0.85, now + delay);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
                    
                    // 로우패스 필터로 부드럽게 (웅장하게)
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(250, now + delay);
                    
                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);
                    
                    osc.start(now + delay);
                    osc.stop(now + delay + 0.35);
                };
                
                playBeep(0, 110);
                playBeep(0.25, 110);
            }
            else if (type === 'butterSlide') {
                // 버터 미끄러지는 소리: 주파수가 스르륵 낮아지는 삼각파 + 슥- 하는 필터링된 노이즈
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);
                
                gain.gain.setValueAtTime(this.sfxVolume * 0.65, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(now + 0.8);

                // 스르륵 노이즈 (버터가 팬에 닿아 미끄러지는 느낌)
                const bufferSize = this.ctx.sampleRate * 0.8;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.Q.setValueAtTime(1.5, now);
                filter.frequency.setValueAtTime(900, now);
                filter.frequency.exponentialRampToValueAtTime(250, now + 0.8);

                const noiseGain = this.ctx.createGain();
                noiseGain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(this.ctx.destination);

                noise.start();
                noise.stop(now + 0.8);
            }
        }
    }

    return { SoundManager };
}));
