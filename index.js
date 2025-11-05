// index.js
const express = require("express");
const path = require("path");
const cors = require("cors");

// ✅ 이제 kpic-api.js는 MFDS(식약처) e약은요 OpenAPI를 호출합니다.
const { searchDrugsByName, getDrugDetailById } = require("./kpic-api");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "replit-kpic-app (e약은요)" });
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[replit-kpic-app] listening on http://localhost:${PORT}`);
});
