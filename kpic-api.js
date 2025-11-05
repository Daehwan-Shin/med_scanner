// kpic-api.js
// 실제 사용 시에는 MCP 프로젝트의 dist/kpic-api.js를 복사하여 아래 export와 동일하게 맞추세요.

const fetch = global.fetch || require("node-fetch");

/**
 * KPIC 검색 (의약품명)
 * @param {string} drugname
 * @returns {Promise<Array>} 표준화된 결과 배열
 */
async function searchDrugsByName(drugname) {
  if (!drugname) throw new Error("drugname required");

  // TODO: 실제 KPIC 검색 API 엔드포인트로 교체
  const base = process.env.KPIC_SEARCH_URL || "https://your-kpic-endpoint.example/search";
  const url = `${base}?drugname=${encodeURIComponent(drugname)}&ts=${Date.now()}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "kpic-replit-app/1.0",
      "Referer": "https://replit.com/",
    },
  });
  if (!resp.ok) throw new Error(`KPIC search failed: ${resp.status}`);
  const data = await resp.json();
  return Array.isArray(data?.results) ? data.results : [];
}

/**
 * KPIC 상세 (의약품코드)
 * @param {string} drugcode
 * @returns {Promise<Object>} 상세 객체
 */
async function getDrugDetailById(drugcode) {
  if (!drugcode) throw new Error("drugcode required");

  // TODO: 실제 KPIC 상세 API 엔드포인트로 교체
  const base = process.env.KPIC_DETAIL_URL || "https://your-kpic-endpoint.example/detail";
  const url = `${base}?drugcode=${encodeURIComponent(drugcode)}&ts=${Date.now()}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "kpic-replit-app/1.0",
      "Referer": "https://replit.com/",
    },
  });
  if (!resp.ok) throw new Error(`KPIC detail failed: ${resp.status}`);
  return await resp.json();
}

module.exports = { searchDrugsByName, getDrugDetailById };
