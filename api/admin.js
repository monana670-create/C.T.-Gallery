const crypto = require("crypto");

const OWNER = process.env.GH_OWNER || "monana670-create";
const REPO = process.env.GH_REPO || "C.T.-Gallery";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/`;

const EXT = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png"
};

const FX = ["none", "glow", "pulse", "spin"];

const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "ct-gallery-admin",
  "Content-Type": "application/json"
});

async function ghGet(path) {
  const r = await fetch(API + path, {
    headers: headers()
  });

  if (r.status === 404) return null;

  if (!r.ok) {
    throw new Error("GitHub 읽기 실패 (" + r.status + ")");
  }

  return r.json();
}

async function ghPut(path, content, message, sha) {
  const r = await fetch(API + path, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message,
      content,
      ...(sha ? { sha } : {})
    })
  });

  if (!r.ok) {
    throw new Error("GitHub 저장 실패 (" + r.status + ")");
  }

  return r.json();
}

async function ghDelete(path, message) {
  const cur = await ghGet(path);

  if (!cur || Array.isArray(cur)) return;

  const r = await fetch(API + path, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({
      message,
      sha: cur.sha
    })
  });

  if (!r.ok) {
    throw new Error("GitHub 삭제 실패 (" + r.status + ")");
  }
}

function pathFromUrl(u) {
  const prefix = RAW + "HEAD/";
  const s = String(u || "");

  if (!s.startsWith(prefix)) return null;

  const p = s.slice(prefix.length);

  return /^(characters|worldviews|webtoon)\/[\w./-]+$/.test(p) &&
    !p.includes("..")
    ? p
    : null;
}

function passwordOk(input) {
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(process.env.ADMIN_PASSWORD || "");

  return b.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(a, b);
}

const clean = (s, n) =>
  String(s || "").trim().slice(0, n);

function checkImage(b) {
  const ext = EXT[b.imageType];

  if (
    !ext ||
    typeof b.image !== "string" ||
    !b.image
  ) {
    throw Object.assign(
      new Error("이미지를 확인할 수 없어요."),
      { code: 400 }
    );
  }

  if (b.image.length > 3500000) {
    throw Object.assign(
      new Error("이미지가 너무 커요."),
      { code: 413 }
    );
  }

  return ext;
}

const fileOf = kind =>
  kind === "worldview"
    ? "data/worldviews.json"
    : "data/characters.json";

const encodeList = list =>
  Buffer.from(
    JSON.stringify(list, null, 2)
  ).toString("base64");

const decodeList = cur =>
  JSON.parse(
    Buffer.from(cur.content, "base64")
      .toString("utf8")
  );

module.exports = async (req, res) => {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST만 가능해요."
    });
  }

  if (!process.env.GITHUB_TOKEN || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      error: "서버 환경변수(GITHUB_TOKEN, ADMIN_PASSWORD)가 비어 있어요."
    });
  }

  const b = req.body || {};

  if (!passwordOk(b.password)) {
    await new Promise(r => setTimeout(r, 800));

    return res.status(401).json({
      error: "비밀번호가 맞지 않아요."
    });
  }

  try {

    /* ========================================
       01. ADMIN VERIFICATION
    ======================================== */

    if (b.action === "verify") {
      return res.json({ ok: true });
    }


    /* ========================================
       02. ADD GALLERY IMAGE
    ======================================== */

    if (b.action === "addImage") {
      const ext = checkImage(b);

      const list = await ghGet("images");

      const nums = (Array.isArray(list) ? list : [])
        .map(f => parseInt(f.name, 10))
        .filter(n => !isNaN(n));

      const next =
        (nums.length ? Math.max(...nums) : 0) + 1;

      await ghPut(
        `images/${next}.${ext}`,
        b.image,
        `Add image ${next}`
      );

      return res.json({
        ok: true,
        name: `${next}.${ext}`
      });
    }


    /* ========================================
       03. DELETE GALLERY IMAGE
    ======================================== */

    if (b.action === "deleteImage") {
      const name = String(b.name || "");

      if (!/^[\w-]+\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
        return res.status(400).json({
          error: "파일 이름이 올바르지 않아요."
        });
      }

      await ghDelete(
        `images/${name}`,
        `Delete image ${name}`
      );

      return res.json({ ok: true });
    }


    /* ========================================
       04. ADD WEBTOON ASSET
    ======================================== */

    if (b.action === "addAsset") {
      const ext = checkImage(b);

      const path =
        `webtoon/w${Date.now().toString(36)}.${ext}`;

      await ghPut(
        path,
        b.image,
        "Add webtoon image"
      );

      return res.json({
        ok: true,
        url: `${RAW}HEAD/${path}`
      });
    }


    /* ========================================
       05. ADD CHARACTER / WORLDVIEW
    ======================================== */

    if (b.action === "addEntry") {
      const isChar = b.kind !== "worldview";

      const file = fileOf(b.kind);

      const dir = isChar
        ? "characters/images"
        : "worldviews/images";

      const title = clean(b.title, 60);

      if (!title) {
        return res.status(400).json({
          error: "이름을 입력해 주세요."
        });
      }

      const ext = checkImage(b);

      const id =
        (isChar ? "c" : "w") +
        Date.now().toString(36);

      const imgPath =
        `${dir}/${id}.${ext}`;

      await ghPut(
        imgPath,
        b.image,
        `Add image ${id}`
      );

      const cur = await ghGet(file);

      const list = cur
        ? decodeList(cur)
        : [];

      const wImg =
        clean(b.webtoonImage, 300);

      const item = {
        id,
        title,

        description: clean(b.description, 120),
        body: clean(b.body, 5000),

        image: `${RAW}HEAD/${imgPath}`,

        color: /^#[0-9a-fA-F]{6}$/.test(b.color || "")
          ? b.color
          : "#3df0ff",

        effect: FX.includes(b.effect)
          ? b.effect
          : "none",

        illustrations: [],

        webtoonUrl: /^https?:\/\//i.test(b.webtoonUrl || "")
          ? clean(b.webtoonUrl, 300)
          : "",

        webtoonImage: wImg.startsWith(RAW)
          ? wImg
          : "",

        webtoonCover: "",

        createdAt: new Date().toISOString()
      };

      list.push(item);

      await ghPut(
        file,
        encodeList(list),
        `Add ${isChar ? "character" : "worldview"} ${title}`,
        cur && cur.sha
      );

      return res.json({
        ok: true,
        item
      });
    }


    /* ========================================
       06. EDIT CHARACTER / WORLDVIEW
    ======================================== */

    if (b.action === "editEntry") {

      if (!["character", "worldview"].includes(b.kind)) {
        return res.status(400).json({
          error: "잘못된 항목 종류예요."
        });
      }

      const file = fileOf(b.kind);
      const cur = await ghGet(file);

      if (!cur || !cur.sha) {
        return res.status(404).json({
          error: "데이터 파일을 찾을 수 없어요."
        });
      }

      const list = decodeList(cur);

      const idx = list.findIndex(
        x => x.id === b.id
      );

      if (idx < 0) {
        return res.status(404).json({
          error: "수정할 항목을 찾을 수 없어요."
        });
      }

      const old = list[idx];

      const title = clean(b.title, 60);

      const webtoonUrl =
        clean(b.webtoonUrl, 300);

      if (!title) {
        return res.status(400).json({
          error: "이름을 입력해 주세요."
        });
      }

      if (
        webtoonUrl &&
        !/^https?:\/\//i.test(webtoonUrl)
      ) {
        return res.status(400).json({
          error: "올바른 플레이 링크를 입력해 주세요."
        });
      }

      const item = {
        ...old,

        title,

        description: clean(b.description, 120),

        body: clean(b.body, 5000),

        color: /^#[0-9a-f]{6}$/i.test(b.color || "")
          ? b.color
          : old.color,

        effect: FX.includes(b.effect)
          ? b.effect
          : old.effect,

        webtoonUrl,

        updatedAt: new Date().toISOString()
      };

      /* 웹툰 본문 변경 */

      if (b.webtoonImage !== undefined) {

        const u = String(
          b.webtoonImage || ""
        );

        if (
          u &&
          !pathFromUrl(u)?.startsWith("webtoon/")
        ) {
          return res.status(400).json({
            error: "웹툰 이미지 주소가 올바르지 않아요."
          });
        }

        item.webtoonImage = u;
      }

      /* 대표 이미지 변경 */

      if (b.image) {
        const ext = checkImage(b);

        const dir = b.kind === "worldview"
          ? "worldviews/images"
          : "characters/images";

        const path =
          dir + "/edit-" +
          crypto.randomBytes(12).toString("hex") +
          "." + ext;

        await ghPut(
          path,
          b.image,
          "Update entry image"
        );

        item.image = RAW + "HEAD/" + path;
      }

      /* 추가 일러스트와 웹툰 정보는 그대로 유지 */

      list[idx] = item;

      await ghPut(
        file,
        encodeList(list),
        "Edit " + old.title,
        cur.sha
      );

      return res.json({
        ok: true,
        item
      });
    }


    /* ========================================
       07. REPLACE GALLERY IMAGE
    ======================================== */

    if (b.action === "replaceImage") {
      const name = String(b.name || "");

      if (!/^[\w-]+\.(jpg|jpeg|png|gif|webp)$/i.test(name)) {
        return res.status(400).json({
          error: "파일 이름이 올바르지 않아요."
        });
      }

      const ext =
        name.split(".").pop().toLowerCase();

      const mime = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif"
      }[ext];

      if (
        b.imageType !== mime ||
        typeof b.image !== "string" ||
        !b.image
      ) {
        return res.status(400).json({
          error: "이미지 형식을 확인해 주세요."
        });
      }

      if (b.image.length > 3500000) {
        return res.status(413).json({
          error: "이미지가 너무 커요."
        });
      }

      if (
        ext === "gif" &&
        !/^GIF8[79]a$/.test(
          Buffer.from(b.image, "base64")
            .subarray(0, 6)
            .toString("ascii")
        )
      ) {
        return res.status(400).json({
          error: "올바른 GIF 파일을 선택해 주세요."
        });
      }

      const path = "images/" + name;

      const cur = await ghGet(path);

      if (!cur || !cur.sha) {
        return res.status(404).json({
          error: "교체할 작품을 찾을 수 없어요."
        });
      }

      const saved = await ghPut(
        path,
        b.image,
        "Replace image " + name,
        cur.sha
      );

      return res.json({
        ok: true,
        name,

        url: saved.commit?.sha
          ? RAW + saved.commit.sha + "/" + path
          : saved.content?.download_url
      });
    }


    /* ========================================
       08. WEBTOON COVER / PLAY LINK
    ======================================== */

    if (b.action === "setWebtoonCover") {

      if (!["character", "worldview"].includes(b.kind)) {
        return res.status(400).json({
          error: "잘못된 항목 종류예요."
        });
      }

      const file = fileOf(b.kind);
      const cur = await ghGet(file);

      if (!cur || !cur.sha) {
        return res.status(404).json({
          error: "데이터 파일을 찾을 수 없어요."
        });
      }

      const list = decodeList(cur);

      const idx = list.findIndex(
        x => x.id === b.id
      );

      if (idx < 0) {
        return res.status(404).json({
          error: "항목을 찾을 수 없어요."
        });
      }

      const old = list[idx];

      let coverUrl = old.webtoonCover || "";

      let playUrl = old.webtoonUrl || "";

      /* 플레이 링크 수정 */

      if (typeof b.playUrl === "string") {

        playUrl = clean(b.playUrl, 300);

        if (playUrl) {
          try {

            const url = new URL(playUrl);

            if (!["http:", "https:"].includes(url.protocol)) {
              throw new Error();
            }

          } catch {
            return res.status(400).json({
              error: "올바른 플레이 링크를 입력해 주세요."
            });
          }
        }
      }

      /* 전용 일러스트 등록 */

      if (b.image) {

        const ext = checkImage(b);

        const path =
          "webtoon/cover-" +
          crypto.randomBytes(12).toString("hex") +
          "." + ext;

        await ghPut(
          path,
          b.image,
          "Update webtoon illustration"
        );

        coverUrl = `${RAW}HEAD/${path}`;

      } else if (b.clear === true) {

        coverUrl = "";
      }

      const item = {
        ...old,

        webtoonCover: coverUrl,

        webtoonUrl: playUrl,

        updatedAt: new Date().toISOString()
      };

      list[idx] = item;

      await ghPut(
        file,
        encodeList(list),
        `Update webtoon settings ${item.title}`,
        cur.sha
      );

      return res.json({
        ok: true,
        item
      });
    }


    /* ========================================
       09. ADD / REMOVE CHARACTER ILLUSTRATION
    ======================================== */

    if (
      b.action === "addIllustration" ||
      b.action === "removeIllustration"
    ) {

      const file = "data/characters.json";

      const cur = await ghGet(file);

      if (!cur || !cur.sha) {
        return res.status(404).json({
          error: "캐릭터 데이터를 찾을 수 없어요."
        });
      }

      const list = decodeList(cur);

      const idx = list.findIndex(
        x => x.id === b.id
      );

      if (idx < 0) {
        return res.status(404).json({
          error: "캐릭터를 찾을 수 없어요."
        });
      }

      const old = list[idx];

      const illustrations =
        Array.isArray(old.illustrations)
          ? [...old.illustrations]
          : [];

      let removed = "";

      /* 추가 일러스트 등록 */

      if (b.action === "addIllustration") {

        const ext = checkImage(b);

        const path =
          "characters/images/extra-" +
          crypto.randomBytes(12).toString("hex") +
          "." + ext;

        await ghPut(
          path,
          b.image,
          "Add character illustration"
        );

        illustrations.push(
          RAW + "HEAD/" + path
        );
      }

      /* 추가 일러스트 삭제 */

      if (b.action === "removeIllustration") {

        const index =
          illustrations.indexOf(b.url);

        if (index < 0) {
          return res.status(404).json({
            error: "일러스트를 찾을 수 없어요."
          });
        }

        removed = illustrations[index];

        illustrations.splice(index, 1);
      }

      /* 대표 이미지 및 기존 데이터 유지 */

      const item = {
        ...old,

        illustrations,

        updatedAt: new Date().toISOString()
      };

      list[idx] = item;

      await ghPut(
        file,
        encodeList(list),
        "Update character illustrations",
        cur.sha
      );

      /* 사용하지 않는 추가 이미지 파일 정리 */

      if (removed) {

        const path =
          pathFromUrl(removed);

        const stillUsed = list.some(entry =>
          entry.image === removed ||
          entry.webtoonCover === removed ||
          entry.webtoonImage === removed ||
          (
            Array.isArray(entry.illustrations) &&
            entry.illustrations.includes(removed)
          )
        );

        if (
          path &&
          /^characters\/images\/extra-[0-9a-f]{24}\.(webp|jpg|png)$/.test(path) &&
          !stillUsed
        ) {
          try {

            await ghDelete(
              path,
              "Remove character illustration"
            );

          } catch {}
        }
      }

      return res.json({
        ok: true,
        item
      });
    }


    /* ========================================
       10. DELETE CHARACTER / WORLDVIEW
    ======================================== */

    if (b.action === "deleteEntry") {

      const file = fileOf(b.kind);

      const cur = await ghGet(file);

      if (!cur) {
        return res.status(404).json({
          error: "데이터 파일을 찾을 수 없어요."
        });
      }

      const list = decodeList(cur);

      const idx = list.findIndex(
        x => x.id === b.id
      );

      if (idx < 0) {
        return res.status(404).json({
          error: "이미 삭제되었거나 찾을 수 없어요."
        });
      }

      const item = list[idx];

      list.splice(idx, 1);

      await ghPut(
        file,
        encodeList(list),
        `Delete ${item.title}`,
        cur.sha
      );

      const urls = new Set([
        item.image,
        item.webtoonImage,
        item.webtoonCover,

        ...(Array.isArray(item.illustrations)
          ? item.illustrations
          : [])
      ]);

      for (const u of urls) {

        const p = pathFromUrl(u);

        if (p) {
          try {

            await ghDelete(
              p,
              `Delete file ${p}`
            );

          } catch {}
        }
      }

      return res.json({
        ok: true
      });
    }


    return res.status(400).json({
      error: "알 수 없는 요청이에요."
    });

  } catch (err) {

    return res.status(err.code || 500).json({
      error: err.message || "서버 오류가 났어요."
    });
  }
};
