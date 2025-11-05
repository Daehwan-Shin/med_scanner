const $ = (sel) => document.querySelector(sel);
const resultsEl = $("#results");
const detailEl = $("#detail");
const qEl = $("#q");
const btnSearch = $("#btnSearch");

const escapeHTML = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function stringifyMaybe(v) {
  if (v == null) return "-";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

let lastQuery = "";
let results = [];
let activeIndex = -1;

// ===== 검색 =====
async function search(name) {
  const q = (name ?? qEl.value).trim();
  if (!q) {
    results = [];
    resultsEl.innerHTML = "";
    detailEl.innerHTML = `<div class="card muted">검색어를 입력하세요.</div>`;
    return;
  }

  detailEl.innerHTML = `<div class="card muted">검색 중...</div>`;
  try {
    const r = await fetch(`/api/search?name=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    results = Array.isArray(data?.results) ? data.results : [];
    renderResults(results);

    if (results.length === 0) {
      detailEl.innerHTML = `<div class="card muted">검색 결과가 없습니다.</div>`;
      activeIndex = -1;
      return;
    }

    // 최상위 항목 자동 상세
    activeIndex = 0;
    highlightActive();
    const first = results[0];
    const code = first?.itemSeq || first?.drugcode || first?.code;
    if (code) await loadDetail(code);
    else detailEl.innerHTML = `<div class="card muted">상세 코드가 없는 항목입니다.</div>`;
  } catch (e) {
    detailEl.innerHTML = `<div class="card error">검색 실패: ${escapeHTML(e.message || String(e))}</div>`;
  }
}

function renderResults(items) {
  resultsEl.innerHTML = (items || [])
    .map((it, idx) => {
      const name = it?.itemName || it?.drugname || it?.name || "이름 없음";
      const code = it?.itemSeq || it?.drugcode || it?.code || "";
      const etc = it?.entpName || it?.company || "";
      return `
        <button
          class="list-item"
          data-index="${idx}"
          data-code="${escapeHTML(code)}"
          role="option"
          aria-selected="false"
          title="${escapeHTML(name)}"
        >
          <div class="title">${escapeHTML(name)}</div>
          <div class="sub">${escapeHTML(code)}${etc ? " • " + escapeHTML(etc) : ""}</div>
        </button>
      `;
    })
    .join("");

  resultsEl.querySelectorAll(".list-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      const code = btn.dataset.code;
      activeIndex = idx;
      highlightActive();
      loadDetail(code);
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

// ===== 상세 =====
async function loadDetail(code) {
  detailEl.innerHTML = `<div class="card muted">상세 불러오는 중...</div>`;
  try {
    const r = await fetch(`/api/detail/${encodeURIComponent(code)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    renderDetail(data?.detail || {});
  } catch (e) {
    detailEl.innerHTML = `<div class="card error">상세 조회 실패: ${escapeHTML(e.message || String(e))}</div>`;
  }
}

function renderDetail(d) {
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
        <div><span>품목명</span><strong>${escapeHTML(name)}</strong></div>
        <div><span>품목기준코드</span><code>${escapeHTML(code)}</code></div>
        <div><span>업체명</span>${escapeHTML(comp)}</div>
        <div><span>분류</span>${escapeHTML(classNo)}</div>
        <div><span>제형/외형</span>${escapeHTML(form)}</div>
      </div>
      <hr/>
      <h3>효능·효과</h3>
      <pre class="scroll">${escapeHTML(String(efcy))}</pre>
      <h3>용법·용량</h3>
      <pre class="scroll">${escapeHTML(String(useMethod))}</pre>
      <h3>주의사항</h3>
      <pre class="scroll">${escapeHTML(String(atpn))}</pre>
      <h3>상호작용</h3>
      <pre class="scroll">${escapeHTML(String(intrc))}</pre>
      <h3>부작용</h3>
      <pre class="scroll">${escapeHTML(String(se))}</pre>
      <h3>보관방법</h3>
      <pre class="scroll">${escapeHTML(String(deposit))}</pre>
    </div>
  `;
}

// ===== 디바운스 검색 =====
let timer;
function debouncedSearch() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const q = qEl.value.trim();
    if (q && q !== lastQuery) {
      lastQuery = q;
      search(q);
    } else if (!q) {
      lastQuery = "";
      search("");
    }
  }, 350);
}

// ===== 이벤트 =====
btnSearch.addEventListener("click", () => search());
qEl.addEventListener("input", debouncedSearch);
qEl.addEventListener("keydown", (e) => {
  if (!results?.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex = Math.min(results.length - 1, (activeIndex < 0 ? 0 : activeIndex + 1));
    highlightActive();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex = Math.max(0, (activeIndex < 0 ? 0 : activeIndex - 1));
    highlightActive();
  } else if (e.key === "Enter") {
    if (activeIndex >= 0 && activeIndex < results.length) {
      const r = results[activeIndex];
      const code = r?.itemSeq || r?.drugcode || r?.code;
      if (code) loadDetail(code);
    } else {
      search();
    }
  }
});

qEl.focus();
