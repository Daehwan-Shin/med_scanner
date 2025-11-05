// kpic-api.js (MFDS e약은요 OpenAPI 버전)
// 참고: http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList
// 필요한 Secret: MFDS_SERVICE_KEY (URL 인코딩 불필요, 코드에서 encodeURIComponent 처리)

const fetch = global.fetch || require("node-fetch");
const BASE = process.env.MFDS_EASYDRUG_URL || "http://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";
const KEY  = process.env.MFDS_SERVICE_KEY; // 필수

function buildUrl(params) {
  if (!KEY) throw new Error("MFDS_SERVICE_KEY is not set in environment (Replit Secrets).");
  const q = new URLSearchParams({
    serviceKey: KEY,           // 공공데이터포털 발급키
    type: "json",              // JSON 응답
    numOfRows: String(params.numOfRows ?? 15),
    pageNo: String(params.pageNo ?? 1),
    _ts: String(Date.now())    // 캐시 방지
  });
  if (params.itemName) q.set("itemName", params.itemName);
  if (params.itemSeq)  q.set("itemSeq", params.itemSeq);
  return `${BASE}?${q.toString()}`;
}

async function getJson(url) {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "kpic-replit-app/1.0",
      "Referer": "https://replit.com/"
    }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data;
}

// 공공데이터포털 표준 응답 파싱: response.body.items.item 배열
function extractItems(data) {
  const body = data?.body || data?.response?.body || data?.Response?.body;
  const items = body?.items || body?.Items || body?.item || body?.Items?.item;
  if (Array.isArray(items)) return items;
  const item = body?.items?.item || body?.Items?.Item || body?.item;
  if (Array.isArray(item)) return item;
  if (item) return [item];
  return [];
}

/**
 * 검색(의약품명) — e약은요 리스트 호출 + itemName 필터
 */
async function searchDrugsByName(drugname) {
  if (!drugname) throw new Error("drugname required");
  const url = buildUrl({ itemName: drugname, numOfRows: 20, pageNo: 1 });
  const data = await getJson(url);
  const items = extractItems(data);
  return items.map((it) => ({
    itemName: it.itemName || it.ITEM_NAME || it.prduct || "",
    itemSeq: it.itemSeq || it.ITEM_SEQ || it.item_code || "",
    entpName: it.entpName || it.ENTP_NAME || it.company || "",
    _raw: it
  }));
}

/**
 * 상세(의약품코드: itemSeq)
 */
async function getDrugDetailById(drugcode) {
  if (!drugcode) throw new Error("drugcode required");
  const url = buildUrl({ itemSeq: drugcode, numOfRows: 10, pageNo: 1 });
  const data = await getJson(url);
  const items = extractItems(data);
  const d = items[0] || {};
  return {
    itemName: d.itemName || d.ITEM_NAME,
    itemSeq: d.itemSeq || d.ITEM_SEQ || drugcode,
    entpName: d.entpName || d.ENTP_NAME,
    classNo: d.classNo || d.CLASS_NO,
    dosageForm: d.form || d.DOSAGE_FORM || d.drugShape || d.DRUG_SHAPE,
    efcyQesitm: d.efcyQesitm || d.EFCY_QESITM,
    useMethodQesitm: d.useMethodQesitm || d.USE_METHOD_QESITM,
    atpnQesitm: d.atpnQesitm || d.ATPN_QESITM,
    intrcQesitm: d.intrcQesitm || d.INTRC_QESITM,
    seQesitm: d.seQesitm || d.SE_QESITM,
    depositMethodQesitm: d.depositMethodQesitm || d.DEPOSIT_METHOD_QESITM,
    _raw: d
  };
}

module.exports = { searchDrugsByName, getDrugDetailById };
