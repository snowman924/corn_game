const { GameEngine } = require('../core/gameEngine');

describe('GameEngine - Core Physics & Rules', () => {

    it('T-AUTO-01: 플레이어 경계선 탈출 방지 검증', () => {
        const engine = new GameEngine(800, 450);
        engine.init({
            upgrades: { maxHp: 1, speed: 1 },
            equippedSkills: ["salt", "ice"]
        });

        // 1. 플레이어를 오른쪽 경계선 근처로 텔레포트
        engine.player.x = 795;
        engine.player.y = 200;

        // 2. 오른쪽 방향(x=1, y=0)으로 2초간 이동 업데이트
        // 플레이어 속도는 Lv.1 기준 240px/s이므로, 경계 차단이 없다면 795 + 480 = 1275px 가 되어야 함
        const inputVector = { x: 1, y: 0 };
        engine.update(1.0, inputVector, [false, false]);
        engine.update(1.0, inputVector, [false, false]);

        // 플레이어의 반지름은 16px이므로 최대로 갈 수 있는 x는 800 - 16 = 784이어야 함 (어이쿠, 795에서 시작해도 784로 땡겨져서 강제 멈춰야 함)
        assert.equal(engine.player.x, 800 - engine.player.radius, "플레이어 좌표가 오른쪽 경계를 초과하지 않아야 합니다.");
        
        // 3. 왼쪽 경계선 밖으로 나가는 경우 테스트
        engine.player.x = 5;
        engine.update(0.1, { x: -1, y: 0 }, [false, false]);
        assert.equal(engine.player.x, engine.player.radius, "플레이어 좌표가 왼쪽 경계선보다 작아지면 안 됩니다.");
    });

    it('T-AUTO-02: 2D 충돌 판정 거리 검증', () => {
        const engine = new GameEngine(800, 450);
        engine.init();

        // 플레이어 중심 (400, 225), 반경 16
        engine.player.x = 400;
        engine.player.y = 225;
        engine.player.hp = 100;
        engine.player.isInvincible = false;

        // 발사체 생성: 플레이어 반경 16 + 발사체 반경 5 = 합산 21px 이내에 들어와야 충돌
        // 1. 충돌 범위 밖인 경우 (거리 25px) -> 플레이어 체력에 변화가 없고 발사체 생존해야 함
        const p1 = new (require('../core/entities').Projectile)(425, 225, 0, 0, 'oil');
        engine.projectiles.push(p1);
        
        engine.update(0.01, { x: 0, y: 0 }, [false, false]);
        assert.equal(engine.player.hp, 100, "충돌 범위 외에서는 데미지를 받지 않아야 합니다.");
        assert.equal(p1.isDead, false, "충돌 범위 외에서는 투사체가 사라지지 않아야 합니다.");

        // 2. 충돌 범위 안인 경우 (거리 15px) -> 플레이어가 데미지를 입고 투사체가 사라져야 함
        const p2 = new (require('../core/entities').Projectile)(415, 225, 0, 0, 'oil');
        engine.projectiles.push(p2);

        // 무적 끄기
        engine.player.isInvincible = false;
        
        engine.update(0.01, { x: 0, y: 0 }, [false, false]);
        assert.ok(engine.player.hp < 100, "충돌 범위 내 진입 시 플레이어 체력이 깎여야 합니다.");
        assert.equal(p2.isDead, true, "충돌한 발사형 투사체는 소멸 처리되어야 합니다.");
    });

    it('T-AUTO-03: 60초 완전 생존 시 승리 처리 검증', () => {
        const engine = new GameEngine(800, 450);
        engine.init();
        
        assert.equal(engine.status, 'PLAYING');
        
        // 1분 생존을 시뮬레이션하기 위해 dt = 60초로 업데이트
        engine.update(60.0, { x: 0, y: 0 }, [false, false]);
        
        assert.equal(engine.status, 'VICTORY', "60초 생존 시 게임 상태는 VICTORY로 변경되어야 합니다.");
        assert.ok(engine.coinsEarned >= 100, "생존 성공 시 보너스 팝콘 코인을 획득해야 합니다.");
    });

    it('T-AUTO-12: 빅버터 세로 및 가로 스폰 방향과 그에 따른 크기 검증', () => {
        const engine = new GameEngine(800, 450);
        const { BigButter } = require('../core/entities');

        // 여러 번 스폰을 시도하여 가로와 세로 둘 다 정상적으로 생성되는지 검증
        let hasHorizontal = false;
        let hasVertical = false;

        for (let i = 0; i < 20; i++) {
            engine.enemies = [];
            engine.spawnBigButter();
            const bb = engine.enemies[0];
            assert.ok(bb instanceof BigButter, "빅버터가 스폰되어야 합니다.");

            const isVertical = Math.abs(bb.targetY - bb.y) > Math.abs(bb.targetX - bb.x);
            if (isVertical) {
                hasVertical = true;
                assert.equal(bb.width, 40, "세로 돌진 시 빅버터의 width는 40이어야 합니다.");
                assert.equal(bb.height, 60, "세로 돌진 시 빅버터의 height는 60이어야 합니다.");
            } else {
                hasHorizontal = true;
                assert.equal(bb.width, 60, "가로 돌진 시 빅버터의 width는 60이어야 합니다.");
                assert.equal(bb.height, 40, "가로 돌진 시 빅버터의 height는 40이어야 합니다.");
            }
        }

        assert.ok(hasHorizontal, "가로 방향으로 빅버터가 1회 이상 스폰되어야 합니다.");
        assert.ok(hasVertical, "세로 방향으로 빅버터가 1회 이상 스폰되어야 합니다.");
    });
});
