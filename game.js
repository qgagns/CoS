
// --- [한국어 유니코드 기반 조사 자동 교정 엔진] ---
function hasBatchim(str) {
    // 특수문자나 괄호 뒤에 조사가 올 경우를 대비해 마지막 한글 음절 추출
    const hangulOnly = str.replace(/[^가-힣]/g, "");
    if (!hangulOnly) return false;
    const lastChar = hangulOnly[hangulOnly.length - 1];
    const code = lastChar.charCodeAt(0) - 0xAC00;
    return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function formatJosa(text) {
    if (!text) return "";
    return text
        .replace(/([^\s]+)이\(가\)/g, (_, w) => hasBatchim(w) ? `${w}이` : `${w}가`)
        .replace(/([^\s]+)은\(는\)/g, (_, w) => hasBatchim(w) ? `${w}은` : `${w}는`)
        .replace(/([^\s]+)을\(를\)/g, (_, w) => hasBatchim(w) ? `${w}을` : `${w}를`)
        .replace(/([^\s]+)과\(와\)/g, (_, w) => hasBatchim(w) ? `${w}과` : `${w}와`)
        .replace(/([^\s]+)이었\(였\)던/g, (_, w) => hasBatchim(w) ? `${w}이었던` : `${w}였던`)
        .replace(/([^\s]+)이었\(였\)다/g, (_, w) => hasBatchim(w) ? `${w}이었다` : `${w}였다`)
        .replace(/([^\s]+)이었\(였\)/g, (_, w) => hasBatchim(w) ? `${w}이었` : `${w}였`)
        .replace(/([^\s]+)으로\(로\)/g, (_, w) => {
            const hangulOnly = w.replace(/[^가-힣]/g, "");
            if (!hangulOnly) return `${w}로`;
            const code = hangulOnly[hangulOnly.length - 1].charCodeAt(0) - 0xAC00;
            const jong = code % 28;
            return (jong === 0 || jong === 8) ? `${w}로` : `${w}으로`; // ㄹ받침은 '로'
        });
}

// --- [진형(6슬롯 중 택5) 기반 파티 4대 총합 스탯 계산 (20점 만점 기준)] ---
// 0, 1: 후열(지성/행정 x1.5) | 2, 3: 중열(전략 x1.5) | 4, 5: 전열(무력 x1.5)
function calcPartyStats() {
    let party = { str: 0, war: 0, int: 0, adm: 0 };

    // 💡 1. 주인공 스탯을 기본 바탕으로 항상 100% 합산 (단서 수에 따라 20%~100% 개방)
    if (gameState.player && gameState.player.stats) {
        const clueBonus = gameState.unlockedClues.length * 0.2;
        const pRate = Math.min(1.0, 0.2 + clueBonus);
        const ps = gameState.player.stats;
        party.str += Math.round((ps.str || 10) * pRate);
        party.war += Math.round((ps.war || 10) * pRate);
        party.int += Math.round((ps.int || 10) * pRate);
        party.adm += Math.round((ps.adm || 10) * pRate);
    }

    // 💡 2. 진형 6칸에 배치된 '동료들'의 스탯 합산 (Stage 비율 x 진열 배율 1.5배)

    gameState.formation.forEach((char, idx) => {
        if (!char) return;
        const s = char.stats || { str: 10, war: 10, int: 10, adm: 10 };

        let stageRate = char.stage === 3 ? 0.9 : (char.stage === 2 ? 0.7 : 0.5);

        let strMul = (idx === 2 || idx === 3) ? 1.5 : 1.0;
        let warMul = (idx === 4 || idx === 5) ? 1.5 : 1.0;
        let intMul = (idx === 0 || idx === 1) ? 1.5 : 1.0;
        let admMul = (idx === 0 || idx === 1) ? 1.5 : 1.0;

        party.str += Math.round((s.str || 10) * stageRate * strMul);
        party.war += Math.round((s.war || 10) * stageRate * warMul);
        party.int += Math.round((s.int || 10) * stageRate * intMul);
        party.adm += Math.round((s.adm || 10) * stageRate * admMul);
    });

    return party;
}

// --- [1D100 주사위 판정 엔진] ---
function calcSuccessRate(partyStat, targetDiff) {
    // 기준 50% + (내 스탯 - 난이도) * 2% (최소 5% ~ 최대 95%)
    const rate = 50 + (partyStat - targetDiff) * 2;
    return Math.max(5, Math.min(95, rate));
}

function rollCheck(statName, partyStat, targetDiff) {
    const rate = calcSuccessRate(partyStat, targetDiff);
    const dice = Math.floor(Math.random() * 100) + 1; // 1 ~ 100

    const isCritSuccess = dice <= 5;
    const isCritFail = dice >= 96;
    const isSuccess = dice <= rate;

    return { dice, rate, isSuccess, isCritSuccess, isCritFail };
}

// --- [운명의 첫 동료 1인 무작위 추첨 헬퍼] ---
function pickDestinedCompanion() {
    const available = Object.values(COMPANIONS).filter(h => h.id !== gameState.secretHero.id);
    return available[Math.floor(Math.random() * available.length)];
}

// --- [이벤트별 맞춤 템플릿 기반 무작위 3인 영입 선택지 생성 엔진] ---
function buildRecruitChoices(eventObj) {
    const currentIds = gameState.formation.filter(c => c && !c.isPlayer).map(c => c.id);
    // 플레이어 본인 및 이미 보유한 동료를 제외한 인재 풀
    const available = Object.values(COMPANIONS).filter(h => 
        h.id !== gameState.secretHero.id && !currentIds.includes(h.id)
    );

    // 무작위 3명 추첨
    const candidates = available.sort(() => Math.random() - 0.5).slice(0, 3);
    const templates = eventObj.recruitTemplates || {};

    // 같은 스탯 내에서 템플릿 문장 중복 방지를 위한 사용 추적기
    const usedIndices = { war: 0, str: 0, int: 0, adm: 0 };

    return candidates.map(hero => {
        // 인물의 최고 스탯 판별 (war, str, int, adm)
        const topStat = Object.keys(hero.stats).reduce((a, b) => hero.stats[a] > hero.stats[b] ? a : b);
        
        // 단일 문자열이든 배열이든 모두 수용
        let templateList = templates[topStat] || [`[코드네임] 위기의 순간에 나타났다.`];
        if (!Array.isArray(templateList)) templateList = [templateList];

        // 아직 사용하지 않은 템플릿을 우선 선택
        const pickIdx = (usedIndices[topStat] || 0) % templateList.length;
        const template = templateList[pickIdx];
        usedIndices[topStat] = (usedIndices[topStat] || 0) + 1;

        // [코드네임] 대입 후 조사 자동 교정 (예: [악덕 고용주]이(가) ➡️ [악덕 고용주]가)
        const rawText = template.replace("[코드네임]", `[${hero.codeName}]`);
        const buttonText = formatJosa(rawText);

        return {
            text: buttonText,
            cost: 2,
            action: (state) => {
                const emptyIdx = state.formation.findIndex((c, i) => c === null && i !== 2);
                const assignIdx = emptyIdx !== -1 ? emptyIdx : 4;
                state.formation[assignIdx] = { ...hero, stage: 1 };
                appendLog(formatJosa(`🤝 <strong>[동료 영입]</strong>: [${hero.codeName}]이(가) 합류했습니다.`));
            },
            nextEvent: eventObj.recruitNextEvent || "route_choice"
        };
    });
}

// --- 플레이어 런타임 상태 ---
const gameState = {
    stability: 100, // 100%에서 시작해 0% 도달 시 세포 붕괴 사망
    gold: 50,
    turn: 1,
    secretHero: null,
    player: null,       // 주인공 객체 (진형 밖 상시 지휘관)
    roster: [],         // 영입된 동료 대기 명부
    activeClues: [],
    unlockedClues: [],
    historyLogs: [], // 지난 기록 보관소
    // 6칸 슬롯 [후열上, 후열下, 중열上, 중열下, 전열上, 전열下] (택 5)
    gameOverReason: "", // 게임오버 사유 보관
    pendingNotices: [], // 다음 페이지 상단에 출력할 시스템 알림 큐
    selectedSlot: null, // 모달에서 현재 선택된 슬롯 번호
    // 6칸 모두 동료 전용 자유 슬롯 (초기 공석)
    formation: [null, null, null, null, null, null]
};

// --- [HTML 태그 안전 타자기 효과 및 탭 즉시 스킵 엔진] ---
let isTyping = false;
let skipTypingFn = null;

function typeWriterHTML(targetEl, fullHTML, speed = 20, onComplete) {
    isTyping = true;
    let index = 0;
    let currentHTML = "";
    targetEl.innerHTML = '<span class="typing-cursor"></span>';

    function step() {
        if (!isTyping) return;

        if (index < fullHTML.length) {
            // HTML 태그 한 번에 건너뛰기 (<...>)
            if (fullHTML[index] === '<') {
                const tagEnd = fullHTML.indexOf('>', index);
                if (tagEnd !== -1) {
                    currentHTML += fullHTML.substring(index, tagEnd + 1);
                    index = tagEnd + 1;
                } else {
                    currentHTML += fullHTML[index++];
                }
            } else {
                currentHTML += fullHTML[index++];
            }

            targetEl.innerHTML = currentHTML + '<span class="typing-cursor"></span>';
            setTimeout(step, speed);
        } else {
            finish();
        }
    }

    function finish() {
        isTyping = false;
        targetEl.innerHTML = fullHTML; // 커서 제거 및 전체 완성
        skipTypingFn = null;
        if (onComplete) onComplete();
    }

    skipTypingFn = finish; // 화면 탭 시 호출할 스킵 함수
    step();
}

// --- [인물의 10개 단서 풀에서 5개를 무작위 선별] ---
function pickRunClues(hero) {
    if (!hero.clues || hero.clues.length === 0) {
        // 단서 데이터가 아직 작성되지 않은 인물을 위한 임시 대비책
        return Array.from({ length: 5 }, (_, i) => `알 수 없는 안개 속에서 흐릿한 심상 #${i + 1}이 떠오른다.`);
    }
    // 원본 순서를 유지하면서 무작위 5개 추출 (추상적 -> 구체적 흐름 보존)
    const indices = Array.from({ length: hero.clues.length }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .sort((a, b) => a - b);

    return indices.map(idx => hero.clues[idx]);
}

// --- [1. 모든 인재 대상 비밀 진명 선정 및 단서 생성기] ---
function getHeroClues(hero) {
    // 인물의 스탯과 특성을 분석해 3단계 단서를 즉석 생성
    const highestStat = Object.keys(hero.stats).reduce((a, b) => hero.stats[a] > hero.stats[b] ? a : b);
    
    let instinctClue = "";
    if (highestStat === "cmd") instinctClue = "지도를 보거나 전황을 살필 때, 대군을 통솔하는 직관적 혜안이 가슴속에서 솟구친다.";
    else if (highestStat === "com") instinctClue = "무기를 쥐었을 때 온몸의 근육이 급소를 찌르는 살벌한 투쟁 본능을 기억하고 있다.";
    else instinctClue = "장부와 물자를 계산할 때 모든 수치와 이치가 머릿속에 투명하게 꿰뚫어 보인다.";

    const traitClue = `환영 속에서 [${hero.codeName}]이라 불리며, "${hero.trait}"을(를) 행하던 기억의 잔상이 스친다.`;
    const finalClue = `데이터 칩 깊은 곳에서 [${hero.alias}]라는 가명과 함께, 잊혀진 영웅의 묵직한 진명이 맥박친다.`;

    return [instinctClue, traitClue, finalClue];
}

// 게임 시작
function initGame() {
    const allHeroes = Object.values(COMPANIONS);
    gameState.secretHero = allHeroes[Math.floor(Math.random() * allHeroes.length)];
    
    gameState.activeClues = pickRunClues(gameState.secretHero);
    gameState.unlockedClues = [];

    // 동료 풀에서 플레이어 본인 배제
    gameState.availableCompanions = allHeroes.filter(h => h.id !== gameState.secretHero.id);

    // 주인공 본체 설정 (진형 바깥에 상시 존재)
    gameState.player = {
        isPlayer: true,
        stage: 1,
        codeName: "나 (주인공)",
        stats: { ...gameState.secretHero.stats }
    };
}

// --- [타이틀 화면에서 게임 시작 버튼 클릭] ---
function startGame() {
    const titleEl = document.getElementById("title-screen");
    if (titleEl) {
        titleEl.classList.add("hidden");
    }
    loadEvent("jeju_prologue");
}

// 이벤트 화면 출력 함수
function loadEvent(eventId) {
    const ev = EVENTS[eventId];
    if (!ev) return;

    // 게임오버 이벤트 진입 시 안정도 0 강제 처리
    if (ev.isGameOver) {
        gameState.stability = 0;
    }

    const storyBox = document.getElementById("story-box");
    storyBox.innerHTML = ""; // 💡 화면 갱신: 이전 장면 텍스트를 비우고 새 페이지 시작

    // 💡 이전 액션에서 전달된 시스템 알림 배너(동료 영입 등)가 있다면 상단에 먼저 렌더링
    if (gameState.pendingNotices && gameState.pendingNotices.length > 0) {
        gameState.pendingNotices.forEach(msg => {
            const noticeEl = document.createElement("div");
            noticeEl.className = "system-notice";
            noticeEl.innerHTML = msg;
            storyBox.appendChild(noticeEl);
            gameState.historyLogs.push(msg);
        });
        gameState.pendingNotices = []; // 출력 후 비움
    }

    // 화면 터치 시 타이핑 즉시 스킵 리스너 바인딩
    storyBox.onclick = () => {
        if (isTyping && skipTypingFn) skipTypingFn();
    };

    // 💡 단서 해금 객체 준비 (상단이 아닌 본문 직후 출력을 위해 보관)
    let pendingClueCard = null;

    if (ev.clueTrigger !== undefined && !gameState.unlockedClues.includes(ev.clueTrigger)) {
        gameState.unlockedClues.push(ev.clueTrigger);
        const clueText = gameState.activeClues[ev.clueTrigger];

        pendingClueCard = document.createElement("div");
        pendingClueCard.className = "story-clue";
        pendingClueCard.style.animation = "fadeIn 0.5s ease-out";
        pendingClueCard.innerHTML = `💡 <strong>[기억의 파편 해금]</strong>: "${clueText}"`;
        gameState.historyLogs.push(`[기억 해금] ${clueText}`);
    }

    // 이벤트 본문 텍스트 산출 (문자열 또는 함수형 텍스트 지원)
    const eventText = typeof ev.text === "function" ? ev.text(gameState) : ev.text;

    // 본문 컨테이너 생성
    const textContainer = document.createElement("div");
    textContainer.className = "story-log";
    storyBox.appendChild(textContainer);
    gameState.historyLogs.push(eventText);

    // 본문 바로 밑에 붙을 새 인라인 선택지 그룹 생성
    const choiceGroup = document.createElement("div");
    choiceGroup.className = "inline-choice-group";
    choiceGroup.style.display = "none"; // 타이핑 중에는 숨김

    // ★ 최종장일 경우: 4지선다 진명 추리 버튼 자동 생성
    if (ev.isFinalDeduction) {
        const deductionChoices = generateFinalDeductionChoices();
        deductionChoices.forEach(ch => {
            const btn = document.createElement("button");
            btn.className = "btn-choice special";
            btn.innerHTML = ch.text;
            btn.onclick = ch.action;
            choiceGroup.appendChild(btn);
        });
        storyBox.appendChild(choiceGroup);
    } else if (ev.recruitTemplates) {
        // 💡 이벤트에 recruitTemplates가 정의되어 있으면 무작위 3인 선택지를 동적 조합
        const recruitChoices = buildRecruitChoices(ev);
        recruitChoices.forEach(ch => {
            const btn = document.createElement("button");
            btn.className = "btn-choice special";
            btn.innerHTML = ch.text;
            btn.onclick = (e) => {
                e.stopPropagation();
                gameState.turn += 1;
                gameState.stability = Math.max(0, gameState.stability - (ch.cost || 2));
                if (ch.action) ch.action(gameState);
                updateUI();
                loadEvent(ch.nextEvent);
            };
            choiceGroup.appendChild(btn);
        });
        storyBox.appendChild(choiceGroup);
    } else {
        // 일반 선택지 렌더링
        ev.choices.forEach(ch => {
            const btn = document.createElement("button");
            btn.className = "btn-choice";
            
            if (ch.check) {
                const partyStats = calcPartyStats();
                const statVal = partyStats[ch.check.stat] || 0;
                const rate = calcSuccessRate(statVal, ch.check.diff);
                btn.innerHTML = `${ch.text} <span style="color:${rate>=60?'#4ade80':'#f87171'}; font-weight:bold;">[성공률 ${rate}%]</span>`;
            } else {
                btn.innerHTML = ch.text;
            }

            btn.onclick = (e) => {
                e.stopPropagation(); // 스킵 클릭과 분리

                // 💡 게임오버 상태일 때는 안정도 차감 없이 액션(새로고침)만 즉시 실행
                if (ev.isGameOver) {
                    if (ch.action) ch.action(gameState);
                    return;
                }

                gameState.turn += 1;
                
                // 💡 명시된 cost(또는 구형 decay)가 있을 때만 안정도 소모 (기본값: 0)
                const cost = ch.cost !== undefined ? ch.cost : (ch.decay || 0);
                if (cost > 0) {
                    gameState.stability = Math.max(0, gameState.stability - cost);
                }

                // 안정도 0% 고갈 시 범용 게임오버로 즉시 전이
                if (gameState.stability <= 0) {
                    gameState.gameOverReason = "누적된 피로와 신체 손상으로 인해 생체 안정도가 0%에 도달하여 유전자 붕괴를 버티지 못했습니다.";
                    loadEvent("game_over");
                    return;
                }

                // 💡 선택지에 동료 영입 속성(recruit: "인물ID")이 있는 경우 자동 영입
                if (ch.recruit && COMPANIONS[ch.recruit]) {
                    const hero = COMPANIONS[ch.recruit];
                    const emptyIdx = gameState.formation.findIndex((c, i) => c === null && i !== 2);
                    const assignIdx = emptyIdx !== -1 ? emptyIdx : 4;
                    gameState.formation[assignIdx] = { ...hero, stage: 1 };
                    appendLog(`🤝 <strong>[동료 영입]</strong>: [${hero.codeName}]`);
                }
                // 스탯 판정 수행 분기
                if (ch.check) {
                    const partyStats = calcPartyStats();
                    const statVal = partyStats[ch.check.stat] || 0;
                    const res = rollCheck(ch.check.stat, statVal, ch.check.diff);

                    // 💡 강제 실패 이벤트인 경우 주사위 무조건 실패 처리
                    if (ch.check.forceFail) {
                        res.isSuccess = false;
                        res.isCritSuccess = false;
                    }

                    let logHtml = `🎲 <strong>[${ch.check.name || '능력치'} 판정]</strong> (파티 ${statVal} vs 난이도 ${ch.check.diff} ➡️ 성공률 ${res.rate}%)<br>`;
                    logHtml += `🎯 주사위: <strong>[ ${res.dice} ]</strong> ➡️ `;
                    logHtml += res.isCritSuccess ? `<span style="color:#f59e0b; font-weight:bold;">✨ 대성공!</span>` :
                               (res.isCritFail ? `<span style="color:#ef4444; font-weight:bold;">💥 대실패!</span>` :
                               (res.isSuccess ? `<span style="color:#4ade80; font-weight:bold;">✔ 성공!</span>` : `<span style="color:#ef4444; font-weight:bold;">✖ 실패...</span>`));
                    
                    gameState.historyLogs.push(logHtml);

                    if (res.isSuccess) {
                        if (ch.check.onSuccess) ch.check.onSuccess(gameState, res.isCritSuccess);
                        updateUI();
                        loadEvent(ch.check.successEvent || ch.nextEvent);
                    } else {
                        if (ch.check.onFail) ch.check.onFail(gameState, res.isCritFail);
                        updateUI();
                        loadEvent(ch.check.failEvent || ch.nextEvent);
                    }
                } else {
                    if (ch.action) ch.action(gameState);
                    updateUI();
                    if (ch.nextEvent) loadEvent(ch.nextEvent);
                }
            };
            choiceGroup.appendChild(btn);
        });
        storyBox.appendChild(choiceGroup);
    }

    updateUI();

    // 💡 타자기 실행: 타이핑이 끝나면 [본문] ➡️ [단서 카드] ➡️ [선택지 버튼] 순서로 노출
    typeWriterHTML(textContainer, eventText, 22, () => {
        if (pendingClueCard) {
            // 💡 핵심 교정: 선택지 그룹(choiceGroup) 바로 앞에 끼워 넣음!
            storyBox.insertBefore(pendingClueCard, choiceGroup);
        }
        choiceGroup.style.display = "flex";
        storyBox.scrollTo({ top: storyBox.scrollHeight, behavior: 'smooth' });
    });
}

// --- [지난 기록 모달 토글 함수] ---
function toggleHistoryModal(show) {
    const modal = document.getElementById("history-modal");
    const content = document.getElementById("history-content");
    if (!modal || !content) return;

    if (show) {
        content.innerHTML = gameState.historyLogs.map(log => `<div class="history-entry">${log}</div>`).join("");
        modal.classList.add("active");
    } else {
        modal.classList.remove("active");
    }
}

// 엔딩 및 게임오버 시 인라인 버튼 설정 함수
function setChoices(choices) {
    document.querySelectorAll(".inline-choice-group").forEach(el => el.remove());
    const storyBox = document.getElementById("story-box");
    const choiceGroup = document.createElement("div");
    choiceGroup.className = "inline-choice-group";

    choices.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "btn-choice special";
        btn.innerHTML = ch.text;
        btn.onclick = ch.action;
        choiceGroup.appendChild(btn);
    });

    storyBox.appendChild(choiceGroup);
    storyBox.scrollTo({ top: storyBox.scrollHeight, behavior: 'smooth' });
}

// --- [2. 최종장: 4지선다 진명 추리 선택지 생성 엔진] ---
function generateFinalDeductionChoices() {
    const correct = gameState.secretHero;
    const allOthers = Object.values(COMPANIONS).filter(h => h.id !== correct.id);

    // 오답 후보 3명 무작위 추첨
    const shuffledOthers = allOthers.sort(() => Math.random() - 0.5).slice(0, 3);
    
    // 정답 1명 + 오답 3명 결합 후 셔플
    const finalFour = [correct, ...shuffledOthers].sort(() => Math.random() - 0.5);

    return finalFour.map(hero => ({
        text: `👑 "나의 진명은 [ ${hero.trueName} ]이다!"`,
        action: () => checkIdentity(hero.trueName)
    }));
}

// 진명 정답 판정
function checkIdentity(selectedName) {
    if (selectedName === gameState.secretHero.trueName) {
        appendLog(`✨ <strong>[시스템 승인: 진명 각성 성공!]</strong>`, true);
        appendLog(`코어의 푸른 빛이 세포를 재구성하며 온전한 영웅의 힘이 깨어납니다.<br>
        <strong>"나는 [${gameState.secretHero.trueName}], 이 땅을 다시 하나로 묶을 자다!"</strong><br>
        신단수 통일 네트워크가 복구되며 한반도 전역에 평화가 찾아옵니다. [천하일통 엔딩]`);
        setChoices([{ text: "🎉 새로운 회차 시작하기 (새 영웅으로 환생)", action: () => location.reload() }]);
    } else {
        appendLog(`💥 <strong>[시스템 경고: 진명 불일치!]</strong>`);
        appendLog(`정체성 혼란으로 인해 신단수 코어가 거부 반응을 일으켰습니다!<br>
        (나의 진짜 정체는 <strong>[${gameState.secretHero.trueName}]</strong>이었습니다...)<br>
        생체 안정도가 급속도로 하락하였습니다. 코어의 데이터가 소실됩니다.`);
        gameState.stability = 0;
        updateUI();
        setChoices([{ text: "🔄 기억을 계승하여 다시 태어나기", action: () => location.reload() }]);
    }
}

function appendLog(htmlText, isClue = false) {
    const box = document.getElementById("story-box");
    const entry = document.createElement("div");
    entry.className = isClue ? "story-clue" : "story-log";
    entry.innerHTML = htmlText;
    box.appendChild(entry);
    box.scrollTop = box.scrollHeight;
}

function updateUI() {
    // 생체 안정도 UI 갱신 (수치에 따른 색상 동적 변화)
    const stab = gameState.stability;
    const stabText = document.getElementById("ui-stability");
    const stabBar = document.getElementById("bar-stability");
    stabText.innerText = `${stab}%`;
    stabBar.style.width = `${stab}%`;

    if (stab > 50) {
        stabBar.style.backgroundColor = "var(--accent-blue)";
    } else if (stab > 20) {
        stabBar.style.backgroundColor = "var(--accent-gold)";
    } else {
        stabBar.style.backgroundColor = "var(--accent-red)";
    }

    document.getElementById("ui-gold").innerText = gameState.gold;
    document.getElementById("ui-turn").innerText = gameState.turn;
    document.getElementById("ui-clue-count").innerText = `${gameState.unlockedClues.length} / 5개`;

    // 상단 4대 총합 스탯 갱신
    const partyStats = calcPartyStats();
    document.getElementById("stat-str").innerText = partyStats.str;
    document.getElementById("stat-war").innerText = partyStats.war;
    document.getElementById("stat-int").innerText = partyStats.int;
    document.getElementById("stat-adm").innerText = partyStats.adm;

    // 6개 슬롯 카드 UI 갱신
    for (let i = 0; i < 6; i++) {
        const char = gameState.formation[i];
        const cardEl = document.getElementById(`slot-${i}`);
        const nameEl = document.getElementById(`slot-name-${i}`);

        cardEl.className = "slot-card";
        if (char) {
            if (char.isPlayer) {
                cardEl.classList.add("is-player");
                nameEl.innerText = char.codeName;
            } else {
                cardEl.classList.add(`stage-${char.stage || 1}`);
                let displayName = (char.stage === 2) ? char.alias : (char.stage === 3 ? char.trueName : char.codeName);
                nameEl.innerText = displayName;
            }
        } else {
            nameEl.innerText = "(공석)";
        }
    }
}

// --- [부대 편성 모달 및 인터랙티브 터치 배치 엔진] ---
function toggleFormationModal(show) {
    const modal = document.getElementById("formation-modal");
    if (modal) {
        if (show) {
            gameState.selectedSlot = null;
            modal.classList.add("active");
            renderFormationModal();
        } else {
            modal.classList.remove("active");
        }
    }
}

function renderFormationModal() {
    // 💡 1. 모달 상단 주인공 현재 스탯 렌더링 (사령관 베이스)
    const playerBar = document.getElementById("modal-player-bar");
    if (gameState.player && gameState.player.stats) {
        const clueCount = gameState.unlockedClues.length;
        const pRate = Math.min(1.0, 0.2 + (clueCount * 0.2));
        const ps = gameState.player.stats;
        playerBar.innerHTML = `
            <span>👑 <strong>나의 각성도</strong> <span style="color:var(--accent-jade); font-weight:bold;">${Math.round(pRate * 100)}%</span></span>
            <span style="color:var(--text-main);">🚩 ${Math.round(ps.str * pRate)} &nbsp;⚔️ ${Math.round(ps.war * pRate)} &nbsp;🔧 ${Math.round(ps.int * pRate)} &nbsp;📜 ${Math.round(ps.adm * pRate)}</span>
        `;
    }
    // 6개 슬롯 카드에 클릭 리스너 연결 및 상태 렌더링
    for (let i = 0; i < 6; i++) {
        const cardEl = document.getElementById(`slot-${i}`);
        
        cardEl.classList.toggle("selected", gameState.selectedSlot === i);
        cardEl.onclick = () => {
            gameState.selectedSlot = (gameState.selectedSlot === i) ? null : i;
            renderFormationModal();
        };
    }

    // 💡 하단 동료 목록 상시 렌더링 (2행 카드형 + 실제 스탯 계산)
    const picker = document.getElementById("roster-picker");
    let html = "";

    if (gameState.selectedSlot !== null) {
        html += `<div style="font-size:0.7rem; color:var(--accent-jade); font-weight:bold; margin-bottom:2px;">
            👉 [${getSlotPosName(gameState.selectedSlot)}] 슬롯에 배치할 동료를 터치하세요:
        </div>`;
    } else {
        html += `<div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:4px;">
            📋 보유 동료 명부 (위 슬롯을 터치한 뒤 동료를 누르면 배치됩니다):
        </div>`;
    }

    if (gameState.roster.length === 0) {
        html += `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:10px;">아직 영입된 동료가 없습니다.</div>`;
    } else {
        gameState.roster.forEach(hero => {
            // 현재 이 동료가 어느 슬롯에 배치되어 있는지 확인
            const placedSlot = gameState.formation.findIndex(c => c && c.id === hero.id);
            const statusTag = placedSlot !== -1 ? `<span style="color:var(--text-muted);">(${getSlotPosName(placedSlot)} 배치중)</span>` : `<span style="color:var(--accent-green);">(대기중)</span>`;

            // 💡 현재 단계(Stage)가 반영된 실제 스탯 계산
            const stageRate = hero.stage === 3 ? 0.9 : (hero.stage === 2 ? 0.7 : 0.5);
            const curStr = Math.round(hero.stats.str * stageRate);
            const curWar = Math.round(hero.stats.war * stageRate);
            const curInt = Math.round(hero.stats.int * stageRate);
            const curAdm = Math.round(hero.stats.adm * stageRate);

            const isTarget = (placedSlot !== -1 && placedSlot === gameState.selectedSlot);

            html += `<div class="roster-card-btn ${isTarget ? 'active-slot' : ''}" onclick="onRosterCardClick('${hero.id}')">
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span>${hero.codeName}</span>
                    <span>${statusTag}</span>
                </div>
                <div style="display:flex; gap:10px; font-size:0.7rem; color:var(--text-muted);">
                    <span>🚩 전략 <strong style="color:#fff;">${curStr}</strong></span>
                    <span>⚔️ 무력 <strong style="color:#fff;">${curWar}</strong></span>
                    <span>🔧 지성 <strong style="color:#fff;">${curInt}</strong></span>
                    <span>📜 행정 <strong style="color:#fff;">${curAdm}</strong></span>
                </div>
            </div>`;
        });
    }

    if (gameState.selectedSlot !== null && gameState.formation[gameState.selectedSlot]) {
        html += `<button class="roster-card-btn" style="border-color:var(--accent-vermilion); color:var(--accent-vermilion); text-align:center; padding:5px; margin-top:2px;" onclick="unassignSlot(${gameState.selectedSlot})">
            ❌ 현재 슬롯 배치 해제
        </button>`;
    }

    picker.innerHTML = html;
}

function onRosterCardClick(heroId) {
    if (gameState.selectedSlot === null) {
        alert("먼저 위쪽 6개 슬롯 중 배치할 칸을 터치해 주세요.");
        return;
    }
    assignCompanion(heroId, gameState.selectedSlot);
}

function getSlotPosName(idx) {
    const names = ["후열上", "후열下", "중열上", "중열下", "전열上", "전열下"];
    return names[idx] || "슬롯";
}

function assignCompanion(heroId, targetSlot) {
    const hero = gameState.roster.find(h => h.id === heroId);
    if (!hero) return;

    // 만약 이미 다른 슬롯에 배치되어 있었다면 그 슬롯은 비움
    const prevSlot = gameState.formation.findIndex(c => c && c.id === hero.id);
    if (prevSlot !== -1) gameState.formation[prevSlot] = null;

    // 대상 슬롯에 배치
    gameState.formation[targetSlot] = { ...hero };
    updateUI();
    renderFormationModal();
}

function unassignSlot(targetSlot) {
    gameState.formation[targetSlot] = null;
    updateUI();
    renderFormationModal();
}

// 최초 실행
window.onload = initGame;