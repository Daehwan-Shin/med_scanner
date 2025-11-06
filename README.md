KPIC MFDS Drug Finder (Replit)

식품의약품안전처 공공데이터(OpenAPI)와 e약은요 데이터를 활용해
약 이름 검색 → 목록 → 상세정보(효능·용법·주의·부작용) + 허가정보(전문·일반 포함) + DUR 정보를 제공하는 웹 앱입니다.

런타임: Node.js 18+ (Express)

프론트엔드: 정적 HTML/JS(CSR)

데이터 소스

e약은요: DrbEasyDrugInfoService

허가정보: DrugPrdtPrmsnInfoService07

DUR(품목정보): DURPrdlstInfoService03

네트워크 내성: 서비스/메서드/프로토콜/파라미터 스마트 재시도 내장
(예: getDrbEasyDrugInfoList/getDrbEasyDrugInfo/getDrbEasyDrugList, http/https, itemName/item_name 등)

1) 빠른 시작
pnpm install       # 또는 npm i
pnpm start         # 기본 포트 3000


서버가 켜지면:

[drug-finder-mfds] listening on http://0.0.0.0:3000


브라우저에서 열기: http://localhost:3000

2) 환경변수(Secrets) 설정

Replit “Secrets” 또는 .env에 아래 키를 설정하세요.

키	설명	예시
MFDS_SERVICE_KEY	공공데이터포털에서 발급 받은 서비스 키	발급키(원문)
MFDS_KEY_IS_ENCODED	발급키가 인코딩키이면 1, 일반키면 0	1
MFDS_EASYDRUG_URL	e약은요 서비스 루트 또는 메서드 URL	https://apis.data.go.kr/1471000/DrbEasyDrugInfoService
MFDS_PERMIT_URLS	허가정보 메서드 URL(여러 개면 ,로 구분)	https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07
MFDS_DUR_URL	DUR(품목정보) 루트 또는 메서드 URL	http://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList3
MFDS_MAXDOSE_URL	(옵션) 성분별 1일 최대투여량 API 메서드 URL	.../MaxDoseInfoService/getMaxDoseList
PORT	서버 포트	3000

TIP

e약은요/DUR는 환경에 따라 http/https 지원이 달라 자동 폴백이 들어있습니다.

e약은요는 getDrbEasyDrugInfoList/getDrbEasyDrugInfo/getDrbEasyDrugList를 모두 시도합니다.

허가정보는 반드시 메서드까지 포함한 URL을 넣으세요.

.env 예시:

MFDS_SERVICE_KEY=여기에_발급키_원문
MFDS_KEY_IS_ENCODED=1

MFDS_EASYDRUG_URL=https://apis.data.go.kr/1471000/DrbEasyDrugInfoService
MFDS_PERMIT_URLS=https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07
MFDS_DUR_URL=http://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList3

PORT=3000

3) API 엔드포인트
3.1 헬스체크
GET /api/health


응답: { ok: true, name: "replit-kpic-app (e약은요)" }

3.2 일반 검색 (e약은요)
GET /api/search?name={약이름}


예: /api/search?name=타이레놀

응답:

{
  "count": 2,
  "results": [
    {
      "itemName": "타이레놀정500mg",
      "itemSeq": "200700123",
      "entpName": "한국얀센(유)"
    }
  ]
}

3.3 일반 상세 (e약은요)
GET /api/detail/{itemSeq}


예: /api/detail/200700123

응답(요약):

{
  "detail": {
    "itemName": "타이레놀정500mg",
    "itemSeq": "200700123",
    "entpName": "한국얀센(유)",
    "efcyQesitm": "이 약은 ...",
    "useMethodQesitm": "...",
    "atpnQesitm": "...",
    "intrcQesitm": "...",
    "seQesitm": "...",
    "depositMethodQesitm": "..."
  }
}

3.4 전문/허가 검색 (Rx)
GET /api/rx/search?name={제품명}&spclty_pblc={전문/일반 필터}


spclty_pblc는 선택값 (예: 전문)

응답 항목:

itemName, entpName, code(품목일련코드/식별값), spclty, permitNo

_endpoint(성공한 허가정보 엔드포인트), _matchedBy(매칭 파라미터)

3.5 전문/허가 상세 + DUR
GET /api/rx/detail/{prdlst_Stdr_code}


응답:

{
  "source": "PERMIT",
  "permit": { /* 허가정보 정규화 필드들 */ },
  "dur": [ /* DUR 요약(품목명/품목코드 기반) */ ],
  "maxDose": [ /* (옵션) 성분별 1일 최대투여량 */ ]
}


허가정보 실패 시 자동으로 e약은요 상세 폴백:

{ "source": "EASYDRUG_FALLBACK", "easy": { /* e약은요 상세 */ } }

4) 프론트엔드 동작

/public/index.html에서 검색창 입력 → /api/search 호출 → 결과 리스트 렌더

리스트 항목 클릭 → /api/detail/{itemSeq} 또는 /api/rx/detail/{code} 호출

결과 패널에 효능·용법·주의·부작용(e약은요)와 허가정보 + DUR(있을 시)을 표시

“바로 상세”가 아닌 “검색 → 최종 항목 선택 → 상세” UX로 구현되어 있습니다.

5) 로그와 디버깅

서버 콘솔에 실제 호출 URL을 찍습니다(서비스키 마스킹):

[MFDS] URL = https://.../DrbEasyDrugInfoService/getDrbEasyDrugList?...&itemName=...


문제 발생 시, 이 로그 한 줄이면 원인 파악이 빠릅니다.

6) 자주 나오는 에러 & 해결
401 Unauthorized

MFDS_SERVICE_KEY가 잘못되었거나 인코딩 설정이 다름

포털에서 인코딩키를 썼다면 MFDS_KEY_IS_ENCODED=1

일반키면 0

Replit Secrets 저장 후 서버 재시작 필요

404 api not found

엔드포인트 루트만 넣고 메서드를 빼먹은 경우 (허가정보)

예: .../DrugPrdtPrmsnInfoService07 (❌)
→ .../DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07 (✅)

e약은요 메서드 명 변동: getDrbEasyDrugInfoList / getDrbEasyDrugInfo / getDrbEasyDrugList
→ 우리는 3종 모두 자동 재시도

http/https 정책 차이
→ 우리는 두 프로토콜 모두 자동 재시도

500 unexpected errors

게이트웨이 측 일시 오류 또는 파라미터 미지원 조합
→ 같은 엔드포인트에서 대체 파라미터 키(itemName↔item_name, itemSeq↔item_seq) 자동 재시도

여전히 실패 시, 콘솔의 [MFDS] URL = ...을 브라우저에 붙여 확인
→ 브라우저에서도 500이면 데이터포털 측 응답 이슈 (잠시 후 재시도)

7) 보안/운영 팁

서비스키는 절대 코드에 하드코딩하지 말고 환경변수로 주입

클라이언트에서 직접 공공API를 호출하지 말고, **서버(프록시)**를 통해 호출

과도한 호출 방지(디바운스/쓰로틀)와 캐시 적용 고려

응답 HTML이 포함될 수 있으므로 출력 시 이스케이프 처리 권장

8) 배포
Replit

이 저장소를 Import

“Secrets”에 환경변수 설정

Run 클릭

오른쪽 Webview에서 동작 확인

GitHub → Replit

GitHub에 푸시 후 Replit에서 “Import from GitHub”

Secrets 재설정 → Run

9) 폴더 구조(요약)
.
├── index.js          # Express 서버
├── kpic-api.js       # 공공API 호출/정규화/스마트 재시도 로직
├── package.json
├── public/
│   ├── index.html    # 검색 UI
│   └── app.js       # 프론트엔드 호출/렌더
└── README.md

10) 향후 확장 아이디어

품목 이미지(의약품 식별) 연결

ATC 코드/성분 라벨 추가

처방전/연령/체중 기반 용량 계산기(MaxDose API 연동 고도화)

결과 캐시/서버사이드 렌더링(SSR)

11) 라이선스

본 저장소의 애플리케이션 코드는 MIT 라이선스.
공공데이터 API의 사용 조건은 식품의약품안전처/공공데이터포털 약관을 따릅니다.
