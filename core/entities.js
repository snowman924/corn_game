(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        const exports = factory();
        root.Player = exports.Player;
        root.Enemy = exports.Enemy;
        root.ButterSoldier = exports.ButterSoldier;
        root.BigButter = exports.BigButter;
        root.Projectile = exports.Projectile;
    }
}(typeof self !== 'undefined' ? self : this, function () {

    class Player {
        constructor(x, y, upgrades) {
            this.x = x;
            this.y = y;
            this.radius = 16;
            
            // 업그레이드 레벨별 기본 스펙 결정
            const hpLevel = upgrades ? (upgrades.maxHp || 1) : 1;
            const speedLevel = upgrades ? (upgrades.speed || 1) : 1;
            
            // HP: Lv1=100, Lv2=125, Lv3=150
            this.maxHp = 100 + (hpLevel - 1) * 25;
            this.hp = this.maxHp;
            
            // Speed: Lv1=240px/s (4px/frame), Lv2=288px/s (4.8px/frame), Lv3=330px/s (5.5px/frame)
            this.speed = 240 + (speedLevel - 1) * 48;
            
            this.equippedSkills = []; // ["salt", "ice", etc]
            this.skillCooldowns = [0, 0]; // 각 스킬 슬롯별 잔여 쿨타임 (초)
            this.skillMaxCooldowns = [6, 12]; // 각 스킬 기본 쿨타임
            
            this.heatState = 1; // 1: 노랑, 2: 주황, 3: 빨강, 4: 팝콘
            this.isInvincible = false;
            this.invincibilityTimer = 0;
            
            // 대시 관련 상태
            this.isDashing = false;
            this.dashTimer = 0;
            this.dashDuration = 0.4; // 0.4초간 대시
            this.dashVx = 0;
            this.dashVy = 0;
            
            // 아이스팩 방어력 버프 관련 상태
            this.defenseBuffTimer = 0;
            this.defenseBuffDuration = 2.0; // 2초 지속
        }

        takeDamage(amount) {
            if (this.isInvincible) return 0;
            
            let actualDamage = amount;
            // 방어 버프가 활성화된 경우 데미지 50% 감소
            if (this.defenseBuffTimer > 0) {
                actualDamage *= 0.5;
            }
            
            this.hp = Math.max(0, this.hp - actualDamage);
            this.updateHeatState();
            
            // 무적 시간 0.2초 부여 (기본 피격 시)
            this.isInvincible = true;
            this.invincibilityTimer = 0.2;
            
            return actualDamage;
        }

        updateHeatState() {
            const hpRatio = this.hp / this.maxHp;
            if (hpRatio <= 0) {
                this.heatState = 4; // 사망 (팝콘 팡!)
            } else if (hpRatio <= 0.4) {
                this.heatState = 3; // 시뻘개짐
            } else if (hpRatio <= 0.7) {
                this.heatState = 2; // 누리끼리 주황색
            } else {
                this.heatState = 1; // 건강한 노랑
            }
        }

        update(dt) {
            // 무적 타이머 처리
            if (this.isInvincible && !this.isDashing) {
                this.invincibilityTimer -= dt;
                if (this.invincibilityTimer <= 0) {
                    this.isInvincible = false;
                }
            }

            // 대시 타이머 처리
            if (this.isDashing) {
                this.dashTimer -= dt;
                if (this.dashTimer <= 0) {
                    this.isDashing = false;
                    this.isInvincible = false;
                }
            }

            // 아이스팩 버프 타이머 처리
            if (this.defenseBuffTimer > 0) {
                this.defenseBuffTimer -= dt;
            }

            // 스킬 쿨타임 감소
            for (let i = 0; i < this.skillCooldowns.length; i++) {
                if (this.skillCooldowns[i] > 0) {
                    this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i] - dt);
                }
            }
        }
    }

    class Enemy {
        constructor(x, y, hp, speed, radius, damage) {
            this.x = x;
            this.y = y;
            this.hp = hp;
            this.speed = speed;
            this.radius = radius;
            this.damage = damage;
            this.isDead = false;
            this.flashTimer = 0; // 피격 시 번쩍이는 연출용
        }

        takeDamage(amount) {
            this.hp -= amount;
            this.flashTimer = 0.15; // 0.15초간 피격 번쩍임
            if (this.hp <= 0) {
                this.isDead = true;
            }
        }

        update(dt, playerX, playerY) {
            if (this.flashTimer > 0) {
                this.flashTimer -= dt;
            }
        }
    }

    // 버터 기름 병정
    class ButterSoldier extends Enemy {
        constructor(x, y) {
            super(x, y, 1, 60, 14, 10); // 체력 1, 속도 60px/s, 반경 14px, 직접 충돌 시 데미지 10
            this.shootCooldown = 3.0; // 3초 주기 사격
            this.angle = 0;
        }

        update(dt, playerX, playerY, createProjectileCallback) {
            super.update(dt, playerX, playerY);
            
            // 플레이어를 따라가는 방향 벡터 구하기
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
                this.angle = Math.atan2(dy, dx);
            }

            // 총알 발사 연산
            this.shootCooldown -= dt;
            if (this.shootCooldown <= 0) {
                this.shootCooldown = 3.0;
                // 플레이어 방향으로 기름 발사
                if (createProjectileCallback && dist > 5) {
                    createProjectileCallback(this.x, this.y, dx / dist, dy / dist);
                }
            }
        }
    }

    // 빅버터 (보스 / 환경 장애물)
    class BigButter extends Enemy {
        constructor(x, y, targetX, targetY, mapWidth = 800, mapHeight = 450) {
            // 무적 장애물이므로 체력을 높게 설정하고 데미지는 대시 충돌 시 25
            super(x, y, 9999, 320, 25, 25); 
            this.targetX = targetX;
            this.targetY = targetY;
            this.mapWidth = mapWidth;
            this.mapHeight = mapHeight;
            
            // 돌진 방향 각도 계산
            const dx = targetX - x;
            const dy = targetY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
            
            this.warningTimer = 1.0; // 1.0초간 경고 가이드 표시 후 출발
            this.isDashing = false;
            
            // 충돌 판정용 사각형 정보 (돌진 시 약간 사각형 덩어리로 판정)
            const isVertical = Math.abs(dy) > Math.abs(dx);
            this.width = isVertical ? 40 : 60;
            this.height = isVertical ? 60 : 40;
        }

        update(dt, playerX, playerY, addTrailCallback) {
            super.update(dt, playerX, playerY);

            if (this.warningTimer > 0) {
                this.warningTimer -= dt;
                if (this.warningTimer <= 0) {
                    this.isDashing = true;
                }
                return;
            }

            if (this.isDashing) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                
                // 지나간 자리에 버터 트레일 장판 생성
                if (addTrailCallback) {
                    addTrailCallback(this.x, this.y);
                }
                
                // 화면 밖으로 멀리 나가면 제거 대상 처리
                if (this.x < -150 || this.x > this.mapWidth + 150 || this.y < -150 || this.y > this.mapHeight + 150) {
                    this.isDead = true;
                }
            }
        }
    }

    // 기름 총알 / 버터 트레일
    class Projectile {
        constructor(x, y, vx, vy, type = 'oil') {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.type = type; // 'oil': 발사형 총알, 'trail': 바닥에 녹은 버터 장판
            
            if (type === 'oil') {
                this.radius = 5;
                this.speed = 180; // 180px/s
                this.damage = 15;
                this.lifeTime = 5.0; // 5초 뒤 소멸
            } else {
                // 버터 장판
                this.radius = 20; // 밟는 범위
                this.damage = 5; // 밟으면 지속 데미지 (초당 데미지로 계산)
                this.lifeTime = 3.0; // 3초간 머무름
            }
            this.isDead = false;
        }

        update(dt) {
            this.lifeTime -= dt;
            if (this.lifeTime <= 0) {
                this.isDead = true;
                return;
            }

            if (this.type === 'oil') {
                this.x += this.vx * this.speed * dt;
                this.y += this.vy * this.speed * dt;
            }
        }
    }

    return { Player, Enemy, ButterSoldier, BigButter, Projectile };
}));
