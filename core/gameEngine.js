(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js
        const entities = require('./entities');
        module.exports = factory(entities);
    } else {
        // Browser
        root.GameEngine = factory({
            Player: root.Player,
            ButterSoldier: root.ButterSoldier,
            BigButter: root.BigButter,
            Projectile: root.Projectile
        }).GameEngine;
    }
}(typeof self !== 'undefined' ? self : this, function (entities) {
    const { Player, ButterSoldier, BigButter, Projectile } = entities;

    class GameEngine {
        constructor(width = 800, height = 450) {
            this.width = width;
            this.height = height;
            this.player = null;
            this.enemies = [];
            this.projectiles = [];
            this.effects = []; // 이펙트 목록 (가상 이펙트 객체 저장: {x, y, radius, duration, maxDuration, type})
            
            this.gameTime = 0;
            this.status = 'READY'; // READY, PLAYING, GAMEOVER, VICTORY
            this.coinsEarned = 0;
            
            this.spawnTimer = 0;
            this.bigButterSchedule = [15.0, 35.0, 50.0];
            this.bigButterSpawned = [false, false, false];
            
            this.screenShake = 0;
            this.onPlaySFX = null;
        }

        init(saveData) {
            this.player = new Player(this.width / 2, this.height / 2, saveData ? saveData.upgrades : null);
            
            // 상점에서 장착된 스킬들 설정
            if (saveData && saveData.equippedSkills) {
                this.player.equippedSkills = [...saveData.equippedSkills];
            } else {
                this.player.equippedSkills = ["salt", "ice"]; // 기본 스킬 2개
            }
            
            // 스킬별 기본/업그레이드 쿨타임 지정
            this.player.skillMaxCooldowns = this.player.equippedSkills.map(skill => {
                if (skill === 'salt') {
                    const lvl = saveData?.upgrades?.saltSkill || 1;
                    return lvl >= 2 ? 5.0 : 6.0; // 2레벨은 쿨타임 5초
                }
                if (skill === 'ice') {
                    return 12.0; // 아이스팩 12초
                }
                if (skill === 'dash') {
                    const lvl = saveData?.upgrades?.dashSkill || 1;
                    return lvl >= 2 ? 6.5 : 8.0; // 대시 2레벨 쿨타임 6.5초
                }
                return 10.0;
            });
            
            this.player.skillCooldowns = this.player.equippedSkills.map(() => 0);

            this.enemies = [];
            this.projectiles = [];
            this.effects = [];
            
            this.gameTime = 0;
            this.status = 'PLAYING';
            this.coinsEarned = 0;
            this.spawnTimer = 0;
            this.bigButterSpawned = [false, false, false];
            this.screenShake = 0;
        }

        update(dt, inputVector = { x: 0, y: 0 }, activeSkillsPressed = [false, false]) {
            if (this.status !== 'PLAYING') return;

            this.gameTime += dt;
            if (this.screenShake > 0) {
                this.screenShake = Math.max(0, this.screenShake - dt * 10);
            }

            // 1. 플레이어 상태 업데이트 (무적시간, 대시, 버프 등)
            this.player.update(dt);

            // 2. 플레이어 대시 물리 및 일반 이동 처리
            let currentSpeed = this.player.speed;
            
            // 버터 트레일 위를 걷는 경우 이동속도 40% 감소 (60% 적용)
            let isOnTrail = false;
            for (const proj of this.projectiles) {
                if (proj.type === 'trail' && !proj.isDead) {
                    const dx = this.player.x - proj.x;
                    const dy = this.player.y - proj.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.player.radius + proj.radius) {
                        isOnTrail = true;
                        // 지속 데미지 (초당 5)
                        this.player.hp = Math.max(0, this.player.hp - proj.damage * dt);
                        this.player.updateHeatState();
                    }
                }
            }
            
            if (isOnTrail) {
                currentSpeed *= 0.6;
            }

            if (this.player.isDashing) {
                // 대시 이동
                this.player.x += this.player.dashVx * dt;
                this.player.y += this.player.dashVy * dt;
            } else {
                // 일반 입력 이동
                const inputLen = Math.sqrt(inputVector.x * inputVector.x + inputVector.y * inputVector.y);
                if (inputLen > 0.1) {
                    // 벡터 정규화 및 이동 속도 곱하기
                    const nx = inputVector.x / inputLen;
                    const ny = inputVector.y / inputLen;
                    this.player.x += nx * currentSpeed * dt;
                    this.player.y += ny * currentSpeed * dt;
                }
            }

            // 프라이팬 경계선 제한 (벽 충돌)
            this.player.x = Math.max(this.player.radius, Math.min(this.width - this.player.radius, this.player.x));
            this.player.y = Math.max(this.player.radius, Math.min(this.height - this.player.radius, this.player.y));

            // 3. 액티브 스킬 작동 처리
            for (let i = 0; i < this.player.equippedSkills.length; i++) {
                if (activeSkillsPressed[i] && this.player.skillCooldowns[i] <= 0) {
                    this.triggerSkill(this.player.equippedSkills[i], i, inputVector);
                }
            }

            // 4. 빅버터 스폰 제어
            for (let i = 0; i < this.bigButterSchedule.length; i++) {
                if (this.gameTime >= this.bigButterSchedule[i] && !this.bigButterSpawned[i]) {
                    this.bigButterSpawned[i] = true;
                    this.spawnBigButter();
                }
            }

            // 5. 기름 병정 주기적 스폰 (매 5초마다, 시간에 따라 스폰 수 증가)
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnTimer = 5.0;
                // 생존 10초당 스폰 수 1개씩 추가 (최소 2개)
                const count = 2 + Math.floor(this.gameTime / 10);
                for (let i = 0; i < count; i++) {
                    this.spawnButterSoldier();
                }
            }

            // 6. 적 개체 업데이트 및 충돌 판정
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                
                // 빅버터 업데이트
                if (enemy instanceof BigButter) {
                    enemy.update(dt, this.player.x, this.player.y, (tx, ty) => {
                        // 버터 장판 콜백
                        this.projectiles.push(new Projectile(tx, ty, 0, 0, 'trail'));
                    });
                } else {
                    // 일반 기름 병정 업데이트
                    enemy.update(dt, this.player.x, this.player.y, (sx, sy, vx, vy) => {
                        // 총알 발사 콜백
                        this.projectiles.push(new Projectile(sx, sy, vx, vy, 'oil'));
                    });
                }

                if (enemy.isDead) {
                    this.enemies.splice(i, 1);
                    continue;
                }

                // 플레이어 <-> 적 충돌 판정
                if (!this.player.isDead) {
                    if (enemy instanceof BigButter) {
                        // 빅버터 사각형 AABB 또는 원형 간이 판정
                        const dx = Math.abs(this.player.x - enemy.x);
                        const dy = Math.abs(this.player.y - enemy.y);
                        if (dx < (this.player.radius + enemy.width / 2) && dy < (this.player.radius + enemy.height / 2)) {
                            if (this.player.isDashing) {
                                // 대시 중엔 보스한테 튕겨나감
                                this.player.isDashing = false;
                                this.player.isInvincible = false;
                            } else {
                                const dmg = this.player.takeDamage(enemy.damage);
                                if (dmg > 0) {
                                    this.screenShake = 3.0;
                                    if (this.onPlaySFX) this.onPlaySFX('hit');
                                }
                            }
                        }
                    } else {
                        // 기름 병정 충돌 판정
                        const dx = this.player.x - enemy.x;
                        const dy = this.player.y - enemy.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < this.player.radius + enemy.radius) {
                            if (this.player.isDashing) {
                                // 대시 중 적 충돌 시 적 처치
                                enemy.takeDamage(100);
                                this.coinsEarned += 2;
                            } else {
                                const dmg = this.player.takeDamage(enemy.damage);
                                if (dmg > 0) {
                                    this.screenShake = 1.5;
                                    if (this.onPlaySFX) this.onPlaySFX('hit');
                                }
                            }
                        }
                    }
                }
            }

            // 7. 투사체 업데이트 및 플레이어 충돌 판정
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const proj = this.projectiles[i];
                proj.update(dt);

                if (proj.isDead) {
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // 플레이어 <-> 발사형 오일 충돌 (장판은 위에서 처리함)
                if (proj.type === 'oil' && !this.player.isDead) {
                    const dx = this.player.x - proj.x;
                    const dy = this.player.y - proj.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.player.radius + proj.radius) {
                        const dmg = this.player.takeDamage(proj.damage);
                        if (dmg > 0) {
                            this.screenShake = 2.0;
                            if (this.onPlaySFX) this.onPlaySFX('hit');
                        }
                        proj.isDead = true;
                        this.projectiles.splice(i, 1);
                    }
                }
            }

            // 8. 파티클/이펙트 업데이트
            for (let i = this.effects.length - 1; i >= 0; i--) {
                const eff = this.effects[i];
                eff.duration -= dt;
                if (eff.duration <= 0) {
                    this.effects.splice(i, 1);
                }
            }

            // 9. 게임오버 및 승리 판정
            if (this.player.hp <= 0) {
                this.player.isDead = true;
                this.status = 'GAMEOVER';
                this.coinsEarned += Math.floor(this.gameTime); // 버틴 시간(초) 만큼 코인 증정
                if (this.onPlaySFX) this.onPlaySFX('pop');
            } else if (this.gameTime >= 60.0) {
                this.status = 'VICTORY';
                this.coinsEarned += 100 + Math.floor(this.gameTime); // 완전 성공 시 보너스 100코인 추가
            }
        }

        triggerSkill(skillType, slotIndex, inputVector) {
            this.player.skillCooldowns[slotIndex] = this.player.skillMaxCooldowns[slotIndex];

            if (this.onPlaySFX) this.onPlaySFX(skillType);

            if (skillType === 'salt') {
                // 소금 뿌리기
                const radius = 120;
                this.effects.push({
                    x: this.player.x,
                    y: this.player.y,
                    radius: radius,
                    duration: 0.5,
                    maxDuration: 0.5,
                    type: 'salt'
                });

                // 범위 내 기름 병정 즉사 및 투사체 제거
                for (const enemy of this.enemies) {
                    if (!(enemy instanceof BigButter)) {
                        const dx = enemy.x - this.player.x;
                        const dy = enemy.y - this.player.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= radius) {
                            enemy.takeDamage(100);
                            this.coinsEarned += 2;
                        }
                    }
                }
                
                for (const proj of this.projectiles) {
                    if (proj.type === 'oil') {
                        const dx = proj.x - this.player.x;
                        const dy = proj.y - this.player.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= radius) {
                            proj.isDead = true;
                        }
                    }
                }
            } 
            else if (skillType === 'ice') {
                // 아이스 팩
                const healAmount = 25; // 업그레이드 여부 확인
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                this.player.updateHeatState();
                this.player.defenseBuffTimer = this.player.defenseBuffDuration;

                this.effects.push({
                    x: this.player.x,
                    y: this.player.y,
                    radius: 40,
                    duration: 1.0,
                    maxDuration: 1.0,
                    type: 'ice'
                });
            } 
            else if (skillType === 'dash') {
                // 알맹이 대시
                this.player.isDashing = true;
                this.player.isInvincible = true;
                this.player.dashTimer = this.player.dashDuration;

                // 대시 방향 벡터 계산 (조작방향 기준, 없으면 임의 오른쪽)
                let dx = inputVector.x;
                let dy = inputVector.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                
                if (len < 0.1) {
                    dx = 1.0;
                    dy = 0.0;
                } else {
                    dx /= len;
                    dy /= len;
                }

                // 대시 속도는 기본 속도의 3배
                this.player.dashVx = dx * this.player.speed * 3.0;
                this.player.dashVy = dy * this.player.speed * 3.0;

                this.effects.push({
                    x: this.player.x,
                    y: this.player.y,
                    radius: 20,
                    duration: this.player.dashDuration,
                    maxDuration: this.player.dashDuration,
                    type: 'dash'
                });
            }
        }

        spawnButterSoldier() {
            // 화면 가장자리 네 곳 중 한 곳에서 생성
            const side = Math.floor(Math.random() * 4);
            let x, y;
            
            const offset = 30;
            if (side === 0) { // Top
                x = Math.random() * this.width;
                y = -offset;
            } else if (side === 1) { // Right
                x = this.width + offset;
                y = Math.random() * this.height;
            } else if (side === 2) { // Bottom
                x = Math.random() * this.width;
                y = this.height + offset;
            } else { // Left
                x = -offset;
                y = Math.random() * this.height;
            }

            this.enemies.push(new ButterSoldier(x, y));
        }

        spawnBigButter() {
            // 왼쪽 가장자리에서 등장해서 오른쪽으로 돌진, 혹은 그 반대
            const side = Math.floor(Math.random() * 2);
            let x, y, tx, ty;
            
            y = 100 + Math.random() * (this.height - 200); // 맵 중앙 부분 Y축
            ty = y;

            if (side === 0) { // Left -> Right
                x = -80;
                tx = this.width + 100;
            } else { // Right -> Left
                x = this.width + 80;
                tx = -100;
            }

            this.enemies.push(new BigButter(x, y, tx, ty));
        }
    }

    return { GameEngine };
}));
