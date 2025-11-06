const $ = (sel) => document.querySelector(sel);
const resultsEl = $("#results");
const detailEl = $("#detail");
const qEl = $("#q");
const btnSearch = $("#btnSearch");

const escapeHTML = (s) => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

let results = [];
let activeIndex = -1;

function apiBase() {
  const mode = document.querySelector('input[name="mode"]:checked')?.value || "rx";
  return mode === "otc" ? "/api" : "/api/rx";
}

async function runSearch() {
  const q = qEl.value.trim();
  results = [];
  activeIndex = -1;

  if (!q) {
    resultsEl.innerHTML = "";
    detailEl.innerHTML = `<div class="card muted">검색어를 입력하세요.</div>`;
    return;
  }

  detailEl.innerHTML = `
    <div class="card muted">
      <strong>검색어:</strong> ${escapeHTML(q)}
      <div style="margin-top:6px;">결과에서 항목을 클릭하면 상세가 표시됩니다.</div>
    </div>
  `;

  try {
    const base = apiBase();
    const url = base === "/api" ? `/api/search?name=${encodeURIComponent(q)}` 
                                : `/api/rx/search?name=${encodeURIComponent(q)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    results = Array.isArray(data?.results) ? data.results : [];
    renderResults(results);
  } catch (e) {
    resultsEl.innerHTML = "";
    detailEl.innerHTML = `<div class="card error">검색 실패: ${escapeHTML(e.message || String(e))}</div>`;
  }
}

function renderResults(items) {
  resultsEl.innerHTML = (items || []).map((it, idx) => {
    const name = it?.itemName || "이름 없음";
    const code = it?.itemSeq || it?.drugcode || it?.code || "";  // OTC/허가정보 겸용
    const etc = it?.entpName || "";
    const label = it?.spclty ? ` • ${escapeHTML(it.spclty)}` : (it?._source === "EASYDRUG_FALLBACK" ? " • e약은요" : "");
    return `
      <button class="list-item" data-index="${idx}" data-code="${escapeHTML(code)}" role="option" aria-selected="false" title="${escapeHTML(name)}">
        <div class="title">${escapeHTML(name)}</div>
        <div class="sub">${escapeHTML(code)}${etc ? " • " + escapeHTML(etc) : ""}${label}</div>
      </button>`;
  }).join("");

  resultsEl.querySelectorAll(".list-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.index);
      const item = results[idx];
      const code = item?.itemSeq || item?.code || "";
      if (!code) return;
      activeIndex = idx;
      highlightActive();
      const base = apiBase();

      if (base === "/api") {
        await loadDetailEasydrug(code);
      } else {
        // rx 모드: 허가정보 우선, 실패 시 서버 폴백(e약은요)이 자동 동작
        await loadDetailRx(code);
      }
    });
  });
}

function highlightActive() {
  resultsEl.querySelectorAll(".list-item").forEach((btn, i) => {
    if (i === activeIndex) {
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      btn.scrollIntoView({ block: "nearest" });
    } else {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    }
  });
}

async function loadDetailEasydrug(code) {
  detailEl.innerHTML = `<div class="card muted">상세 불러오는 중...</div>`;
  try {
    const r = await fetch(`/api/detail/${encodeURIComponent(code)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    renderDetailEasydrug(data?.detail || {});
  } catch (e) {
    detailEl.innerHTML = `<div class="card error">상세 조회 실패: ${escapeHTML(e.message || String(e))}</div>`;
  }
}

async function loadDetailRx(code) {
  detailEl.innerHTML = `<div class="card muted">상세 불러오는 중...</div>`;
  try {
    const r = await fetch(`/api/rx/detail/${encodeURIComponent(code)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const d = data?.detail || {};
    if (d.source === "EASYDRUG_FALLBACK" && d.easy) {
      renderDetailEasydrug(d.easy);
    } else if (d.source === "PERMIT" && d.permit) {
      renderDetailPermitCombo(d); // 허가정보 + DUR + 최대용량
    } else {
      throw new Error("Empty detail");
    }
  } catch (e) {
    detailEl.innerHTML = `<div class="card error">상세 조회 실패: ${escapeHTML(e.message || String(e))}</div>`;
  }
}

// --- 렌더러들 ---
function renderDetailEasydrug(d) {
  const e = escapeHTML;
  const name = d.itemName || "이름 없음";
  const code = d.itemSeq || "-";
  const comp = d.entpName || "-";
  const classNo = d.classNo || "-";
  const form = d.dosageForm || d.drugShape || "-";
  const efcy = d.efcyQesitm || "-";
  const useMethod = d.useMethodQesitm || "-";
  const atpn = d.atpnQesitm || "-";
  const intrc = d.intrcQesitm || "-";
  const se = d.seQesitm || "-";
  const deposit = d.depositMethodQesitm || "-";

  detailEl.innerHTML = `
    <div class="card">
      <div class="kv">
        <div><span>품목명</span><strong>${e(name)}</strong></div>
        <div><span>코드</span><code>${e(code)}</code></div>
        <div><span>업체명</span>${e(comp)}</div>
        <div><span>분류</span>${e(classNo)}</div>
        <div><span>제형/외형</span>${e(form)}</div>
      </div>
      <hr/>
      <h3>효능·효과</h3><pre class="scroll">${e(String(efcy))}</pre>
      <h3>용법·용량</h3><pre class="scroll">${e(String(useMethod))}</pre>
      <h3>주의사항</h3><pre class="scroll">${e(String(atpn))}</pre>
      <h3>상호작용</h3><pre class="scroll">${e(String(intrc))}</pre>
      <h3>부작용</h3><pre class="scroll">${e(String(se))}</pre>
      <h3>보관방법</h3><pre class="scroll">${e(String(deposit))}</pre>
    </div>`;
}

function renderDetailPermitCombo(d) {
  const e = escapeHTML;
  const p = d.permit || {};
  const name = p.itemName || "-";
  const comp = p.entpName || "-";
  const sp = p.spclty || "-";
  const permitNo = p.permitNo || "-";
  const permitDate = p.permitDate || "-";
  const prdlst = p.prdlstCode || "-";
  const form = p.dosageForm || p.appearance || "-";
  const storage = p.storage || "-";
  const pack = p.pack || "-";
  const ingredients = Array.isArray(p.ingredients) ? p.ingredients.join(", ") : (p.ingredients || "-");

  const dur = Array.isArray(d.dur) ? d.dur : [];
  const maxDose = Array.isArray(d.maxDose) ? d.maxDose : [];

  detailEl.innerHTML = `
    <div class="card">
      <div class="kv">
        <div><span>품목명</span><strong>${e(name)}</strong></div>
        <div><span>전문/일반</span>${e(sp)}</div>
        <div><span>업체명</span>${e(comp)}</div>
        <div><span>허가번호</span>${e(permitNo)}</div>
        <div><span>허가일</span>${e(permitDate)}</div>
        <div><span>품목일련</span><code>${e(prdlst)}</code></div>
        <div><span>제형/성상</span>${e(form)}</div>
        <div><span>저장/포장</span>${e(storage)} / ${e(pack)}</div>
        <div><span>주성분</span>${e(ingredients)}</div>
      </div>
      <hr/>
      <h3>안전사용(DUR)</h3>
      ${dur.length ? dur.map(x => `
        <div class="kv">
          <div><span>성분</span>${e(x.ingredient || "-")}</div>
          <div><span>금기</span>${e(String(x.contraindication || "-"))}</div>
          <div><span>주의</span>${e(String(x.precaution || "-"))}</div>
          <div><span>상호작용</span>${e(String(x.interaction || "-"))}</div>
        </div>
      `).join("") : `<div class="card muted">DUR 정보 없음</div>`}
      <h3>1일 최대투여량</h3>
      ${maxDose.length ? maxDose.map(m => `
        <div class="kv">
          <div><span>성분</span>${e(m.ingredient || "-")}</div>
          <div><span>경로</span>${e(m.route || "-")}</div>
          <div><span>제형</span>${e(m.dosageForm || "-")}</div>
          <div><span>최대/단위</span>${e(m.maxDaily || "-")} ${e(m.unit || "")}</div>
        </div>
      `).join("") : `<div class="card muted">최대투여량 정보 없음</div>`}
    </div>`;
}

// 이벤트
btnSearch.addEventListener("click", runSearch);
qEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); runSearch(); return; }
  if (!results?.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = Math.min(results.length - 1, activeIndex < 0 ? 0 : activeIndex + 1); highlightActive(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); activeIndex = Math.max(0, activeIndex < 0 ? 0 : activeIndex - 1); highlightActive(); }
});

detailEl.innerHTML = `<div class="card muted">검색어를 입력한 뒤 ‘검색’을 눌러주세요.</div>`;
qEl.focus();
