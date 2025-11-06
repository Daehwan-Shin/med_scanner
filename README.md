# KPIC MFDS Drug Finder

식품의약품안전처 공공데이터(OpenAPI) + **e약은요** 데이터를 이용해  
**약 이름 검색 → 목록 → 상세(효능·용법·주의·부작용) + 허가정보(전문/일반) + DUR** 를 제공하는 웹 앱입니다.

<p align="left">
  <img src="https://img.shields.io/badge/Node-18%2B-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-blue" />
</p>

---

## ✨ 기능

- **검색/목록**: 약 이름으로 검색 후 후보 리스트 표시
- **상세**: e약은요 상세(효능·용법·주의·상호작용·부작용·보관)
- **허가정보(Rx/일반)**: MFDS 허가정보로 전문/일반, 허가번호, 제형/포장 등 확인
- **DUR(품목)**: DUR 품목정보 서비스로 금기/주의/상호작용 요약
- **내성 강한 네트워킹**  
  - e약은요: `getDrbEasyDrugInfoList` / `getDrbEasyDrugInfo` / `getDrbEasyDrugList` 자동 재시도  
  - DUR: 루트/메서드 + http/https 자동 재시도, `itemName`/`itemSeq` 파라미터 후보 시도  
  - 허가정보: 멀티 엔드포인트 시도(콤마 구분)

---

## 🗂 폴더 구조

```
.
├── index.js          # Express API 서버
├── kpic-api.js       # MFDS/e약은요/DUR 호출 + 스마트 재시도 + 파싱/정규화
├── public/
│   ├── index.html    # 간단한 검색 UI
│   └── app.js       # 프론트엔드 API 연동
├── package.json
└── README.md
```

---

## 🚀 빠른 시작

```bash
# 1) 의존성
pnpm install        # 또는 npm i

# 2) 환경변수(.env 또는 Replit/GitHub Secrets)
# 아래 '환경변수' 섹션 참고

# 3) 실행
pnpm start          # 또는 npm run start
# => http://localhost:3000
```

---

## 🔐 환경변수

> 공공데이터포털에서 발급받은 **서비스키**가 필요합니다.  
> 포털에서 “인코딩된 키”를 사용하면 `MFDS_KEY_IS_ENCODED=1`, 일반키면 `0`.

| 키 | 설명 | 예시 |
|---|---|---|
| `MFDS_SERVICE_KEY` | (필수) 서비스키(원문) | `발급키` |
| `MFDS_KEY_IS_ENCODED` | 인코딩키=1, 일반키=0 | `1` |
| `MFDS_EASYDRUG_URL` | e약은요 루트 또는 메서드 URL | `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService` |
| `MFDS_PERMIT_URLS` | **허가정보 메서드 URL**(여러 개면 콤마로 구분) | `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07` |
| `MFDS_DUR_URL` | DUR 품목정보 루트 또는 메서드 URL | `http://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList3` |
| `MFDS_MAXDOSE_URL` | (선택) 1일 최대투여량 메서드 URL | `.../MaxDoseInfoService/getMaxDoseList` |
| `PORT` | 서버 포트 | `3000` |

`.env` 예시:

```env
MFDS_SERVICE_KEY=여기에_발급키_원문
MFDS_KEY_IS_ENCODED=1

MFDS_EASYDRUG_URL=https://apis.data.go.kr/1471000/DrbEasyDrugInfoService
MFDS_PERMIT_URLS=https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07
MFDS_DUR_URL=http://apis.data.go.kr/1471000/DURPrdlstInfoService03/getDurPrdlstInfoList3

PORT=3000
```

> 참고: 일부 환경에서 http/https 지원이 다를 수 있어 코드 측에서 자동으로 **프로토콜/메서드/파라미터 키**를 재시도합니다.

---

## 🔌 서버 API

### 헬스체크
```
GET /api/health
```

### e약은요 검색
```
GET /api/search?name={약이름}
```
- 응답: `{ count, results: [{ itemName, itemSeq, entpName, ... }] }`

### e약은요 상세
```
GET /api/detail/{itemSeq}
```
- 응답: `{ detail: { efcyQesitm, useMethodQesitm, atpnQesitm, intrcQesitm, seQesitm, ... } }`

### 허가정보(Rx/일반) 검색
```
GET /api/rx/search?name={제품명}&spclty_pblc={전문/일반(선택)}
```
- 응답: `[ { itemName, entpName, code, spclty, permitNo, ... } ]`

### 허가정보 + DUR 상세
```
GET /api/rx/detail/{prdlst_Stdr_code}
```
- 응답:  
  - 성공(허가정보): `{ source: "PERMIT", permit, dur, maxDose }`  
  - 폴백(e약은요): `{ source: "EASYDRUG_FALLBACK", easy }`

---

## 🖥 프런트 동작(요약)

- `public/index.html` + `public/app.js` (CSR)
- 검색 → `/api/search` → 결과 목록 렌더  
- 항목 클릭 → `/api/detail/:itemSeq` 또는 `/api/rx/detail/:code` → 상세 정보 표시  
- “바로 상세”가 아닌 **최종 선택 후 상세** UX

---

## 🧰 트러블슈팅

- **401 Unauthorized**  
  - 서비스키/인코딩 설정 확인 (`MFDS_KEY_IS_ENCODED=1`은 인코딩키 사용 시)
  - Secrets 수정 후 서버 재시작
- **404 api not found**  
  - 허가정보: **메서드 포함** URL인지 확인  
  - e약은요: `getDrbEasyDrugInfoList / getDrbEasyDrugInfo / getDrbEasyDrugList` 중 환경에서 열리는 메서드가 다를 수 있음(코드가 자동 재시도)
  - 프로토콜 문제 가능 → 코드가 http/https 모두 시도
- **500 unexpected errors**  
  - 게이트웨이 일시 오류 또는 파라미터 미지원 조합  
  - 콘솔의 `[MFDS] URL = ...`을 브라우저에서 직접 확인해보세요.

> 디버깅 시 콘솔의 `[MFDS] URL = ...` 한 줄(키는 마스킹됨)을 이슈에 첨부해주시면 빠르게 원인 파악이 가능합니다.

---

## 🤝 기여

PR/이슈 환영합니다.  
- 코드 스타일: 기본 Prettier/ESLint  
- 커밋 메시지: 기능 단위로 명확하게

---

## 📄 라이선스

- 코드: **MIT License**  
- 데이터: **식품의약품안전처/공공데이터포털 이용 약관**을 따릅니다.

---

## 📷 스크린샷(옵션)

> 저장소 `docs/` 아래에 캡처 이미지를 추가하세요.
>
> - `docs/search.png` (검색 결과)  
> - `docs/detail.png` (상세+허가정보+DUR)  

README에서 사용하려면:

```md
![Search](docs/search.png)
![Detail](docs/detail.png)
```

---

## 📩 문의

이슈 탭에 남겨주세요.  
- 사용 중인 **최종 요청 URL 로그**(마스킹된 상태)와 함께 주시면 가장 빠르게 도움 드릴 수 있습니다.
