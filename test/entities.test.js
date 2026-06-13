const { Player, ButterSoldier, Projectile } = require('../core/entities');
const { GameEngine } = require('../core/gameEngine');

describe('Entities & Skills Logic', () => {

    it('T-AUTO-04: HP 비율에 따른 열화 단계(heatState) 변경 검증', () => {
        const player = new Player(400, 225);
        player.maxHp = 100;
        player.hp = 100;

        // HP 100% -> 1단계
        player.updateHeatState();
        assert.equal(player.heatState, 1, "체력이 70% 초과일 때 heatState는 1이어야 합니다.");

        // HP 60% -> 2단계
        player.hp = 60;
        player.updateHeatState();
        assert.equal(player.heatState, 2, "체력이 40% 초과, 70% 이하일 때 heatState는 2이어야 합니다.");

        // HP 30% -> 3단계
        player.hp = 30;
        player.updateHeatState();
        assert.equal(player.heatState, 3, "체력이 0% 초과, 40% 이하일 때 heatState는 3이어야 합니다.");

        // HP 0% -> 4단계 (팝콘 변신)
        player.hp = 0;
        player.updateHeatState();
        assert.equal(player.heatState, 4, "체력이 0% 이하일 때 heatState는 4(사망/팝콘)여야 합니다.");
    });

    it('T-AUTO-05: 소금 뿌리기 스킬 범위 내 적 즉사 검증', () => {
        const engine = new GameEngine(800, 450);
        engine.init({
            upgrades: {},
            equippedSkills: ["salt", "ice"]
        });

        // 플레이어 위치 (400, 225)
        engine.player.x = 400;
        engine.player.y = 225;

        // 적 스폰
        // 1. 범위 120px 안쪽 적 (거리 80px) -> 처치 대상
        const s1 = new ButterSoldier(480, 225);
        engine.enemies.push(s1);
        
        // 2. 범위 120px 바깥쪽 적 (거리 150px) -> 생존 대상
        const s2 = new ButterSoldier(550, 225);
        engine.enemies.push(s2);

        // 스킬 시전! (첫 번째 슬롯이 salt 스킬)
        engine.update(0.01, { x: 0, y: 0 }, [true, false]);

        assert.equal(s1.isDead, true, "120px 이내의 기름 병정은 즉사해야 합니다.");
        assert.equal(s2.isDead, false, "120px 밖의 기름 병정은 생존해야 합니다.");
    });

    it('T-AUTO-06: 아이스 팩 사용 시 체력 회복 및 방어막 데미지 경감 검증', () => {
        const engine = new GameEngine(800, 450);
        engine.init({
            upgrades: {},
            equippedSkills: ["salt", "ice"]
        });

        // 1. 체력을 50으로 설정
        engine.player.hp = 50;
        engine.player.maxHp = 100;
        engine.player.isInvincible = false;

        // 2. 아이스 팩 시전 (두 번째 슬롯이 ice 스킬)
        engine.update(0.01, { x: 0, y: 0 }, [false, true]);

        // 아이스팩은 즉시 HP 25 회복함 -> HP 75가 되어야 함
        assert.equal(engine.player.hp, 75, "아이스팩 사용 시 HP가 25 회복되어야 합니다.");
        assert.ok(engine.player.defenseBuffTimer > 0, "아이스팩 사용 시 방어 버프 타이머가 켜져야 합니다.");

        // 3. 무적 해제 후 피격 데미지 테스트 (기본 데미지 20)
        // 방어 버프가 켜져 있어 20의 반인 10의 데미지만 입어야 함
        engine.player.isInvincible = false;
        engine.player.takeDamage(20);

        assert.equal(engine.player.hp, 65, "방어 버프 중에는 데미지가 50%만 감소해 들어가야 합니다.");
    });

    it('T-AUTO-07: 알맹이 대시 중 무적 상태 및 데미지 차단 검증', () => {
        const engine = new GameEngine(800, 450);
        // 대시 스킬 장착
        engine.init({
            upgrades: {},
            equippedSkills: ["dash", "salt"]
        });

        engine.player.x = 400;
        engine.player.y = 225;
        engine.player.hp = 100;

        // 1. 대시 발동 (첫 번째 슬롯 dash 스킬)
        engine.update(0.01, { x: 1, y: 0 }, [true, false]);

        assert.equal(engine.player.isDashing, true, "대시 스킬 발동 시 대시 상태가 켜져야 합니다.");
        assert.equal(engine.player.isInvincible, true, "대시 중에는 무적 상태여야 합니다.");

        // 2. 대시 상태에서 데미지 가함 -> 데미지를 입지 않아야 함
        engine.player.takeDamage(30);
        assert.equal(engine.player.hp, 100, "대시 무적 상태 동안은 데미지를 입지 않아야 합니다.");
    });
});
