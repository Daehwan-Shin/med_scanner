// kpic-api.js — e약은요 + 허가정보 + DUR(+MaxDose) 최종 통합본
// --------------------------------------------------------------

const fetch = global.fetch || require("node-fetch");

// ===== 공통 설정/유틸 =====
const KEY = process.env.MFDS_SERVICE_KEY;
const KEY_IS_ENCODED = (process.env.MFDS_KEY_IS_ENCODED || "0") === "1";

function ensureKey() {
  if (!KEY) throw new Error("MFDS_SERVICE_KEY is not set in environment (Secrets).");
}

function sanitizeBase(url) {
  if (!url) return url;
  let u = String(url).trim();
  if (u.endsWith("/")) u = u.slice(0, -1);
  return u;
}

function maskKey(k) {
  if (!k) return "";
  return k.length <= 8 ? "****" : k.slice(0, 4) + "…(masked)…" + k.slice(-4);
}

function buildUrl(base, params = {}) {
  ensureKey();
  const safeBase = sanitizeBase(base);
  const usp = new URLSearchParams({
    type: "json",
    numOfRows: String(params.numOfRows ?? 15),
    pageNo: String(params.pageNo ?? 1),
    _ts: String(Date.now()),
  });

  // 사용자 파라미터 주입
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (["numOfRows", "pageNo"].includes(k)) continue;
    usp.set(k, String(v));
  }

  // serviceKey
  let qs = usp.toString();
  if (KEY_IS_ENCODED) qs += `&serviceKey=${KEY}`;
  else { usp.set("serviceKey", KEY); qs = usp.toString(); }

  const full = `${safeBase}?${qs}`;
  console.log("[MFDS] URL =", full.replace(KEY, maskKey(KEY)));
  return full;
}

function parseJsonSafely(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function ensureOk(body) {
  const code = body?.header?.resultCode || body?.resultCode;
  const msg  = body?.header?.resultMsg  || body?.resultMsg;
  if (code && code !== "00") throw new Error(`MFDS error ${code}: ${msg || "Unknown"}`);
}

async function getJson(base, params) {
  const url = buildUrl(base, params);
  const resp = await fetch(url, { headers: { "User-Agent": "medapp/1.0" } });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${text.slice(0, 180)}`);
  const data = parseJsonSafely(text);
  if (!data) throw new Error(`Invalid JSON – ${text.slice(0, 180)}`);
  const body = data?.response || data;
  ensureOk(body);
  return body;
}

function extractItems(body) {
  const b = body?.body || body.response?.body || body;
  if (!b) return [];
  if (Array.isArray(b.items)) return b.items;
  if (Array.isArray(b.items?.item)) return b.items.item;
  if (b.items?.item) return [b.items.item];
  if (Array.isArray(b.item)) return b.item;
  if (b.item) return [b.item];
  return [];
}

// ===== e약은요 (스마트 재시도: 메서드/프로토콜/파라미터키) =====
const EASY_BASE_ENV =
  process.env.MFDS_EASYDRUG_URL ||
  "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugInfoList";

// e약은요: 루트/메서드/프로토콜 변형을 모두 커버 (항상 두 메서드를 시도)
// e약은요: 루트/메서드/프로토콜 변형을 모두 커버 (세 메서드 모두 시도)
function buildEasyCandidates(base) {
  const b = sanitizeBase(base || "");
  if (!b) return [];
  // 서비스 루트(메서드가 있든 없든 루트로 환원)
  const hasMethod = /\/get/i.test(b);
  const root = hasMethod ? b.slice(0, b.lastIndexOf("/")) : b;

  // ★ 메서드 후보 3종: List, InfoList, Info
  const withMethod = [
    `${root}/getDrbEasyDrugList`,
    `${root}/getDrbEasyDrugInfoList`,
    `${root}/getDrbEasyDrugInfo`,
  ];

  // http/https 모두 시도
  const bothProto = [];
  for (const url of withMethod) {
    if (url.startsWith("http://")) bothProto.push(url, "https://" + url.slice(7));
    else if (url.startsWith("https://")) bothProto.push(url, "http://" + url.slice(8));
    else bothProto.push("http://" + url, "https://" + url);
  }
  return [...new Set(bothProto.map(sanitizeBase))];
}

async function getJsonFromAnyEasy(base, params) {
  const candidates = buildEasyCandidates(base);
  let lastErr;
  for (const u of candidates) {
    try { return await getJson(u, params); }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All EASY endpoints failed");
}

async function searchDrugsByName(drugname) {
  if (!drugname) throw new Error("drugname required");
  const easyBase = EASY_BASE_ENV;

  const paramCandidates = [
    { itemName: drugname, numOfRows: 20, pageNo: 1, type: "json" },
    { item_name: drugname, numOfRows: 20, pageNo: 1, type: "json" }, // 스네이크 백업
  ];

  let lastErr;
  for (const p of paramCandidates) {
    try {
      const body = await getJsonFromAnyEasy(easyBase, p);
      const items = extractItems(body); // 빈 배열도 허용
      return (items || []).map((it) => ({
        itemName: it.itemName || it.ITEM_NAME || "",
        itemSeq : it.itemSeq  || it.ITEM_SEQ  || "",
        entpName: it.entpName || it.ENTP_NAME || "",
        _raw: it,
      }));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("EASY_SEARCH_FAILED");
}

async function getDrugDetailById(drugcode) {
  if (!drugcode) throw new Error("drugcode required");
  const easyBase = EASY_BASE_ENV;

  const paramCandidates = [
    { itemSeq: drugcode, numOfRows: 10, pageNo: 1, type: "json" },
    { item_seq: drugcode, numOfRows: 10, pageNo: 1, type: "json" }, // 스네이크 백업
  ];

  let lastErr;
  for (const p of paramCandidates) {
    try {
      const body = await getJsonFromAnyEasy(easyBase, p);
      const items = extractItems(body);
      const d = (items || [])[0];
      if (d) {
        return {
          itemName: d.itemName || d.ITEM_NAME,
          itemSeq : d.itemSeq  || d.ITEM_SEQ  || drugcode,
          entpName: d.entpName || d.ENTP_NAME,
          classNo : d.classNo  || d.CLASS_NO,
          dosageForm: d.form || d.DOSAGE_FORM || d.drugShape || d.DRUG_SHAPE,
          efcyQesitm         : d.efcyQesitm          || d.EFCY_QESITM,
          useMethodQesitm    : d.useMethodQesitm     || d.USE_METHOD_QESITM,
          atpnQesitm         : d.atpnQesitm          || d.ATPN_QESITM,
          intrcQesitm        : d.intrcQesitm         || d.INTRC_QESITM,
          seQesitm           : d.seQesitm            || d.SE_QESITM,
          depositMethodQesitm: d.depositMethodQesitm || d.DEPOSIT_METHOD_QESITM,
          _raw: d,
        };
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("EASY_DETAIL_FAILED");
}

// ===== 허가정보(전문/일반) 멀티 엔드포인트 =====
const PERMIT_URLS = (process.env.MFDS_PERMIT_URLS || process.env.MFDS_PERMIT_URL || "")
  .split(",")
  .map((s) => sanitizeBase(s))
  .filter(Boolean);

async function getJsonFromAny(bases, params) {
  if (!Array.isArray(bases) || bases.length === 0) {
    throw new Error("MFDS_PERMIT_URLS is not set (no permit endpoints configured)");
  }
  let lastErr;
  for (const base of bases) {
    try {
      const body = await getJson(base, params);
      return { base, body };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All permit endpoints failed");
}

// 검색(허가정보) — 멀티 파라미터 × 멀티 엔드포인트 + e약은요 폴백
async function searchRxByName(itemName, { spclty_pblc, numOfRows = 20, pageNo = 1 } = {}) {
  if (!PERMIT_URLS.length) throw new Error("MFDS_PERMIT_URLS is not set");
  if (!itemName) throw new Error("itemName required");

  const candidates = [
    { item_name: itemName },
    { itemName: itemName },
    { ITEM_NAME: itemName },
    { prduct_prmisn_no: itemName }, // 허가번호 직접 입력 대비
  ];
  const attachCommon = (obj) => ({ ...obj, ...(spclty_pblc ? { spclty_pblc } : {}), numOfRows, pageNo });

  let lastErr;
  for (const params of candidates) {
    try {
      const { base, body } = await getJsonFromAny(PERMIT_URLS, attachCommon(params));
      const items = extractItems(body);
      if (items && items.length) {
        return items.map((it) => ({
          itemName: it.item_name || it.ITEM_NAME || it.itemName || "",
          code:
            it.prdlst_Stdr_code || it.PRDLST_STDR_CODE ||
            it.item_seq || it.ITEM_SEQ ||
            it.prduct_prmisn_no || it.PRDCT_PRMISN_NO || "",
          entpName: it.entp_name || it.ENTP_NAME || it.entpName || "",
          spclty  : it.spclty_pblc || it.SPCLTY_PBLC || "",
          permitNo: it.prduct_prmisn_no || it.PRDCT_PRMISN_NO || "",
          _raw: it,
          _matchedBy: Object.keys(params)[0],
          _endpoint: base,
        }));
      }
    } catch (e) {
      lastErr = e;
    }
  }

  // e약은요 폴백
  try {
    const fallback = await searchDrugsByName(itemName);
    if (fallback?.length) {
      return fallback.map((it) => ({
        itemName: it.itemName,
        code    : it.itemSeq,
        entpName: it.entpName,
        spclty  : "일반의약품(e약은요)",
        permitNo: "",
        _raw: it,
        _source: "EASYDRUG_FALLBACK",
      }));
    }
  } catch (_) {}

  if (lastErr) throw lastErr;
  return [];
}

// 상세(허가정보) — 멀티 파라미터 × 멀티 엔드포인트
async function getPermitDetail(prdlst_Stdr_code_or_permitNo) {
  if (!PERMIT_URLS.length) throw new Error("MFDS_PERMIT_URLS is not set");
  const code = String(prdlst_Stdr_code_or_permitNo || "").trim();
  if (!code) throw new Error("prdlst_Stdr_code or permitNo required");

  const candidates = [
    { prdlst_Stdr_code: code },
    { prdlstStdrCode: code },
    { prdlst_stdr_code: code },
    { item_seq: code },
    { prduct_prmisn_no: code },
  ];

  for (const params of candidates) {
    try {
      const { base, body } = await getJsonFromAny(PERMIT_URLS, { ...params, numOfRows: 5, pageNo: 1 });
      const items = extractItems(body);
      if (items && items.length) {
        const d = items[0];
        const ingrRaw = d.item_ingr_name || d.ITEM_INGR_NAME || d.main_item_ingr || d.MAIN_ITEM_INGR || "";
        const ingredients = Array.isArray(ingrRaw)
          ? ingrRaw
          : String(ingrRaw || "").split(/[;,]/).map((s) => s.trim()).filter(Boolean);

        return {
          itemName   : d.item_name || d.ITEM_NAME || "",
          entpName   : d.entp_name || d.ENTP_NAME || "",
          spclty     : d.spclty_pblc || d.SPCLTY_PBLC || "",
          permitNo   : d.prduct_prmisn_no || d.PRDCT_PRMISN_NO || "",
          permitDate : d.prmisn_de || d.PRMISN_DE || d.permit_date || "",
          prdlstCode : d.prdlst_Stdr_code || d.PRDLST_STDR_CODE || code,
          dosageForm : d.drug_shape || d.DRUG_SHAPE || d.form || d.DOSAGE_FORM || "",
          appearance : d.form || d.DOSAGE_FORM || "",
          storage    : d.storage_method || d.STORAGE_METHOD || d.deposit_method || "",
          pack       : d.pack_unit || d.PACK_UNIT || d.pack || "",
          ingredients,
          _raw: d,
          _matchedBy: Object.keys(params)[0],
          _endpoint: base,
        };
      }
    } catch (e) {
      // 다음 후보 시도
    }
  }
  throw new Error("PERMIT_DETAIL_NOT_FOUND: tried multiple keys & endpoints");
}

// ===== DUR(품목정보) 스마트 재시도 =====
const DUR_URL = sanitizeBase(process.env.MFDS_DUR_URL || "");

// DUR 스마트 호출: 루트만 들어오면 메서드 자동 부착, http/https 교차 재시도
function buildDurCandidates(base) {
  const b = sanitizeBase(base || "");
  if (!b) return [];
  const isRoot = !/\/get/i.test(b);
  const withMethod = isRoot
    ? [`${b}/getDurPrdlstInfoList3`, `${b}/getDurPrdlstInfoList`]
    : [b];

  const bothProto = [];
  for (const url of withMethod) {
    if (url.startsWith("http://")) {
      bothProto.push(url, "https://" + url.slice(7));
    } else if (url.startsWith("https://")) {
      bothProto.push(url, "http://" + url.slice(8));
    } else {
      bothProto.push("http://" + url, "https://" + url);
    }
  }
  return [...new Set(bothProto.map(sanitizeBase))];
}

async function getJsonFromAnyDur(base, params) {
  const candidates = buildDurCandidates(base);
  let lastErr;
  for (const u of candidates) {
    try { return await getJson(u, params); }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All DUR endpoint candidates failed");
}

// DUR: 품목명 기반(DURPrdlstInfoService 계열) — itemName / itemSeq 둘 다 시도
async function getDurByProductName(itemName, itemSeq) {
  if (!DUR_URL || (!itemName && !itemSeq)) return [];
  const paramCandidates = [
    itemName ? { itemName } : null,   // 표준
    itemSeq  ? { itemSeq }  : null,   // 일부 셋에서 허용
  ].filter(Boolean);

  for (const p of paramCandidates) {
    try {
      const body = await getJsonFromAnyDur(DUR_URL, { ...p, numOfRows: 20, pageNo: 1, type: "json" });
      const items = extractItems(body) || [];
      if (items.length) {
        return items.map((it) => ({
          productName: it.itemName || it.ITEM_NAME || itemName,
          contraindication: it?.contraindication || it?.CONTRAINDICATION || it?.ban || "",
          precaution      : it?.precaution       || it?.PRECAUTION       || it?.caution || "",
          interaction     : it?.interaction      || it?.INTERACTION      || it?.relation || "",
          _raw: it,
        }));
      }
    } catch (_) { /* 다음 파라미터 후보로 */ }
  }
  return [];
}

// DUR: 성분명 기반 (다른 DUR 성분 서비스 URL을 연결할 때 사용)
async function getDurByIngredients(ingredients = []) {
  if (!DUR_URL || ingredients.length === 0) return [];
  const out = [];
  for (const name of ingredients) {
    const body = await getJsonFromAnyDur(DUR_URL, {
      item_ingr_name: name, // 성분 기반 서비스 키(데이터셋에 따라 조정)
      numOfRows: 20, pageNo: 1, type: "json",
    });
    const items = extractItems(body) || [];
    items.forEach((it) => {
      out.push({
        ingredient: name,
        contraindication: it?.contraindication || it?.CONTRAINDICATION || it?.ban || "",
        precaution      : it?.precaution       || it?.PRECAUTION       || it?.caution || "",
        interaction     : it?.interaction      || it?.INTERACTION      || it?.relation || "",
        _raw: it,
      });
    });
  }
  return out;
}

// ===== (옵션) 1일 최대투여량 =====
const MAXDOSE_URL = sanitizeBase(process.env.MFDS_MAXDOSE_URL || "");

async function getMaxDoseByIngredients(ingredients = []) {
  if (!MAXDOSE_URL || ingredients.length === 0) return [];
  const out = [];
  for (const name of ingredients) {
    const body = await getJson(MAXDOSE_URL, {
      item_ingr_name: name, numOfRows: 20, pageNo: 1, type: "json",
    });
    const items = extractItems(body);
    (items || []).forEach((it) => {
      out.push({
        ingredient: name,
        route     : it?.route || it?.ROUTE || it?.adminRoute || "",
        dosageForm: it?.dosageForm || it?.DOSAGE_FORM || "",
        maxDaily  : it?.max_daily_dose || it?.MAX_DAILY_DOSE || it?.maxDose || "",
        unit      : it?.unit || it?.UNIT || "",
        _raw: it,
      });
    });
  }
  return out;
}

// ===== 조합 상세: 허가정보 + DUR(+MaxDose) / e약은요 폴백 =====
async function getRxDetail(prdlst_Stdr_code) {
  try {
    const permit = await getPermitDetail(prdlst_Stdr_code);

    // DUR URL이 DURPrdlst(품목 DUR)이면 품목명/코드로, 아니면 성분 DUR로
    const useProductDur = (DUR_URL || "").toLowerCase().includes("durprdlst");
    const [dur, maxDose] = await Promise.all([
      useProductDur
        ? getDurByProductName(permit.itemName, permit.prdlstCode)
        : getDurByIngredients(permit.ingredients),
      getMaxDoseByIngredients(permit.ingredients),
    ]);

    return { source: "PERMIT", permit, dur, maxDose };
  } catch (e) {
    // 폴백: e약은요 상세
    try {
      const easy = await getDrugDetailById(prdlst_Stdr_code);
      return { source: "EASYDRUG_FALLBACK", easy };
    } catch (ee) {
      throw e;
    }
  }
}

module.exports = {
  // e약은요(OTC)
  searchDrugsByName,
  getDrugDetailById,
  // Rx(허가정보 + DUR)
  searchRxByName,
  getRxDetail,
};
