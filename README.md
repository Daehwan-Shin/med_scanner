# replit-kpic-app — KPIC Drug Finder (MCP wrapper)

MCP 서버에서 사용하던 **KPIC 클라이언트 코드(dist/kpic-api.js)**를 이 리포의 `kpic-api.js`로 복사해, 웹 UI에서 **약 이름 검색 → 최상위 항목 상세 자동 표시**까지 바로 확인할 수 있습니다.

## 빠른 시작
```bash
npm i
npm start
# http://localhost:3000
```

> Replit에서는 **Import from GitHub → Run**만으로 동작합니다.

## 폴더 구조
```
index.js            # Express 서버(API + 정적 파일)
kpic-api.js         # MCP dist/kpic-api.js 복사 또는 동일 인터페이스 구현
public/
  ├── index.html    # 검색 UI
  ├── app.js        # 검색/상세 로직(최상위 자동 상세)
  └── styles.css
```

## kpic-api.js 교체
- MCP 리포의 `dist/kpic-api.js`를 그대로 복사해 오고, 아래 export를 보장하세요:
  ```js
  module.exports = { searchDrugsByName, getDrugDetailById };
  ```
- 또는 현재 파일에 실제 KPIC 엔드포인트를 기입해 동일 시그니처로 구현하세요.

## API 엔드포인트 (이 리포)
- `GET /api/search?name=아스피린` → `{ count, results: [...] }`
- `GET /api/detail/:drugcode` → `{ detail: { ... } }`

## 프론트 매핑 팁
- 결과 목록 키: `drugname|itemName|name`, `drugcode|itemSeq|code`, `entpName|company`
- 상세 키: `itemName|drugname|name`, `itemSeq|drugcode|code`, `entpName|company`, `classNo|classification`, `dosageForm|form`, `mainIngr|ingredient|components`, `additives|excipients`, `warnings|cautions`

## 건강한 에러 처리
- 빈 검색어는 400 응답(`name query is required`)
- KPIC 호출 실패 시 5xx + `{ error: SEARCH_FAILED|DETAIL_FAILED, message }`

## 라이선스
MIT
