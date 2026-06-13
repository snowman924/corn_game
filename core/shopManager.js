(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js
        module.exports = factory();
    } else {
        // Browser
        root.ShopManager = factory().ShopManager;
    }
}(typeof self !== 'undefined' ? self : this, function () {

    class StorageProxy {
        constructor() {
            this.isBrowser = false;
            this.mockStore = {};
            try {
                this.isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage !== null;
                if (this.isBrowser) {
                    const testKey = '__test_storage__';
                    window.localStorage.setItem(testKey, '1');
                    window.localStorage.removeItem(testKey);
                }
            } catch (e) {
                this.isBrowser = false;
            }
        }

        getItem(key) {
            if (this.isBrowser) {
                return window.localStorage.getItem(key);
            }
            return this.mockStore[key] || null;
        }

        setItem(key, value) {
            if (this.isBrowser) {
                window.localStorage.setItem(key, value);
            } else {
                this.mockStore[key] = String(value);
            }
        }

        clear() {
            if (this.isBrowser) {
                window.localStorage.clear();
            } else {
                this.mockStore = {};
            }
        }
    }

    class ShopManager {
        constructor() {
            this.storage = new StorageProxy();
            this.storageKey = 'corn_game_save_data';
            
            // 업그레이드 비용 정의
            this.costs = {
                maxHp: { 2: 50, 3: 120 },
                speed: { 2: 60, 3: 150 },
                saltSkill: { 2: 100 },
                iceSkill: { 2: 100 },
                dashUnlock: 150
            };

            this.saveData = this.getNewSaveData();
            this.load();
        }

        getNewSaveData() {
            return {
                coins: 0,
                upgrades: {
                    maxHp: 1, // 최대 레벨 3
                    speed: 1, // 최대 레벨 3
                    saltSkill: 1, // 최대 레벨 2
                    iceSkill: 1 // 최대 레벨 2
                },
                unlockedSkills: {
                    salt: true,
                    ice: true,
                    dash: false // 상점 최초 해금 대상
                },
                equippedSkills: ["salt", "ice"]
            };
        }

        load() {
            try {
                const rawData = this.storage.getItem(this.storageKey);
                if (rawData) {
                    const parsed = JSON.parse(rawData);
                    // 유효성 체크 및 데이터 마이그레이션
                    this.saveData = {
                        coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
                        upgrades: {
                            maxHp: parsed.upgrades?.maxHp || 1,
                            speed: parsed.upgrades?.speed || 1,
                            saltSkill: parsed.upgrades?.saltSkill || 1,
                            iceSkill: parsed.upgrades?.iceSkill || 1
                        },
                        unlockedSkills: {
                            salt: parsed.unlockedSkills?.salt !== undefined ? parsed.unlockedSkills.salt : true,
                            ice: parsed.unlockedSkills?.ice !== undefined ? parsed.unlockedSkills.ice : true,
                            dash: parsed.unlockedSkills?.dash !== undefined ? parsed.unlockedSkills.dash : false
                        },
                        equippedSkills: Array.isArray(parsed.equippedSkills) ? parsed.equippedSkills : ["salt", "ice"]
                    };
                } else {
                    this.saveData = this.getNewSaveData();
                    this.save();
                }
            } catch (e) {
                this.saveData = this.getNewSaveData();
                this.save();
            }
        }

        save() {
            this.storage.setItem(this.storageKey, JSON.stringify(this.saveData));
        }

        reset() {
            this.saveData = this.getNewSaveData();
            this.save();
        }

        addCoins(amount) {
            this.saveData.coins += amount;
            this.save();
        }

        // 기본 스탯 업그레이드 시도
        buyStatUpgrade(statName) {
            const currentLvl = this.saveData.upgrades[statName];
            if (currentLvl === undefined) return { success: false, message: '알 수 없는 스탯입니다.' };
            
            const nextLvl = currentLvl + 1;
            const maxLevel = (statName === 'maxHp' || statName === 'speed') ? 3 : 2;
            
            if (nextLvl > maxLevel) {
                return { success: false, message: '이미 최대 강화 레벨입니다.' };
            }

            const cost = this.costs[statName][nextLvl];
            if (this.saveData.coins < cost) {
                return { success: false, message: `코인이 부족합니다. (필요 코인: ${cost})` };
            }

            this.saveData.coins -= cost;
            this.saveData.upgrades[statName] = nextLvl;
            this.save();

            return { success: true, nextLvl };
        }

        // 대시 스킬 해금 시도
        unlockDashSkill() {
            if (this.saveData.unlockedSkills.dash) {
                return { success: false, message: '이미 해금된 스킬입니다.' };
            }

            const cost = this.costs.dashUnlock;
            if (this.saveData.coins < cost) {
                return { success: false, message: `코인이 부족합니다. (필요 코인: ${cost})` };
            }

            this.saveData.coins -= cost;
            this.saveData.unlockedSkills.dash = true;
            this.save();

            return { success: true };
        }

        // 스킬 장착 시도
        equipSkill(slotIndex, skillName) {
            if (slotIndex !== 0 && slotIndex !== 1) {
                return { success: false, message: '잘못된 스킬 슬롯 인덱스입니다.' };
            }
            
            // 해금 여부 체크
            if (!this.saveData.unlockedSkills[skillName]) {
                return { success: false, message: '아직 해금되지 않은 스킬입니다.' };
            }

            // 중복 장착 체크
            const otherSlotIndex = slotIndex === 0 ? 1 : 0;
            if (this.saveData.equippedSkills[otherSlotIndex] === skillName) {
                // 두 슬롯의 스킬 교체
                const temp = this.saveData.equippedSkills[slotIndex];
                this.saveData.equippedSkills[slotIndex] = skillName;
                this.saveData.equippedSkills[otherSlotIndex] = temp;
            } else {
                this.saveData.equippedSkills[slotIndex] = skillName;
            }

            this.save();
            return { success: true };
        }
    }

    return { StorageProxy, ShopManager };
}));
