const { ShopManager } = require('../core/shopManager');

describe('Shop & Save States Management', () => {

    it('T-AUTO-08: 코인 부족 시 구매 차단 검증', () => {
        const shop = new ShopManager();
        shop.reset();
        
        shop.saveData.coins = 10; // 10코인 설정

        // Max HP Lv2 비용은 50코인 -> 구매 거절되어야 함
        const res = shop.buyStatUpgrade('maxHp');
        
        assert.equal(res.success, false, "코인이 부족한 경우 구매에 실패해야 합니다.");
        assert.equal(shop.saveData.upgrades.maxHp, 1, "업그레이드 레벨이 변하면 안 됩니다.");
        assert.equal(shop.saveData.coins, 10, "코인이 소모되면 안 됩니다.");
    });

    it('T-AUTO-09: 상점 스탯/스킬 정상 구매 및 한계치 초과 차단 검증', () => {
        const shop = new ShopManager();
        shop.reset();

        // 1. 코인 충전 및 업그레이드
        shop.addCoins(200); // 200코인 충전
        assert.equal(shop.saveData.coins, 200);

        // Max HP Lv1 -> Lv2 (비용 50)
        let res = shop.buyStatUpgrade('maxHp');
        assert.equal(res.success, true);
        assert.equal(shop.saveData.upgrades.maxHp, 2);
        assert.equal(shop.saveData.coins, 150); // 200 - 50 = 150

        // Max HP Lv2 -> Lv3 (비용 120)
        res = shop.buyStatUpgrade('maxHp');
        assert.equal(res.success, true);
        assert.equal(shop.saveData.upgrades.maxHp, 3);
        assert.equal(shop.saveData.coins, 30); // 150 - 120 = 30

        // Max HP Lv3 -> Lv4 (초과 구매 차단 검증)
        res = shop.buyStatUpgrade('maxHp');
        assert.equal(res.success, false, "3단계 초과로 업그레이드할 수 없습니다.");
        assert.equal(shop.saveData.upgrades.maxHp, 3);
    });

    it('T-AUTO-10: 대시 스킬 해금 및 로비 장착 검증', () => {
        const shop = new ShopManager();
        shop.reset();

        // 대시는 기본적으로 해금되지 않음
        assert.equal(shop.saveData.unlockedSkills.dash, false);

        // 해금 요청 시 코인 부족 에러
        let res = shop.unlockDashSkill();
        assert.equal(res.success, false);

        // 150코인 충전 후 해금 성공 검증
        shop.addCoins(150);
        res = shop.unlockDashSkill();
        assert.equal(res.success, true);
        assert.equal(shop.saveData.unlockedSkills.dash, true);
        assert.equal(shop.saveData.coins, 0);

        // 스킬 슬롯 1에 대시 장착 검증
        res = shop.equipSkill(0, 'dash');
        assert.equal(res.success, true);
        assert.equal(shop.saveData.equippedSkills[0], 'dash');
    });

    it('T-AUTO-11: 미해금 스킬 장착 시도 차단 및 중복 스킬 장착 시 스와핑 검증', () => {
        const shop = new ShopManager();
        shop.reset(); // 대시 미해금 상태

        // 미해금 대시 장착 시도 -> 실패해야 함
        let res = shop.equipSkill(0, 'dash');
        assert.equal(res.success, false, "잠겨 있는 스킬은 장착할 수 없습니다.");

        // 스롯 1에 ice, 슬롯 2에 salt 장착 (기본값과 반대로 교차)
        // 1번 슬롯(index 0)에 ice 장착 시도 (이미 index 1에 ice가 설정되어 있음)
        // 중복 장착 시 교차(Swap)가 일어나야 함
        // 기본값: slot[0]="salt", slot[1]="ice"
        assert.equal(shop.saveData.equippedSkills[0], 'salt');
        assert.equal(shop.saveData.equippedSkills[1], 'ice');

        res = shop.equipSkill(0, 'ice');
        assert.equal(res.success, true);
        assert.equal(shop.saveData.equippedSkills[0], 'ice', "슬롯 1에 ice가 들어가야 합니다.");
        assert.equal(shop.saveData.equippedSkills[1], 'salt', "슬롯 2에 salt로 밀려나야 합니다(스와핑).");
    });
});
