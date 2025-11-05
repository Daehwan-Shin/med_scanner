// index.js
const express = require("express");
const path = require("path");
const cors = require("cors");

// ✅ MCP 프로젝트의 dist/kpic-api.js를 이 리포의 kpic-api.js로 복사해 오세요.
//    최소한 아래 두 함수를 export 해야 합니다.
//    * searchDrugsByName(drugname: string): Promise<Array>
//    * getDrugDetailById(drugcode: string): Promise<Object>
const { searchDrugsByName, getDrugDetailById } = require("./kpic-api");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "replit-kpic-app" });
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
