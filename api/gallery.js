const crypto = require("crypto");

const OWNER = process.env.GH_OWNER || "monana670-create";
const REPO = process.env.GH_REPO || "C.T.-Gallery";

const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;
const BRANCH = "main";

function isAdmin(password) {
  const a = Buffer.from(String(password || ""));
  const b = Buffer.from(process.env.ADMIN_PASSWORD || "");

  return b.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}

async function readGitHub(path = "") {
  return fetch(`${API}${path}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ct-gallery-reader"
    },
    signal: AbortSignal.timeout(8000)
  });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const fresh = req.method === "POST";

  if (req.method !== "GET" && !fresh) {
    res.setHeader("Allow", "GET, POST");

    return res.status(405).json({
      error: "허용되지 않는 요청입니다."
    });
  }

  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({
      error: "GitHub 인증 설정 오류"
    });
  }

  if (fresh && !isAdmin(req.body?.password)) {
    await new Promise(resolve => setTimeout(resolve, 800));

    return res.status(401).json({
      error: "관리자 인증 실패"
    });
  }

  try {
    const r = await readGitHub("/images");

    let files;

    if (r.status === 404) {
      const root = await readGitHub();

      if (!root.ok) {
        throw new Error(`GitHub HTTP ${root.status}`);
      }

      const entries = await root.json();

      if (
        !Array.isArray(entries) ||
        entries.some(f => f.name === "images")
      ) {
        throw new Error("작품 폴더 조회 실패");
      }

      files = [];

    } else {
      if (!r.ok) {
        throw new Error(`GitHub HTTP ${r.status}`);
      }

      files = await r.json();

      if (!Array.isArray(files)) {
        throw new Error("작품 목록 형식 오류");
      }
    }

    const works = files
      .filter(f =>
        f.type === "file" &&
        /\.(jpe?g|png|gif|webp)$/i.test(f.name)
      )
      .map(f => ({
        name: f.name,
        type: "file",
        sha: f.sha,
        download_url:
          `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/images/${encodeURIComponent(f.name)}?v=${encodeURIComponent(f.sha || "")}`
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "ko", {
          numeric: true
        })
      );

    if (!fresh) {
      res.setHeader(
        "Cache-Control",
        "public, max-age=0, must-revalidate"
      );

      res.setHeader(
        "Vercel-CDN-Cache-Control",
        "public, s-maxage=15"
      );
    }

    return res.status(200).json(works);

  } catch (err) {
    console.error("Gallery list:", err.message);

    return res.status(502).json({
      error: "작품 목록을 불러오지 못했어요. 다시 시도해 주세요."
    });
  }
};
