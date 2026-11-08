const EVENTS = {
    // 프롤로그 (제주 피난처)
    jeju_prologue: {
        text: `2060년, 제주도의 어느 따뜻한 봄.<br><br>
        바닷가에서 물질을 하다 불의의 사고를 당하신 어머니는 가쁜 숨을 몰아쉬며 십수 년간 숨겨왔던 비밀을 털어놓으셨다.<br><br>
        "아가, 너는 네 친딸이 아니란다. 너는... 누군가의 <strong>복제인간</strong>이란다..."`,
        choices: [
            { text: "\"......\"", nextEvent: "jeju_prologue_1_1" },
            { text: "\"어머니, 그게 무슨 말이에요...?! 그럴 리 없어...!!\"", nextEvent: "jeju_prologue_1_2" },
        ]
    },

    jeju_prologue_1_1: {
        text: `나는 아무 말도 하지 않았지만, 어머니의 말이 그저 헛된 거짓말이 아니라는 것을 어렴풋이 눈치채고 있었다.<br><br>
        조금만 무리해도 부서질 듯 떨려오는 연약한 몸도, 어쩌면 그 탓이었을지 모른다.<br><br>
        "북쪽으로... 백두산으로 가거라. 그곳 지하의 연구소에... 네 진짜 과거가 있단다."<br><br>
        내가 무어라 말할 겨를도 없이, 어머니의 야윈 손이 바닥으로 떨어졌다.`,
        choices: [
            { text: "눈물을 닦아내고, 어머니를 양지바른 곳에 묻어드린다.", cost: 5, nextEvent:"jeju_prologue_2_2"},
            { text: "어머니의 손을 잡은 채 하염없이 눈물을 흘린다.", cost: 5, nextEvent: "jeju_prologue_2_1" },
        ]
    },

    jeju_prologue_1_2: {
        text: `사실을 받아들이지 못한 나는 고개를 가로지으며 울부짖었다. <br><br>
        어머니의 간절한 마지막 한 마디는 울음소리에 묻혀 사라졌고, 나는 어머니를 잃었다는 상실을 견디지 못하고 무너져 내렸다.`,
        choices: [
            {
                text: "차가운 바닥에 웅크린 채 깊은 잠에 빠져든다...",
                action: (state) => {
                    state.gameOverReason = "가혹한 진실을 마주할 의지를 품지 못하고, 여정을 시작하기도 전에 스스로 무너져 내렸습니다.";
                },
                nextEvent: "game_over"
            }
        ]
    },

    jeju_prologue_2_1: {
        text: `나는 눈물을 멈추지 못한 채, 며칠을 울었다.<br><br>
        내 연약한 몸은 극도의 슬픔에 공명하듯, 조금씩 무너져 내렸다.<br><br>
        이대로 눈앞이 흐려질 때까지 있을까. 아니면...`,
        choices: [
            { text: "눈물을 닦아내고, 어머니를 양지바른 곳에 묻어드린다.", cost: 5, nextEvent:"jeju_prologue_2_2"},
            { text: "어머니의 손을 잡은 채 하염없이 눈물을 흘린다.", cost: 5, nextEvent: "jeju_prologue_2_1" },
        ]
    },

    jeju_prologue_2_2: {
        text: `어머니를 내가 아는 가장 따뜻하고 햇살이 잘 드는 곳에 묻어드렸다.<br><br>
        서툰 삽질에 온몸의 근육이 비명을 질렀다.<br><br>
        이제... 어떻게 해야할까?`,
        choices: [
            { text: "떠나자... 진짜 나를 찾아서.", cost: 5, nextEvent: "jeju_harbor" },
            { text: "어머니의 무덤 옆에 가만히 누워 눈을 감는다. 영원히.", cost: 100}
        ]
    },

    // 제주항 (단서 0 해금 & 첫 동료 조우)
    jeju_harbor: {
        text: `꼬박 하루를 걸어 녹슨 컨테이너가 뒹구는 제주항 부두에 도착했다.<br><br>
        마지막 남은 밀항선에 오르려던 순간, 몽둥이와 쇠파이프를 든 항만 약탈단 무리가 앞을 가로막는다!<br><br>
        "어이, 어린 계집애가 목걸이에 좋은 걸 차고 있잖아? 얌전히 넘기면 바다에 빠뜨리진 않으마!"<br><br>
        포위망이 좁혀온다. 어떻게든 이 위기를 벗어나야 해...!`,
        choices: [
            {
                text: "⚔️ 비명을 지르며 쇠파이프를 쥔 약탈자의 손목을 걷어찬다.",
                cost: 10, 
                check: {
                    stat: "war",
                    name: "무력",
                    diff: 40,
                    forceFail: true, // 💡 주인공의 병약함 체감: 무조건 실패
                    failEvent: "jeju_crisis"
                }
            },
            {
                text: "🚩 컨테이너 사이의 어두운 틈새로 전력을 다해 몸을 날린다.",
                cost: 10,
                check: {
                    stat: "str",
                    name: "전략",
                    diff: 40,
                    forceFail: true,
                    failEvent: "jeju_crisis"
                }
            },
            {
                text: "📜 주머니 속 남은 돈을 전부 꺼내며 애원해 본다.",
                cost: 10,
                check: {
                    stat: "adm",
                    name: "행정",
                    diff: 40,
                    forceFail: true,
                    failEvent: "jeju_crisis"
                }
            }
        ]
    },

    // 처절한 실패와 절망
    jeju_crisis: {
        text: `내 비루한 계책은 통하지 않았다.<br><br>
        나는 다리에 힘이 풀려 진흙탕 바닥으로 거칠게 나뒹굴었고, 약탈단 두목이 비열한 웃음을 터뜨리며 머리 위로 육중한 쇠파이프를 치켜들었다.<br><br>
        '...어머니, 죄송해요...'<br><br>
        죽음을 직감한 순간, 나는...`,
        choices: [
            {
                text: "질끈 눈을 감으며 닥쳐올 충격을 기다린다...",
                cost: 2,
                nextEvent: "jeju_rescue"
            }
        ]
    },

    // 운명의 1인 난입 (완전 랜덤 조우)
    jeju_rescue: {
        text: (state) => {
            // 💡 운명의 첫 동료 1인 무작위 추첨 및 임시 보관
            if (!state.tempCompanion) {
                state.tempCompanion = pickDestinedCompanion();
            }
            const hero = state.tempCompanion;
            const topStat = Object.keys(hero.stats).reduce((a, b) => hero.stats[a] > hero.stats[b] ? a : b);

            let actionDesc = "";
            if (topStat === "war") {
                actionDesc = `<strong>콰아아앙-!</strong><br><br>
                섬광과 함께 머리 위를 덮치던 쇠파이프가 두 동강 나며 튕겨 날아갔다!<br><br>
                비산하는 흙먼지 너머로, 압도적인 살기를 뿜어내는 자가 약탈자들을 단신으로 쓸어버리고 있었다.`;
            } else if (topStat === "str") {
                actionDesc = `<strong>펑-! 치이이익-!</strong><br><br>
                굉음과 함께 짙은 최루 연막과 조명탄이 터지며, 시야가 하얗게 물들었다.<br><br>
                그때, 갑자기 나타난 날렵한 그림자 하나가 나를 낚아채듯 감싸 안았다.`;
            } else if (topStat === "int") {
                actionDesc = `<strong>쿠구구궁- 쾅!</strong><br><br>
                항구 크레인의 고압 분전함이 폭발하며 거대한 화물 컨테이너가 약탈자들의 코앞으로 굉음을 내며 낙하했다.<br><br>
                아수라장이 된 전선 사이로, 공구와 단말기를 능숙하게 거두어 넣은 낯선 이가 먼지를 가르며 차분하게 걸어 나왔다.`;
            } else {
                actionDesc = `<strong>"자자, 다들 멈춰봐!"</strong><br><br>
                마법처럼 주변의 시선을 자신에게 집중시키는 목소리가 부두에 울려 퍼졌다.<br><br>
                어둠 속에서 모습을 드러낸 낯선 이는 묵직한 보급품 가방을 약탈자들의 앞에 던졌다.<br><br>
                "내가 저 소녀를 사지. 손해 볼 거 없는 거래잖아?"`;
            }
            return `${actionDesc}<br><br>
            내 앞에 우뚝 선 자는... <strong>[${hero.codeName}]</strong>이었다.<br><br>
            상황이 정리되고, 낯선 이가 차가운 바닥에 웅크린 내게 천천히 다가와 손을 내민다.<br><br>
            "일어나. 여기서 그대로 죽고 싶지 않으면."`;
        },
        choices: [
            {
                text: "떨리는 손으로 그 손을 맞잡고 일어선다.",
                nextEvent: "jeju_resonate"
            }
        ]
    },

    // 유전자 공명 & 첫 번째 기억 해금!
    jeju_resonate: {
        text: `그 사람의 손이 내 살갗에 닿는 찰나, 온몸의 솜털이 알 수 없는 감각으로 곤두섰고, 가슴속 목걸이가 고동을 치며 푸른빛으로 요동쳤다.<br><br>
        '단순한 인간이 아니야... 저 자도 <strong>나와 같은 존재</strong>야!'<br><br>
        그 터질 듯 떨려오는 울림 속에서, 흐릿했던 첫 번째 기억의 파편이 안개를 걷어내며 선명하게 떠올랐다.`,
        clueTrigger: 0, // 💡 첫 번째 기억(단서 #0) 극적 해금!
        choices: [
            {
                text: "요동치는 심장을 억누르며 낯선 이에게 말을 건다.",
                nextEvent: "jeju_dialogue"
            }
        ]
    },

    // 첫 동료와의 통성명 및 출항
    jeju_dialogue: {
        text: (state) => {
            const companion = state.formation[4] || state.tempCompanion;
            return `"당신도... 나와 같은 존재인가요?"<br><br>
            내 물음에, 그는 묵묵히 제 손을 내려다보다 나지막이 읊조렸다.<br><br>
            "몰라, 그런 거. 다만, 네 목걸이에서 풍기는 기운은... 낯설지 않아."<br><br>
            그가 부두 구석에 묶여 있던 낡은 철제 밀항선의 시동을 걸었다. 털털거리는 디젤 엔진 굉음이 안개 낀 해안가에 울려 퍼진다.<br><br>
            "뭍으로 향할 생각이라면, 타. 마침 나도 이 지긋지긋한 섬을 떠날 생각이었으니까."`;
        },
        choices: [
            {
                text: "그를 따라 밀항선 갑판에 올라선다.",
                action: (state) => {
                    // 💡 동료 대기 명부(roster)에 정식 영입 등록
                    state.roster.push({ ...state.tempCompanion, stage: 1 });
                    state.pendingNotices.push(formatJosa(`🤝 <strong>[운명의 조우]</strong>: [${state.tempCompanion.codeName}]이(가) 합류했습니다! '진형 편성'에서 원하는 위치에 배치하세요.`));
                },         
                nextEvent: "sea_voyage",
            },
            {
                text: "오늘 처음 본 낯선 사람과 함께할 수는 없다.",
                action: (state) => {
                    state.gameOverReason = "잘못된 선택으로 당신을 구해준 운명의 동료를 거부했습니다. 혼자서 살아남을 수 없다는 것을 깨닫지 못한 채, 당신은 바다 위에서 끝내 고립되었습니다.";
                },
                nextEvent: "game_over",
                
            }
        ]
    },
    // 잿빛 바다와 변종 괴수의 습격
    sea_voyage: {
        text: `2060년의 제주 북쪽 바다는 푸르지 않았다. 3차 세계대전 당시 침몰한 군함들의 녹물과 방사능 낙진이 뒤섞여, 파도는 끈적한 검붉은 잿빛을 띠고 있었다.<br><br>
        선체가 거칠게 요동치더니, 갑자기 스크루 부근에서 <strong>끼기긱-!</strong> 하는 불길한 쇳소리와 함께 엔진이 멎어버렸다.<br><br>
        수면 아래에서 거대한 그림자가 소용돌이치더니, 방사선에 기형적으로 뒤틀린 <strong>변종 갑각 괴수</strong>가 시퍼런 점액질을 흘리며 선체를 향해 솟구쳐 올랐다.`,
        choices: [
            {
                text: "동료와 함께 무기를 쥐고 맞설 준비를 한다!",
                nextEvent: "sea_encounter"
            }
        ]
    },

    // 8. 해상 결전: 첫 번째 파티 협동 스탯 판정
    sea_encounter: {
        text: `집채만 한 괴수가 흉측한 가시 집게발을 치켜들고 선교를 부수려 덮쳐온다.<br><br>
        선체가 뒤집히기 전에 놈을 격퇴하거나 따돌려야 한다.`,
        choices: [
            {
                text: "⚔️ [무력] 뱃머리로 몸을 던져 쇠작살을 놈의 안구에 박아 넣는다!",
                check: {
                    stat: "war",
                    name: "무력",
                    diff: 10, // 첫 협동 실전 난이도
                    onSuccess: (state, isCrit) => {
                        appendLog("작살이 괴수의 뇌수를 꿰뚫었습니다! 단말마의 비명과 함께 괴수가 바닷속으로 침몰합니다.");
                        if (isCrit) {
                            state.gold += 20;
                            appendLog("괴수의 등껍질에서 쓸만한 특수 광물 조각을 노획했습니다! (자금 +20원)");
                        }
                    },
                    onFail: (state) => {
                        appendLog("괴수의 거대한 집게발에 갑판이 박살 나며 파편에 부상을 입었습니다! (생체 안정도 -20%)");
                        state.stability = Math.max(0, state.stability - 10);
                    },
                    cost: 10,
                    successEvent: "mokpo_arrival",
                    failEvent: "mokpo_arrival"
                }
            },
            {
                text: "🚩 [전략] 키를 꺾어 암초 지대의 좁은 해류로 괴수를 유인한다!",
                check: {
                    stat: "str",
                    name: "전략",
                    diff: 10,
                    onSuccess: (state) => appendLog("급선회한 밀항선을 쫓던 괴수가 날카로운 암초에 몸통이 꿰뚫려 비명을 지릅니다! 안전하게 해역을 벗어납니다."),
                    onFail: (state) => {
                        appendLog("암초를 스치며 선체 바닥이 찢겼습니다! 침수를 막느라 체력이 소모되었습니다. (생체 안정도 -20%)");
                        state.stability = Math.max(0, state.stability - 10);
                    },
                    cost: 10,
                    successEvent: "mokpo_arrival",
                    failEvent: "mokpo_arrival"
                }
            },
            {
                text: "🔧 [지성] 디젤 연료 밸브를 개방하고 해면에 불을 질러 화염벽을 친다!",
                check: {
                    stat: "int",
                    name: "지성",
                    diff: 10,
                    onSuccess: (state) => appendLog("순식간에 번져나간 해상의 거대한 불길에 기겁한 괴수가 깊은 바닷속으로 도망칩니다!"),
                    onFail: (state) => {
                        appendLog("역풍을 타고 번진 그을음과 열기로 선원실이 손상되었습니다. (생체 안정도 -20%)");
                        state.stability = Math.max(0, state.stability - 10);
                    },
                    cost: 10,
                    successEvent: "mokpo_arrival",
                    failEvent: "mokpo_arrival"
                }
            }
        ]
    },

    // 9. Zone 1 관문: 목포 신항만 상륙
    mokpo_arrival: {
        text: `격렬했던 사투 끝에 마침내 괴수의 추격을 떨쳐냈다.<br><br>
        얼마나 달렸을까, 자욱한 잿빛 해무 너머로 녹슨 거대 골리앗 크레인들과 좌초된 컨테이너선들의 거대한 실루엣이 드러났다.<br><br>
        <strong>한반도 남부의 관문, 목포.</strong><br><br>
        닻을 내리고 부서진 콘크리트 부두에 발을 딛는 순간, 차갑고 묵직한 본토의 흙냄새가 코끝을 스쳤다.`,
        choices: [
            {
                text: "부두의 녹슨 차단벽을 넘어, 호남선 내륙으로 진입한다.",
                cost: 0,
                nextEvent: "route_choice"
            }
        ]
    },

    // 10. 최종장: 백두산 신단수 코어 (5개 단서 종합 진명 선언)
    baekdu_sanctuary: {
        text: `마침내 백두산 천지 지하 깊은 곳, 슈퍼컴퓨터 <strong>&lt;신단수&gt;의 마더 코어</strong>에 도달했다!<br>
        거대한 홀로그램 나무가 푸른빛을 뿜어내며 기계음이 성소 전체에 장엄하게 울려 퍼진다.<br><br>
        <em>"미확인 레플리카 접근... 시스템 통제권을 이양받으려면 너의 의식 속에 복원된 5개의 기억을 증명하라. <strong>너의 진명을 선언하라!</strong>"</em>`,
        isFinalDeduction: true
    },

    // 11. 범용 게임오버 이벤트
    game_over: {
        isGameOver: true,
        text: (state) => {
            const reason = state.gameOverReason || "잘못된 선택으로 불안정한 신체가 한계에 도달했습니다.";
            return `<div style="border-left: 3px solid var(--accent-vermilion); padding-left: 10px;">
                <span style="color:var(--accent-vermilion); font-weight:bold; font-size:0.8rem; letter-spacing:1px;">[여정 중단: 생체 신호 소멸]</span><br><br>
                ${reason}<br><br>
                <em>차가운 침묵이 덮쳐오며, 이번 생의 기억이 어둠 속으로 흩어집니다...</em>
            </div>`;
        },
        choices: [
            {
                text: "🔄 타이틀로 돌아가기",
                action: () => location.reload()
            }
        ]
    }
};