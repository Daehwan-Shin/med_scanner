const $ = (sel) => document.querySelector(sel);
const resultsEl = $("#results");
const detailEl = $("#detail");
const qEl = $("#q");
const btnSearch = $("#btnSearch");

// ===== 유틸 =====
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeHTML = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function stringifyMaybe(v) {
  if (v == null) return "-";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

// ===== 상태 =====
let lastQuery = "";
let results = [];
let activeIndex = -1; // 키보드 내비게이션용

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

    // 최상위 항목을 자동으로 상세 표시
    activeIndex = 0;
    highlightActive();
    const first = results[0];
    const code = first?.drugcode || first?.itemSeq || first?.code;
    if (code) await loadDetail(code);
    else detailEl.innerHTML = `<div class="card muted">상세 코드가 없는 항목입니다.</div>`;
  } catch (e) {
    detailEl.innerHTML = `<div class="card error">검색 실패: ${escapeHTML(e.message || String(e))}</div>`;
  }
}

function renderResults(items) {
  resultsEl.innerHTML = (items || [])
    .map((it, idx) => {
      const name = it?.drugname || it?.itemName || it?.name || "이름 없음";
      const code = it?.drugcode || it?.itemSeq || it?.code || "";
      const etc = it?.company || it?.entpName || "";
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
  // 필드 맵핑(실제 KPIC 응답 키에 맞게 필요한 것만 교체하세요)
  const name = d.itemName || d.drugname || d.name || "이름 없음";
  const code = d.itemSeq || d.drugcode || d.code || "-";
  const comp = d.entpName || d.company || "-";
  const classNo = d.classNo || d.classification || "-";
  const form = d.dosageForm || d.form || "-";
  const ing = d.mainIngr || d.ingredient || d.components || "-";
  const add = d.additives || d.excipients || "-";
  const warn = d.warnings || d.cautions || "-";

  detailEl.innerHTML = `
    <div class="card">
      <div class="kv">
        <div><span>품목명</span><strong>${escapeHTML(name)}</strong></div>
        <div><span>품목기준코드</span><code>${escapeHTML(code)}</code></div>
        <div><span>업체명</span>${escapeHTML(comp)}</div>
        <div><span>분류</span>${escapeHTML(classNo)}</div>
        <div><span>제형</span>${escapeHTML(form)}</div>
      </div>
      <hr/>
      <h3>주성분</h3>
      <pre class="scroll">${escapeHTML(stringifyMaybe(ing))}</pre>
      <h3>첨가제</h3>
      <pre class="scroll">${escapeHTML(stringifyMaybe(add))}</pre>
      <h3>주의/경고</h3>
      <pre class="scroll">${escapeHTML(stringifyMaybe(warn))}</pre>
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
      const code = r?.drugcode || r?.itemSeq || r?.code;
      if (code) loadDetail(code);
    } else {
      search();
    }
  }
});

// 첫 포커스
qEl.focus();
