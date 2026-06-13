class CanvasRenderer {
    constructor(canvas, engine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.engine = engine;
        
        // 프라이팬 디테일용 스파크 파티클 효과 (시각적 풍성함 제공)
        this.panSparkles = [];
        for (let i = 0; i < 15; i++) {
            this.panSparkles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 1 + Math.random() * 2,
                alpha: Math.random(),
                speed: 0.2 + Math.random() * 0.5
            });
        }
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const player = this.engine.player;

        ctx.clearRect(0, 0, width, height);

        // 1. 화면 흔들림 효과 (Screen Shake) 적용
        ctx.save();
        if (this.engine.screenShake > 0) {
            const shake = this.engine.screenShake * 5; // 흔들림 강도
            const dx = (Math.random() - 0.5) * shake;
            const dy = (Math.random() - 0.5) * shake;
            ctx.translate(dx, dy);
        }

        // 2. 프라이팬 배경 그리기 (뜨거운 무쇠 팬 느낌)
        ctx.fillStyle = '#14111f';
        ctx.fillRect(0, 0, width, height);

        // 프라이팬 열기 효과 (중앙 붉은 그라데이션)
        const heatGrad = ctx.createRadialGradient(width/2, height/2, 50, width/2, height/2, width/1.5);
        heatGrad.addColorStop(0, '#541712'); // 은은한 불빛
        heatGrad.addColorStop(0.5, '#201324');
        heatGrad.addColorStop(1, '#0c0812');
        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, 0, width, height);

        // 가열 코일 링 그리기 (배경 디테일)
        ctx.strokeStyle = '#ff3c000d';
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.arc(width/2, height/2, 130, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width/2, height/2, 220, 0, Math.PI * 2);
        ctx.stroke();

        // 배경 스파크(지글거리는 미열 아지랑이) 업데이트 및 렌더링
        ctx.fillStyle = 'rgba(255, 120, 0, 0.15)';
        for (const spark of this.panSparkles) {
            spark.alpha += spark.speed * 0.05;
            if (spark.alpha > 1) {
                spark.alpha = 0;
                spark.x = Math.random() * width;
                spark.y = Math.random() * height;
            }
            ctx.globalAlpha = spark.alpha;
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // 3. 버터 트레일 장판 그리기 (녹아서 흘러내리는 끈적한 노란 버터 느낌)
        for (const proj of this.engine.projectiles) {
            if (proj.type === 'trail') {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.22)';
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // 안쪽 진한 부분
                ctx.fillStyle = 'rgba(255, 235, 120, 0.15)';
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, proj.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 4. 빅버터 경고선 및 본체 렌더링
        for (const enemy of this.engine.enemies) {
            if (enemy instanceof BigButter) {
                if (enemy.warningTimer > 0) {
                    // 돌진 가이드라인 (반투명 경고 빨간띠)
                    ctx.save();
                    ctx.strokeStyle = 'rgba(230, 33, 23, 0.35)';
                    const isVertical = Math.abs(enemy.targetY - enemy.y) > Math.abs(enemy.targetX - enemy.x);
                    ctx.lineWidth = isVertical ? enemy.width : enemy.height;
                    ctx.setLineDash([15, 10]);
                    
                    // 돌진 궤적 그리기
                    ctx.beginPath();
                    ctx.moveTo(enemy.x, enemy.y);
                    ctx.lineTo(enemy.targetX, enemy.targetY);
                    ctx.stroke();
                    ctx.restore();

                    // "⚠️ 버터 돌격!" 문구 띄우기
                    ctx.font = 'bold 12px ' + getComputedStyle(document.body).getPropertyValue('--font-heading');
                    ctx.fillStyle = '#e62117';
                    ctx.textAlign = 'center';
                    
                    if (isVertical) {
                        let textX = enemy.x - 80;
                        if (textX < 50) textX = enemy.x + 80;
                        const textY = enemy.y + (enemy.targetY > enemy.y ? 150 : -150);
                        ctx.fillText('⚠️ 버터 급습 주의!', textX, textY);
                    } else {
                        // 경고 표시 Y축 보정
                        let textY = enemy.y - 30;
                        if (textY < 30) textY = enemy.y + 45;
                        ctx.fillText('⚠️ 버터 급습 주의!', Math.max(100, Math.min(width - 100, enemy.x + (enemy.targetX > enemy.x ? 150 : -150))), textY);
                    }
                }

                // 빅버터 바디 (네모난 버터 덩어리)
                ctx.save();
                ctx.translate(enemy.x, enemy.y);
                
                // 버터 덩어리 3D 느낌 입체 박스 그리기
                ctx.fillStyle = '#e6af17'; // 어두운 노랑 (측면 입체)
                ctx.fillRect(-enemy.width/2 + 4, -enemy.height/2 + 6, enemy.width, enemy.height);
                
                // 전면 버터 노란색
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(-enemy.width/2, -enemy.height/2, enemy.width, enemy.height);

                // 버터 윗면 밝은 하이라이트
                ctx.fillStyle = '#fffae0';
                ctx.fillRect(-enemy.width/2, -enemy.height/2, enemy.width, 6);

                // 사악하고 귀여운 표정 그리기
                ctx.strokeStyle = '#422400';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                
                // 눈 (> < 모양)
                ctx.beginPath();
                ctx.moveTo(-16, -4); ctx.lineTo(-10, -8); ctx.lineTo(-16, -12);
                ctx.moveTo(10, -4); ctx.lineTo(16, -8); ctx.lineTo(10, -12);
                ctx.stroke();
                
                // 입 (으스대는 삐뚤어진 입)
                ctx.beginPath();
                ctx.moveTo(-8, 6);
                ctx.quadraticCurveTo(0, 0, 8, 4);
                ctx.stroke();

                ctx.restore();
            }
        }

        // 5. 일반 기름 병정 (ButterSoldier) 그리기
        for (const enemy of this.engine.enemies) {
            if (enemy instanceof ButterSoldier) {
                ctx.save();
                ctx.translate(enemy.x, enemy.y);

                if (enemy.flashTimer > 0) {
                    // 피격 당했을 때 하얗게 플래시 연출
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // 버터 기름방울 몸체 (노랗고 투명감 있는 물방울)
                    const dropGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, enemy.radius);
                    dropGrad.addColorStop(0, '#fff3a8');
                    dropGrad.addColorStop(0.7, '#ffca05');
                    dropGrad.addColorStop(1, '#d49e00');
                    
                    ctx.fillStyle = dropGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // 귀여운 은빛 병정 투구
                    ctx.fillStyle = '#a0a0b8';
                    ctx.beginPath();
                    ctx.arc(0, -5, enemy.radius * 0.8, Math.PI, 0); // 반원 투구
                    ctx.fill();

                    // 투구 깃털 (빨간 깃털 포인트)
                    ctx.fillStyle = '#e62117';
                    ctx.beginPath();
                    ctx.arc(0, -enemy.radius - 2, 4, 0, Math.PI * 2);
                    ctx.fill();

                    // 투구 선선
                    ctx.strokeStyle = '#686880';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(-enemy.radius * 0.8, -5);
                    ctx.lineTo(enemy.radius * 0.8, -5);
                    ctx.stroke();

                    // 띨빵하고 귀여운 눈동자 점 2개
                    ctx.fillStyle = '#3a2000';
                    ctx.beginPath();
                    ctx.arc(-5, 4, 2, 0, Math.PI * 2);
                    ctx.arc(5, 4, 2, 0, Math.PI * 2);
                    ctx.fill();

                    // 창(Weapon) 그리기 (기름병정 각도에 맞춰서)
                    ctx.rotate(enemy.angle);
                    ctx.strokeStyle = '#a0a0b8';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(enemy.radius - 4, 8);
                    ctx.lineTo(enemy.radius + 12, 8); // 창대
                    ctx.stroke();
                    
                    // 창 끝 날
                    ctx.fillStyle = '#d8d8e0';
                    ctx.beginPath();
                    ctx.moveTo(enemy.radius + 12, 5);
                    ctx.lineTo(enemy.radius + 18, 8);
                    ctx.lineTo(enemy.radius + 12, 11);
                    ctx.closePath();
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        // 6. 날아오는 노란 기름 투사체 (Projectiles) 그리기
        for (const proj of this.engine.projectiles) {
            if (proj.type === 'oil') {
                ctx.save();
                ctx.translate(proj.x, proj.y);
                
                // 동글동글 지글지글 끓는 식용유 탄환
                const oilGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, proj.radius);
                oilGrad.addColorStop(0, '#ffffff');
                oilGrad.addColorStop(0.5, '#ffa800');
                oilGrad.addColorStop(1, '#ff6c00');
                
                ctx.fillStyle = oilGrad;
                ctx.beginPath();
                ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
                ctx.fill();

                // 투사체 하이라이트 테두리
                ctx.strokeStyle = '#ffffff55';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.restore();
            }
        }

        // 7. 이펙트 그리기 (소금 뿌리기 / 아이스 쉴드 / 대시 연출)
        for (const eff of this.engine.effects) {
            const ratio = eff.duration / eff.maxDuration;
            
            if (eff.type === 'salt') {
                // 맛소금 뿌리기 퍼지는 링 효과
                ctx.strokeStyle = `rgba(255, 255, 255, ${ratio * 0.8})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, eff.radius * (1 - ratio), 0, Math.PI * 2);
                ctx.stroke();

                // 흩날리는 하얀 맛소금 알갱이들
                ctx.fillStyle = `rgba(255, 255, 255, ${ratio})`;
                const particleCount = 24;
                for (let i = 0; i < particleCount; i++) {
                    const angle = (i / particleCount) * Math.PI * 2 + ratio * 2;
                    const r = eff.radius * (1 - ratio * 0.8) * (0.8 + Math.random() * 0.3);
                    const px = eff.x + Math.cos(angle) * r;
                    const py = eff.y + Math.sin(angle) * r;
                    ctx.fillRect(px - 2, py - 2, 4, 4);
                }
            } 
            else if (eff.type === 'ice') {
                // 시원한 아이스 팩 회복 이펙트
                ctx.strokeStyle = `rgba(0, 210, 255, ${ratio * 0.6})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, eff.radius + (1 - ratio) * 15, 0, Math.PI * 2);
                ctx.stroke();

                // 십자형 쿨링 에너지 힐링 파티클
                ctx.fillStyle = `rgba(130, 240, 255, ${ratio})`;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - (1 - ratio) * 1.5;
                    const r = (eff.radius - 10) + (1 - ratio) * 20;
                    const px = eff.x + Math.cos(angle) * r;
                    const py = eff.y + Math.sin(angle) * r;
                    
                    // 더하기 기호(+) 모양 그리기
                    ctx.fillRect(px - 1, py - 4, 2, 8);
                    ctx.fillRect(px - 4, py - 1, 8, 2);
                }
            }
            else if (eff.type === 'dash') {
                // 대시 꼬리 잔상 효과
                ctx.fillStyle = `rgba(255, 203, 5, ${ratio * 0.25})`;
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, player.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 8. 플레이어: 귀여운 옥수수 캐릭터 렌더링
        if (!player.isDead) {
            let shouldDraw = true;
            // 피격 무적 상태일 때 반짝임 효과
            if (player.isInvincible && !player.isDashing) {
                // 0.08초 주기로 깜빡임
                shouldDraw = Math.floor(Date.now() / 80) % 2 === 0;
            }

            if (shouldDraw) {
                ctx.save();
                ctx.translate(player.x, player.y);

                // 대시 슬라이딩 중 회전 각도 연출
                if (player.isDashing) {
                    const dashAngle = Math.atan2(player.dashVy, player.dashVx);
                    ctx.rotate(dashAngle + Math.PI/2); // 대시 진행방향으로 꼬꾸라짐
                }

                // 아이스팩 방어 보호막 오우라
                if (player.defenseBuffTimer > 0) {
                    ctx.strokeStyle = 'rgba(0, 210, 255, 0.45)';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([5, 3]);
                    ctx.beginPath();
                    ctx.arc(0, 0, player.radius + 6, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // 캐릭터 몸체 색상 결정 (HP 열화 단계 비례)
                let colorBody, colorShadow, expressionType;
                if (player.heatState === 1) {
                    colorBody = '#ffcb05'; // 노랑
                    colorShadow = '#d49e00';
                    expressionType = 'HAPPY';
                } else if (player.heatState === 2) {
                    colorBody = '#ff7e00'; // 주황
                    colorShadow = '#cc5200';
                    expressionType = 'SWEATING';
                } else {
                    colorBody = '#e62117'; // 빨강
                    colorShadow = '#9e0d05';
                    expressionType = 'SCREAM';
                }

                // 동글둥글한 알맹이 하단 꼬리 포함 옥수수 씨앗 모양 그리기
                const pRad = player.radius;
                
                // 몸체 그림자
                ctx.fillStyle = colorShadow;
                ctx.beginPath();
                ctx.moveTo(0, -pRad);
                ctx.bezierCurveTo(pRad * 1.2, -pRad, pRad * 1.2, pRad * 0.7, 0, pRad + 3);
                ctx.bezierCurveTo(-pRad * 1.2, pRad * 0.7, -pRad * 1.2, -pRad, 0, -pRad);
                ctx.fill();

                // 몸체 앞면
                ctx.fillStyle = colorBody;
                ctx.beginPath();
                ctx.moveTo(0, -pRad);
                ctx.bezierCurveTo(pRad * 1.0, -pRad + 2, pRad * 1.0, pRad * 0.6, 0, pRad);
                ctx.bezierCurveTo(-pRad * 1.0, pRad * 0.6, -pRad * 1.0, -pRad + 2, 0, -pRad);
                ctx.fill();

                // 이마 하이라이트 반사광
                ctx.fillStyle = '#fffae0';
                ctx.beginPath();
                ctx.ellipse(-4, -6, 3, 5, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();

                // 표정 렌더링
                ctx.strokeStyle = '#3a1a00';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';

                if (expressionType === 'HAPPY') {
                    // 행복한 눈동자알 2개
                    ctx.fillStyle = '#3a1a00';
                    ctx.beginPath();
                    ctx.arc(-5, -2, 2.5, 0, Math.PI * 2);
                    ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
                    ctx.fill();

                    // 방글 방긋 웃는 입
                    ctx.beginPath();
                    ctx.arc(0, 2, 4, 0, Math.PI);
                    ctx.stroke();
                } 
                else if (expressionType === 'SWEATING') {
                    // 땀 흘리며 걱정하는 눈 (> < 느낌)
                    ctx.beginPath();
                    ctx.moveTo(-8, -4); ctx.lineTo(-4, -2); ctx.lineTo(-8, 0);
                    ctx.moveTo(8, -4); ctx.lineTo(4, -2); ctx.lineTo(8, 0);
                    ctx.stroke();

                    // 비뚤어진 당황한 입
                    ctx.beginPath();
                    ctx.moveTo(-4, 3);
                    ctx.quadraticCurveTo(0, 0, 4, 3);
                    ctx.stroke();

                    // 송골송골 파란 땀방울 맺힘
                    ctx.fillStyle = '#59d2ff';
                    ctx.beginPath();
                    ctx.moveTo(11, -7);
                    ctx.quadraticCurveTo(14, -5, 11, -1);
                    ctx.quadraticCurveTo(8, -5, 11, -7);
                    ctx.fill();
                } 
                else {
                    // 비명 지르는 눈(X X 모양)
                    ctx.beginPath();
                    ctx.moveTo(-7, -5); ctx.lineTo(-3, -1);
                    ctx.moveTo(-3, -5); ctx.lineTo(-7, -1);
                    ctx.moveTo(3, -5); ctx.lineTo(7, -1);
                    ctx.moveTo(7, -5); ctx.lineTo(3, -1);
                    ctx.stroke();

                    // 공포에 가득 찬 동그랗게 열린 입
                    ctx.fillStyle = '#9c0d05';
                    ctx.beginPath();
                    ctx.arc(0, 5, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    // 머리 위에 모락모락 피어오르는 흰색 연기 (열화 최고조)
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(-4, -pRad - 2);
                    ctx.quadraticCurveTo(-7, -pRad - 8, -4, -pRad - 14);
                    ctx.moveTo(4, -pRad - 2);
                    ctx.quadraticCurveTo(7, -pRad - 8, 4, -pRad - 14);
                    ctx.stroke();
                }

                ctx.restore();
            }
        } else {
            // 사망 상태: 하얗고 탐스러운 팝콘으로 변해 둥둥 떠있거나 퍼짐 연출
            ctx.save();
            ctx.translate(player.x, player.y);

            // 퐁신퐁신 팝콘 구름 그리기
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#d0d0d8';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(-10, -5, 12, 0, Math.PI * 2);
            ctx.arc(10, -5, 12, 0, Math.PI * 2);
            ctx.arc(0, 8, 14, 0, Math.PI * 2);
            ctx.arc(0, -10, 14, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 가운데 노란 껍질 파편 알맹이 흔적
            ctx.fillStyle = '#ffcb05';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            // 슬픈 동공 점 2개
            ctx.fillStyle = '#3a1a00';
            ctx.beginPath();
            ctx.arc(-4, 0, 1.5, 0, Math.PI * 2);
            ctx.arc(4, 0, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // 귀여운 천사 링 추가 (사망 연출 극대화)
            ctx.strokeStyle = '#ffe57f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, -26, 12, 3, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        ctx.restore(); // screenShake 복원

        // 9. 빈외곽 붉은 피격 빔 (Vignette Red Effect) - 체력이 40% 이하일 때 경고 연출
        if (player.hp <= player.maxHp * 0.4 && !player.isDead) {
            const hpRatio = player.hp / player.maxHp;
            const maxPulse = 0.35 * (1 - hpRatio); // 체력이 낮을수록 맥박 불빛이 강해짐
            const alpha = maxPulse * (0.6 + 0.4 * Math.sin(Date.now() / 150));
            
            const vignetteGrad = ctx.createRadialGradient(width/2, height/2, width/2.5, width/2, height/2, width/1.2);
            vignetteGrad.addColorStop(0, 'transparent');
            vignetteGrad.addColorStop(1, `rgba(230, 33, 23, ${alpha})`);
            
            ctx.fillStyle = vignetteGrad;
            ctx.fillRect(0, 0, width, height);
        }
    }
}

// 브라우저 전역 객체 바인딩
if (typeof window !== 'undefined') {
    window.CanvasRenderer = CanvasRenderer;
}
