# 말랑 옥수수의 핫팬 탈출! (Soft Corn's Hot Pan Escape)
### 시스템 설계서 (System Architecture Design) - *자동화 테스트 보강 버전*

본 설계서는 모바일 웹 브라우저 환경에서 실행되는 '말랑 옥수수의 핫팬 탈출!' 게임의 구조를 정의합니다. 특히 **자동화 테스트가 용이하도록 비즈니스 로직(Model/Controller)과 화면 렌더링(View)을 철저히 분리하는 구조**를 채택했습니다.

---

## 1. 파일 구조 (Directory & File Structure)

```
/home/sangtai/git-repo/corn_game/
├── planning/
│   ├── game_design_specification.md        # 상세 게임 기획서
│   ├── system_architecture_design.md       # 시스템 설계서 (본 파일)
│   ├── development_implementation_plan.md  # 구현 계획서
│   └── verification_test_plan.md           # 테스트 계획서
├── index.html                             # 메인 엔트리 HTML (Lobby, Shop UI)
├── style.css                              # 스타일시트 (UI 레이아웃 및 효과)
├── core/                                  # [핵심 로직 - 브라우저 독립적 / 테스트 가능]
│   ├── gameEngine.js                      # 게임 루프 및 좌표 연산 로직 (Headless 가능)
│   ├── entities.js                        # Player, Enemy, Projectile 등의 순수 데이터/논리 클래스
│   └── shopManager.js                     # 상점 데이터, 가격 공식, 세이브 로직
├── render/                                # [화면 표현 - DOM/Canvas 의존성]
│   ├── canvasRenderer.js                  # Canvas에 그리는 렌더링 코드 (View)
│   └── uiController.js                    # HTML UI 갱신 및 터치/키보드 입력 연동
└── test/                                  # [자동화 테스트 스위트]
    ├── runTests.js                        # Node.js 환경에서 실행되는 커스텀 테스트 러너
    ├── gameEngine.test.js                 # 물리, 이동, 충돌 로직 단위 테스트
    ├── entities.test.js                   # 체력 감소, 익어감 상태, 스킬 쿨타임 단위 테스트
    └── shopManager.test.js                # 세이브/로드 및 영구 강화 연동 단위 테스트
```

---

## 2. 기술 스택 (Technical Stack)

모바일 웹 접근성을 극대화하고 가볍고 빠른 로딩을 위해 다음과 같은 가벼운 순수 웹 표준(Vanilla) 스택을 사용하며, CLI 환경에서의 빌드 및 단위 테스트용 도구를 탑재합니다.

### 2.1. 프런트엔드 코어 (Frontend Core)
*   **HTML5**: 의미론적(Semantic) 태그 구성 및 모바일 대응을 위한 반응형 Viewport 설정.
*   **CSS3**: Flexbox/Grid 레이아웃, 글래스모피즘(Glassmorphism) 필터 효과(`backdrop-filter`), 다양한 화면 크기 대응을 위한 반응형 폰트 및 트랜지션 애니메이션 정의.
*   **Javascript (ES6+)**: 모듈식 설계(`import`/`export`)를 지원하며 클래스 지향적인 엔티티 설계.

### 2.2. 게임 엔진 & 렌더링 (Game Engine & Rendering)
*   **HTML5 Canvas 2D Context API**: 고성능 2D 그래픽 렌더링 및 60fps 애니메이션 프레임 제어.
*   **`requestAnimationFrame` API**: 브라우저 화면 주사율에 동기화되는 효율적인 게임 루프 처리.

### 2.3. 데이터 퍼시스턴스 (Data Persistence)
*   **Web Storage API (localStorage)**: 플레이어의 팝콘 코인 수량 및 상점 영구 강화 수치를 로컬 브라우저에 자동 세이브/로드.
*   **StorageProxy 구현**: Node.js 단위 테스트 실행 시 브라우저 의존성 회피용 가상 인메모리 스토리지 자동 전환 모듈.

### 2.4. 개발 및 테스트 도구 (Dev & Testing Tools)
*   **로컬 개발 서버**: Node.js 기반의 경량 로컬 개발 서버 (`http-server` 혹은 Vite dev server).
*   **테스트 러너**: 별도 중량 프레임워크 없는 **Vanilla JS 커스텀 CLI 테스트 러너** (`test/runTests.js`). 테스트 속도를 극한으로 끌어올리고 브라우저 미탑재(Headless) 환경에서 0.1초 내 전수 검증 가능.

---

## 3. 자동화 검증을 위한 테스트 용이성 설계 (Design for Testability)

게임 루프와 물리 엔진은 브라우저 DOM 객체(`window`, `document`, `canvas`)에 의존할 경우 Node.js 등 CLI 환경에서 자동 테스트가 불가능합니다. 이를 해결하기 위해 **Model-View-Controller (MVC) 패턴**을 변형하여 구현합니다.

### 2.1. 독립적인 GameEngine (Model & Controller)
*   `GameEngine` 클래스는 순수한 Javascript 객체로 구성되며, 프레임 업데이트 시 시간 단위(`dt`)와 플레이어 입력 벡터 `(vx, vy)`를 직접 인자로 전달받아 연산합니다.
*   Canvas Context를 인자로 받지 않으며, 모든 충돌 판정 및 엔티티 위치 계산은 순수 수학 연산으로 처리됩니다.

### 2.2. 분리된 Renderer (View)
*   `CanvasRenderer` 클래스는 `GameEngine`의 인스턴스를 읽기 전용(Read-only)으로 참조하여, 프레임마다 Canvas에 그림만 그려주는 역할을 담당합니다.
*   이로 인해 그래픽 렌더링에 문제가 생기더라도, 게임 규칙이나 캐릭터의 물리 충돌 로직은 완전히 분리되어 자동으로 단위 테스트(Unit Test)를 실행할 수 있습니다.

---

## 3. 핵심 모듈 상세 설계

### 3.1. GameEngine Class (독립 모듈)
```javascript
class GameEngine {
    constructor(width = 800, height = 450) {
        this.width = width;
        this.height = height;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.gameTime = 0;
        this.status = 'READY'; // READY, PLAYING, GAMEOVER, VICTORY
        this.coinsEarned = 0;
    }

    init(saveData) {
        // 플레이어 속도, HP 등을 세이브 데이터를 기반으로 초기화
    }

    update(dt, inputVector, activeSkillsPressed) {
        if (this.status !== 'PLAYING') return;
        this.gameTime += dt;
        
        // 1. 플레이어 이동 및 경계선 제한 연산
        // 2. 적 캐릭터 스폰 로직 및 이동 연산
        // 3. 충돌 검증 (플레이어 <-> 기름 방울, 플레이어 <-> 버터 트레일)
        // 4. 스킬 실행 로직 연산
        // 5. 게임오버/승리 시간 도달 판정 (60초 초과 시 VICTORY)
    }
}
```

### 3.2. shopManager.js (독립 모듈)
*   `localStorage`를 직접 사용하되, 테스트 환경(Node.js)에서는 `localStorage`가 글로벌 객체로 정의되어 있지 않으므로 **Memory Mock Storage**로 대체될 수 있도록 래핑하여 설계합니다.
*   **스토리지 모킹 추상화**:
    ```javascript
    class StorageProxy {
        constructor() {
            this.storage = (typeof window !== 'undefined' && window.localStorage) 
                ? window.localStorage 
                : this.createMockStorage();
        }
        createMockStorage() {
            let store = {};
            return {
                getItem: (key) => store[key] || null,
                setItem: (key, value) => { store[key] = value.toString(); },
                clear: () => { store = {}; }
            };
        }
    }
    ```

---

## 4. 데이터 저장 포맷 (Save Data Schema)

로컬 저장 데이터 포맷은 동일하게 유지하되, `shopManager` 테스트 코드에서 이 데이터 스키마가 의도치 않게 깨지는 것을 자동 방지하도록 스키마 검증(Validation) 함수를 모듈 내에 포함시킵니다.
