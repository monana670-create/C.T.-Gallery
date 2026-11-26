const crypto = require("crypto");

const OWNER = process.env.GH_OWNER || "monana670-create";
const REPO = process.env.GH_REPO || "C.T.-Gallery";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const last = new Map();

async function gh(path, method = "GET", body) {
  const r = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ct-gallery-board",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) {
    const hint = [403, 404, 410].includes(r.status)
      ? " 토큰의 Issues 권한과 저장소의 Issues 기능을 확인해 주세요." : "";
    throw Object.assign(new Error(`GitHub 요청 실패 (${r.status}).${hint}`), { code: 502 });
  }
  return r.status === 204 ? null : r.json();
}

function passwordOk(input) {
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(process.env.ADMIN_PASSWORD || "");
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

const clean = (s, n) => String(s || "").trim().slice(0, n);
const isNotice = i => i && i.state === "open" && !i.pull_request &&
  (i.labels || []).some(l => l.name === "notice");

const META = /^<!--ct:(\{.*?\})-->\n?/;
function parse(c) {
  const body = c.body || "";
  let meta = {};
  const m = META.exec(body);
  try { if (m) meta = JSON.parse(m[1]); } catch (e) {}
  return { id: c.id, name: meta.n || "익명", parent: meta.p || 0, text: body.replace(META, ""), at: c.created_at };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.GITHUB_TOKEN)
    return res.status(500).json({ error: "서버 환경변수(GITHUB_TOKEN)가 비어 있어요." });

  try {
    if (req.method === "GET") {
      const n = parseInt(req.query.n, 10);
      if (n) {
        const [issue, list] = await Promise.all([gh(`/issues/${n}`), gh(`/issues/${n}/comments?per_page=100`)]);
        if (!isNotice(issue)) return res.status(404).json({ error: "공지를 찾을 수 없어요." });
        return res.json({ comments: list.map(parse) });
      }
      const list = await gh(`/issues?labels=notice&state=open&per_page=30`);
      return res.json({
        notices: list.filter(isNotice).map(i => ({
          n: i.number, title: i.title, body: i.body || "", at: i.created_at, count: i.comments
        }))
      });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "허용되지 않는 요청이에요." });

    const b = req.body || {};

    if (b.action === "comment") {
      if (b.website) return res.json({ ok: true });
      const n = parseInt(b.n, 10);
      const name = clean(b.name, 20).replace(/[<>{}]/g, "");
      const text = clean(b.text, 500);
      const parent = parseInt(b.parent, 10) || 0;
      if (!n || !name || !text) return res.status(400).json({ error: "닉네임과 내용을 입력해 주세요." });

      const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
      const now = Date.now();
      if (now - (last.get(ip) || 0) < 8000)
        return res.status(429).json({ error: "잠시 후에 다시 등록해 주세요." });
      last.set(ip, now);

      const issue = await gh(`/issues/${n}`);
      if (!isNotice(issue)) return res.status(404).json({ error: "공지를 찾을 수 없어요." });
      await gh(`/issues/${n}/comments`, "POST",
        { body: `<!--ct:${JSON.stringify({ n: name, p: parent })}-->\n${text}` });
      return res.json({ ok: true });
    }

    if (!passwordOk(b.password)) {
      await new Promise(r => setTimeout(r, 800));
      return res.status(401).json({ error: "관리자만 할 수 있어요." });
    }

    if (b.action === "notice") {
      const title = clean(b.title, 80), body = clean(b.body, 3000);
      if (!title || !body) return res.status(400).json({ error: "제목과 내용을 입력해 주세요." });
      await gh("/issues", "POST", { title, body, labels: ["notice"] });
      return res.json({ ok: true });
    }

    /* ========================================
   EDIT NOTICE
======================================== */

if (b.action === "editNotice") {
  const n = Number(b.n);

  const title = clean(b.title, 80);
  const body = clean(b.body, 3000);

  if (
    !Number.isSafeInteger(n) ||
    n < 1 ||
    !title ||
    !body
  )
    return res.status(400).json({
      error: "제목과 내용을 입력해 주세요."
    });

  const issue = await gh("/issues/" + n);

  if (!isNotice(issue))
    return res.status(404).json({
      error: "수정할 공지를 찾을 수 없어요."
    });

  await gh(
    "/issues/" + n,
    "PATCH",
    {
      title,
      body
    }
  );

  return res.json({
    ok: true,
    title,
    body
  });
}
    
    if (b.action === "delNotice") {
      const n = parseInt(b.n, 10);
      if (!n) return res.status(400).json({ error: "잘못된 요청이에요." });
      await gh(`/issues/${n}`, "PATCH", { state: "closed" });
      return res.json({ ok: true });
    }

    if (b.action === "delComment") {
      const id = parseInt(b.id, 10), n = parseInt(b.n, 10);
      if (!id || !n) return res.status(400).json({ error: "잘못된 요청이에요." });
      const list = await gh(`/issues/${n}/comments?per_page=100`);
      for (const c of list) {
        if (c.id !== id && parse(c).parent !== id) continue;
        await gh(`/issues/comments/${c.id}`, "DELETE");
      }
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "알 수 없는 요청이에요." });
  } catch (err) {
    return res.status(err.code || 500).json({ error: err.message || "서버 오류가 났어요." });
  }
};
