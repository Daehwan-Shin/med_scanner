// index.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const {
  // e약은요 (OTC)
  searchDrugsByName,
  getDrugDetailById,
  // Rx 조합 (허가정보 + DUR [+ 최대용량])
  searchRxByName,
  getRxDetail,
} = require("./kpic-api");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "drug-finder-mfds" });
});

// --- e약은요(OTC) ---
app.get("/api/search", async (req, res) => {
  try {
    const name = (req.query.name || "").trim();
    if (!name) return res.status(400).json({ error: "name query is required" });
    const results = await searchDrugsByName(name);
    res.json({ count: Array.isArray(results) ? results.length : 0, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SEARCH_FAILED", message: err?.message || "Unknown error" });
  }
});

app.get("/api/detail/:drugcode", async (req, res) => {
  try {
    const code = (req.params.drugcode || "").trim();
    if (!code) return res.status(400).json({ error: "drugcode is required" });
    const detail = await getDrugDetailById(code);
    res.json({ detail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DETAIL_FAILED", message: err?.message || "Unknown error" });
  }
});

// --- Rx(허가정보 + DUR [+ 최대용량]) ---
app.get("/api/rx/search", async (req, res) => {
  try {
    const name = (req.query.name || "").trim();
    const spclty_pblc = (req.query.spclty || "").trim() || undefined; // "전문의약품" 등
    if (!name) return res.status(400).json({ error: "name query is required" });
    const results = await searchRxByName(name, { spclty_pblc, numOfRows: 20, pageNo: 1 });
    res.json({ count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "RX_SEARCH_FAILED", message: err?.message || "Unknown error" });
  }
});

app.get("/api/rx/detail/:code", async (req, res) => {
  try {
    const code = (req.params.code || "").trim();
    if (!code) return res.status(400).json({ error: "code is required" });
    const detail = await getRxDetail(code);
    res.json({ detail }); // {source: "PERMIT", permit, dur, maxDose} or {source: "EASYDRUG_FALLBACK", easy}
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "RX_DETAIL_FAILED", message: err?.message || "Unknown error" });
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`[drug-finder-mfds] listening on http://${HOST}:${PORT}`);
});
