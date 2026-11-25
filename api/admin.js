const crypto = require("crypto");

const OWNER = process.env.GH_OWNER || "monana670-create";
const REPO = process.env.GH_REPO || "C.T.-Gallery";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/`;
const EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const FX = ["none", "glow", "pulse", "spin"];

const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "ct-gallery-admin",
  "Content-Type": "application/json"
});

async function ghGet(path) {
  const r = await fetch(API + path, { headers: headers() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("GitHub 읽기 실패 (" + r.status + ")");
  return r.json();
}

async function ghPut(path, content, message, sha) {
  const r = await fetch(API + path, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ message, content, ...(sha ? { sha } : {}) })
  });
  if (!r.ok) throw new Error("GitHub 저장 실패 (" + r.status + ")");
  return r.json();
}

function passwordOk(input) {
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(process.env.ADMIN_PASSWORD || "");
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

const clean = (s, n) => String(s || "").trim().slice(0, n);

function checkImage(b) {
  const ext = EXT[b.imageType];
  if (!ext || !b.image) throw Object.assign(new Error("이미지를 확인할 수 없어요."), { code: 400 });
  if (b.image.length > 3500000) throw Object.assign(new Error("이미지가 너무 커요."), { code: 413 });
  return ext;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 가능해요." });
  if (!process.env.GITHUB_TOKEN || !process.env.ADMIN_PASSWORD)
    return res.status(500).json({ error: "서버 환경변수(GITHUB_TOKEN, ADMIN_PASSWORD)가 비어 있어요." });

  const b = req.body || {};
  if (!passwordOk(b.password)) {
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: "비밀번호가 맞지 않아요." });
  }

  try {
    if (b.action === "verify") return res.json({ ok: true });

    if (b.action === "addImage") {
      const ext = checkImage(b);
      const list = await ghGet("images");
      const nums = (Array.isArray(list) ? list : [])
        .map(f => parseInt(f.name, 10)).filter(n => !isNaN(n));
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      await ghPut(`images/${next}.${ext}`, b.image, `Add image ${next}`);
      return res.json({ ok: true, name: `${next}.${ext}` });
    }

    if (b.action === "addAsset") {
      const ext = checkImage(b);
      const path = `webtoon/w${Date.now().toString(36)}.${ext}`;
      await ghPut(path, b.image, "Add webtoon image");
      return res.json({ ok: true, url: `${RAW}HEAD/${path}` });
    }

    if (b.action === "addEntry") {
      const isChar = b.kind !== "worldview";
      const file = isChar ? "data/characters.json" : "data/worldviews.json";
      const dir = isChar ? "characters/images" : "worldviews/images";
      const title = clean(b.title, 60);
      if (!title) return res.status(400).json({ error: "이름을 입력해 주세요." });
      const ext = checkImage(b);

      const id = (isChar ? "c" : "w") + Date.now().toString(36);
      const imgPath = `${dir}/${id}.${ext}`;
      await ghPut(imgPath, b.image, `Add image ${id}`);

      const cur = await ghGet(file);
      const list = cur ? JSON.parse(Buffer.from(cur.content, "base64").toString("utf8")) : [];
      const wImg = clean(b.webtoonImage, 300);
      const item = {
        id,
        title,
        description: clean(b.description, 120),
        body: clean(b.body, 5000),
        image: `${RAW}HEAD/${imgPath}`,
        color: /^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : "#111111",
        effect: FX.includes(b.effect) ? b.effect : "none",
        webtoonUrl: /^https?:\/\//i.test(b.webtoonUrl || "") ? clean(b.webtoonUrl, 300) : "",
        webtoonImage: wImg.startsWith(RAW) ? wImg : "",
        createdAt: new Date().toISOString()
      };
      list.push(item);
      await ghPut(file, Buffer.from(JSON.stringify(list, null, 2)).toString("base64"),
        `Add ${isChar ? "character" : "worldview"} ${title}`, cur && cur.sha);
      return res.json({ ok: true, item });
    }

    return res.status(400).json({ error: "알 수 없는 요청이에요." });
  } catch (err) {
    return res.status(err.code || 500).json({ error: err.message || "서버 오류가 났어요." });
  }
};
