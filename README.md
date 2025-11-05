# e약은요 Drug Finder (MFDS OpenAPI)

식품의약품안전처 **e약은요(의약품개요정보)** OpenAPI를 사용하여
약 이름 검색 → **최상위 항목 자동 상세 표시**까지 제공하는 Replit용 앱입니다.

## 필요 환경변수 (Replit Secrets)
- `MFDS_SERVICE_KEY` : 공공데이터포털에서 발급받은 서비스키
- (선택) `MFDS_EASYDRUG_URL` : 기본값은 `http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList`

## 실행
```bash
npm i
npm start
# http://localhost:3000
```

## API 엔드포인트
- `GET /api/search?name=아스피린` → e약은요 리스트 호출(itemName), 결과 배열 반환
- `GET /api/detail/:itemSeq` → 같은 서비스에 `itemSeq`로 상세 정보 조회

## 프런트 표시 필드
- 결과 리스트: `itemName`, `itemSeq`, `entpName`
- 상세 패널: `itemName`, `itemSeq`, `entpName`, `classNo`, `dosageForm/drugShape`,
  `efcyQesitm(효능)`, `useMethodQesitm(용법)`, `atpnQesitm(주의)`, `intrcQesitm(상호작용)`, `seQesitm(부작용)`, `depositMethodQesitm(보관)`

## 주의
- 공공데이터 응답 스키마는 `response.body.items.item` 등으로 내려오며, 코드에서 안전하게 파싱하도록 작성되어 있습니다.
- 과호출 방지를 위해 프론트는 **디바운스(350ms)** 후 검색합니다.
