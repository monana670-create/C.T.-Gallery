const crypto = require("crypto");
const sharp = require("sharp");

/* ========================================
   C.T. GALLERY
   SECURE ADMIN & WORLD ARCHIVE
======================================== */

const OWNER = process.env.GH_OWNER || "monana670-create";
const REPO = process.env.GH_REPO || "C.T.-Gallery";

const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/`;

const EXT = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif"
};

const FX = ["none", "glow", "pulse", "spin"];

const MAX_B64 = 3500000;
const MAX_PIXELS = 40000000;

const RECORD_FILES = [
  "data/characters.json",
  "data/worldviews.json"
];

const err = (message, code = 400) =>
  Object.assign(new Error(message), { code });

const clean = (value, max) =>
  String(value ?? "").trim().slice(0, max);

const has = (object, key) =>
  Object.hasOwn(object, key);

const uuid = () =>
  crypto.randomBytes(12).toString("hex");

const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "ct-gallery-admin",
  "Content-Type": "application/json"
});


/* ========================================
   ADMIN PASSWORD
======================================== */

function passwordOk(input) {
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(process.env.ADMIN_PASSWORD || "");

  return (
    b.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(a, b)
  );
}


/* ========================================
   FILE SETTINGS
======================================== */

function fileOf(kind = "character") {
  if (kind === "character") {
    return RECORD_FILES[0];
  }

  if (kind === "worldview") {
    return RECORD_FILES[1];
  }

  throw err("잘못된 항목 종류예요.");
}

function dirOf(kind) {
  return kind === "worldview"
    ? "worldviews/images"
    : "characters/images";
}

function formatOf(path) {
  return ({
    jpg: "jpeg",
    jpeg: "jpeg",
    png: "png",
    webp: "webp",
    gif: "gif"
  })[
    path.split(".").pop().toLowerCase()
  ] || "";
}


/* ========================================
   IMAGE PATH SECURITY
======================================== */

function managedImage(path) {
  return (
    typeof path === "string" &&

    /^(characters|worldviews|webtoon|illustrations)\/[\w./-]+\.(jpg|jpeg|png|gif|webp)$/i.test(path) &&

    !path.includes("..") &&
    !path.includes("//")
  );
}

function pathFromUrl(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith(RAW)
  ) return null;

  const rest = value
    .slice(RAW.length)
    .split(/[?#]/)[0];

  const slash = rest.indexOf("/");

  if (slash < 1) return null;

  const path = rest.slice(slash + 1);

  return managedImage(path)
    ? path
    : null;
}

function collectPaths(value, set = new Set()) {
  if (typeof value === "string") {

    const path = pathFromUrl(value);

    if (path) set.add(path);

  } else if (
    value &&
    typeof value === "object"
  ) {

    for (const child of Object.values(value)) {
      collectPaths(child, set);
    }
  }

  return set;
}

function assetUrl(value) {
  const url = clean(value, 300);

  if (url && !pathFromUrl(url)) {
    throw err("이미지 주소가 올바르지 않아요.");
  }

  return url;
}

function linkUrl(value) {
  const link = clean(value, 300);

  if (!link) return "";

  try {

    const u = new URL(link);

    if (!/^https?:$/.test(u.protocol)) {
      throw new Error();
    }

    return u.href;

  } catch {

    throw err("올바른 링크를 입력해 주세요.");
  }
}


/* ========================================
   IMAGE VALIDATION
======================================== */

function checkImage(b) {
  const ext = EXT[b.imageType];

  if (
    !ext ||
    typeof b.image !== "string" ||
    !b.image
  ) {
    throw err("이미지를 확인할 수 없어요.");
  }

  if (b.image.length > MAX_B64) {
    throw err("이미지가 너무 커요.", 413);
  }

  return ext;
}


/* ========================================
   IMAGE METADATA REMOVAL
======================================== */

async function sanitizeImage(path, content) {

  if (
    typeof content !== "string" ||
    !content ||
    content.length > MAX_B64
  ) {
    throw err(
      "이미지 크기 또는 형식을 확인해 주세요."
    );
  }

  const format = formatOf(path);

  try {

    const input = sharp(
      Buffer.from(content, "base64"),
      {
        animated: true,
        limitInputPixels: MAX_PIXELS,
        failOn: "warning"
      }
    );

    const meta = await input.metadata();

    if (meta.format !== format) {
      throw err(
        "이미지 확장자와 실제 형식이 달라요."
      );
    }

    const pages = meta.pages || 1;

    const pageHeight =
      meta.pageHeight || meta.height;

    if (
      !meta.width ||
      !pageHeight ||
      meta.width * pageHeight * pages >
        MAX_PIXELS
    ) {
      throw err(
        "이미지 해상도 또는 프레임 수가 너무 많아요.",
        413
      );
    }

    if (pages === 1) {
      input.autoOrient();
    }

    const { data, info } = await input
      .toColourspace("srgb")
      .ensureAlpha()
      .raw()
      .toBuffer({
        resolveWithObject: true
      });

    if (info.channels !== 4) {
      throw err("이미지 채널 확인 실패");
    }


    /* NovelAI 알파 채널 숨김 정보 제거 */

    for (
      let i = 3;
      i < data.length;
      i += 4
    ) {

      data[i] = data[i] >= 254
        ? 255
        : data[i] & 0xfe;
    }


    const raw = {
      width: info.width,
      height: info.height,
      channels: 4,

      ...(pages > 1
        ? { pageHeight }
        : {})
    };

    const animation = {

      ...(typeof meta.loop === "number"
        ? { loop: meta.loop }
        : {}),

      ...(Array.isArray(meta.delay)
        ? { delay: meta.delay }
        : {})
    };


    for (const quality of [95,85,75]) {

      let output = sharp(data, {
        raw,
        limitInputPixels: MAX_PIXELS
      });

      if (format === "png") {

        output = output.png({
          compressionLevel: 9
        });

      } else if (format === "jpeg") {

        output = output
          .flatten({
            background: "#ffffff"
          })
          .jpeg({
            quality
          });

      } else if (format === "webp") {

        output = output.webp({
          quality,
          alphaQuality: 100,
          ...animation
        });

      } else if (format === "gif") {

        output = output.gif({
          effort: 3,
          keepDuplicateFrames: true,
          ...animation
        });

      } else {

        throw err(
          "지원하지 않는 이미지 형식이에요."
        );
      }

      const encoded = (
        await output.toBuffer()
      ).toString("base64");

      if (encoded.length <= MAX_B64) {
        return encoded;
      }

      if (
        format === "png" ||
        format === "gif"
      ) break;
    }

    throw err(
      "보안 처리된 이미지가 너무 커요. 크기를 줄여 주세요.",
      413
    );

  } catch (e) {

    if (
      e.code === 400 ||
      e.code === 413
    ) throw e;

    console.warn(
      "Image sanitize:",
      e.message
    );

    throw err(
      "이미지를 안전하게 변환하지 못했어요. 파일을 확인해 주세요."
    );
  }
}


/* ========================================
   GITHUB FILE READ
======================================== */

async function ghGet(path) {

  const r = await fetch(API + path, {
    headers: headers()
  });

  if (r.status === 404) {
    return null;
  }

  if (!r.ok) {
    throw new Error(
      "GitHub 읽기 실패 (" +
      r.status + ")"
    );
  }

  return r.json();
}


/* ========================================
   GITHUB FILE SAVE
======================================== */

async function ghPut(
  path,
  content,
  message,
  sha
) {

  if (formatOf(path)) {
    content = await sanitizeImage(
      path,
      content
    );
  }

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

    throw new Error(
      "GitHub 저장 실패 (" +
      r.status + ")"
    );
  }

  return r.json();
}


/* ========================================
   RECORD DATA
======================================== */

function decodeRecords(cur) {

  if (!cur) return [];

  if (
    typeof cur.content !== "string" ||
    !cur.content
  ) {
    throw new Error(
      "기록 데이터를 읽을 수 없어요."
    );
  }

  const list = JSON.parse(
    Buffer.from(cur.content, "base64")
      .toString("utf8")
  );

  if (!Array.isArray(list)) {
    throw new Error(
      "기록 데이터 형식 오류"
    );
  }

  return list;
}

async function loadRecords(kind) {

  const file = fileOf(kind);

  const cur = await ghGet(file);

  const list = decodeRecords(cur);

  return {
    file,
    sha: cur?.sha,
    list,
    before: collectPaths(list)
  };
}


/* ========================================
   IMAGE REFERENCE CHECK
======================================== */

async function livePaths() {

  const files = await Promise.all(
    RECORD_FILES.map(ghGet)
  );

  const refs = new Set();

  for (const file of files) {

    collectPaths(
      decodeRecords(file),
      refs
    );
  }

  return refs;
}


/* ========================================
   SAFE FILE DELETE
======================================== */

async function ghDelete(path, message) {

  if (
    managedImage(path) &&
    (await livePaths()).has(path)
  ) {
    return false;
  }

  const cur = await ghGet(path);

  if (
    !cur ||
    Array.isArray(cur)
  ) {
    return false;
  }

  const r = await fetch(API + path, {

    method: "DELETE",

    headers: headers(),

    body: JSON.stringify({
      message,
      sha: cur.sha
    })
  });

  if (!r.ok) {

    throw new Error(
      "GitHub 삭제 실패 (" +
      r.status + ")"
    );
  }

  return true;
}


/* ========================================
   UNUSED IMAGE CLEANUP
======================================== */

async function cleanup(path) {

  if (!managedImage(path)) return;

  try {

    await ghDelete(
      path,
      "Remove unused image " + path
    );

  } catch (e) {

    console.warn(
      "Image cleanup:",
      path,
      e.message
    );
  }
}


/* ========================================
   SAVE RECORDS
======================================== */

async function saveRecords(state, message) {

  const after = collectPaths(
    state.list
  );

  const content = Buffer.from(
    JSON.stringify(
      state.list,
      null,
      2
    )
  ).toString("base64");


  /* 정상 저장 후 기존 파일 정리 */

  await ghPut(
    state.file,
    content,
    message,
    state.sha
  );

  for (const path of state.before) {

    if (!after.has(path)) {
      await cleanup(path);
    }
  }
}

function findIndex(state, id) {

  const index = state.list.findIndex(
    x => x.id === id
  );

  if (index < 0) {

    throw err(
      "항목을 찾을 수 없어요.",
      404
    );
  }

  return index;
}


/* ========================================
   ADMIN API
======================================== */

module.exports = async (req, res) => {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "POST만 가능해요."
    });
  }

  if (
    !process.env.GITHUB_TOKEN ||
    !process.env.ADMIN_PASSWORD
  ) {

    return res.status(500).json({
      error:
        "서버 환경변수(GITHUB_TOKEN, ADMIN_PASSWORD)를 확인해 주세요."
    });
  }

  const b = req.body || {};

  if (!passwordOk(b.password)) {

    await new Promise(
      r => setTimeout(r, 800)
    );

    return res.status(401).json({
      error: "비밀번호가 맞지 않아요."
    });
  }


  const pending = [];

  async function upload(dir, prefix) {

    const ext = checkImage(b);

    const path =
      `${dir}/${prefix}-${uuid()}.${ext}`;

    pending.push(path);

    await ghPut(
      path,
      b.image,
      "Add image " + path
    );

    return RAW + "HEAD/" + path;
  }


  try {

    /* ========================================
       ADMIN VERIFY
    ======================================== */

    if (b.action === "verify") {

      return res.json({
        ok: true
      });
    }


    /* ========================================
       WORLD ASSET UPLOAD
    ======================================== */

    if (b.action === "addWorldAsset") {

      const url = await upload(
        "worldviews/images",
        "lore"
      );

      return res.json({
        ok: true,
        url
      });
    }


    /* ========================================
       SAVE WORLD DETAILS
    ======================================== */

    if (b.action === "saveWorldDetails") {

      const state = await loadRecords(
        "worldview"
      );

      const index = findIndex(
        state,
        b.id
      );

      const raw = b.worldDetails;


      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw)
      ) {

        throw err(
          "세계관 설정 형식이 올바르지 않아요."
        );
      }


      /* 지도 좌표 검사 */

      function coordinate(value) {

        if (
          value === "" ||
          value === null ||
          value === undefined
        ) return null;

        const n = Number(value);

        return (
          Number.isFinite(n) &&
          n >= 0 &&
          n <= 100
        ) ? n : null;
      }


      /* 모든 세부 항목은 선택 사항 */

      const details = {

        genre: clean(
          raw.genre,
          120
        ),

        era: clean(
          raw.era,
          120
        ),

        tagline: clean(
          raw.tagline,
          250
        ),

        mapImage: assetUrl(
          raw.mapImage
        ),

        characterIds: [

          ...new Set(

            (
              Array.isArray(raw.characterIds)

                ? raw.characterIds

                : []
            )

              .map(
                id => clean(id,100)
              )

              .filter(Boolean)
          )

        ].slice(0,200)
      };


      const groups = [

        "facts",
        "regions",
        "history",
        "factions",
        "rules",
        "lore",
        "gallery",
        "secrets",
        "custom"

      ];


      for (const key of groups) {

        const input =
          Array.isArray(raw[key])

            ? raw[key]

            : [];


        if (input.length > 20) {

          throw err(
            "한 분류에 최대 20개 항목을 등록할 수 있어요."
          );
        }


        details[key] = input

          .filter(row =>

            row &&
            typeof row === "object" &&
            !Array.isArray(row)

          )

          .map(row => {

            const value = {

              title: clean(
                row.title,
                120
              ),

              text: clean(
                row.text,
                3000
              )
            };


            if (
              [
                "history",
                "factions",
                "lore",
                "custom"
              ].includes(key)
            ) {

              value.label = clean(
                row.label,
                120
              );
            }


            if (key !== "facts") {

              value.image = assetUrl(
                row.image
              );
            }


            if (key === "regions") {

              value.x = coordinate(
                row.x
              );

              value.y = coordinate(
                row.y
              );
            }

            return value;
          })

          .filter(row =>

            row.title ||
            row.text ||
            row.label ||
            row.image

          );
      }


      if (
        Buffer.byteLength(
          JSON.stringify(details),
          "utf8"
        ) > 90000
      ) {

        throw err(
          "세계관 설정 내용이 너무 많아요.",
          413
        );
      }


      /* 기존 세계관 정보 보존 */

      const item = {

        ...state.list[index],

        worldDetails: details,

        updatedAt:
          new Date().toISOString()
      };


      state.list[index] = item;


      await saveRecords(
        state,
        "Update world archive " +
        item.title
      );


      return res.json({
        ok: true,
        item
      });
    }


    /* ========================================
       DISCARD UNUSED WORLD ASSETS
    ======================================== */

    if (b.action === "discardWorldAssets") {

      const urls = Array.isArray(b.urls)

        ? b.urls.slice(0,20)

        : [];


      for (const url of urls) {

        const path = pathFromUrl(url);

        if (
          path &&

          /^worldviews\/images\/lore-[a-f0-9]{24}\.(png|jpg|webp|gif)$/i
            .test(path)
        ) {

          await cleanup(path);
        }
      }


      return res.json({
        ok: true
      });
    }


    /* ========================================
       ADD GALLERY IMAGE
    ======================================== */

    if (b.action === "addImage") {

      const ext = checkImage(b);

      const list = await ghGet("images");

      const numbers = (
        Array.isArray(list)
          ? list
          : []
      )

        .map(f => parseInt(f.name,10))

        .filter(Number.isFinite);


      const next = (
        numbers.length

          ? Math.max(...numbers)

          : 0
      ) + 1;


      const name = next + "." + ext;


      await ghPut(
        "images/" + name,
        b.image,
        "Add image " + next
      );


      return res.json({
        ok: true,
        name
      });
    }


    /* ========================================
       REPLACE GALLERY IMAGE
    ======================================== */

    if (b.action === "replaceImage") {

      const name = String(
        b.name || ""
      );

      if (
        !/^[\w-]+\.(jpg|jpeg|png|gif|webp)$/i
          .test(name)
      ) {

        throw err(
          "파일 이름이 올바르지 않아요."
        );
      }

      checkImage(b);

      const path = "images/" + name;

      const actual = formatOf(name);

      if (
        b.imageType !== "image/" + actual
      ) {

        throw err(
          "기존 작품과 동일한 이미지 형식을 선택해 주세요."
        );
      }

      const cur = await ghGet(path);

      if (!cur?.sha) {

        throw err(
          "교체할 작품을 찾을 수 없어요.",
          404
        );
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

          ? RAW +
            saved.commit.sha +
            "/" +
            path

          : saved.content?.download_url
      });
    }


    /* ========================================
       DELETE GALLERY IMAGE
    ======================================== */

    if (b.action === "deleteImage") {

      const name = String(
        b.name || ""
      );

      if (
        !/^[\w-]+\.(jpg|jpeg|png|gif|webp)$/i
          .test(name)
      ) {

        throw err(
          "파일 이름이 올바르지 않아요."
        );
      }

      await ghDelete(
        "images/" + name,
        "Delete image " + name
      );

      return res.json({
        ok: true
      });
    }


    /* ========================================
       ADD WEBTOON ASSET
    ======================================== */

    if (b.action === "addAsset") {

      const url = await upload(
        "webtoon",
        "w"
      );

      return res.json({
        ok: true,
        url
      });
    }


    /* ========================================
       ADD CHARACTER / WORLDVIEW
    ======================================== */

    if (b.action === "addEntry") {

      const kind = b.kind || "character";

      const state = await loadRecords(kind);

      const title = clean(b.title,60);


      if (!title) {

        throw err(
          "이름을 입력해 주세요."
        );
      }


      const item = {

        id: (
          kind === "worldview"
            ? "w"
            : "c"
        ) + uuid(),

        title,

        description: clean(
          b.description,
          120
        ),

        body: clean(
          b.body,
          5000
        ),

        color:
          /^#[0-9a-f]{6}$/i.test(b.color || "")

            ? b.color

            : "#3df0ff",

        effect:
          FX.includes(b.effect)

            ? b.effect

            : "none",

        webtoonUrl: linkUrl(
          b.webtoonUrl ?? b.playUrl
        ),

        webtoonImage: assetUrl(
          b.webtoonImage
        ),

        webtoonCover: assetUrl(
          b.webtoonCover
        ),

        illustrations: [],

        createdAt:
          new Date().toISOString()
      };


      item.image = await upload(
        dirOf(kind),
        item.id
      );


      state.list.push(item);


      await saveRecords(
        state,
        "Add " + kind + " " + title
      );


      return res.json({
        ok: true,
        item
      });
    }


    /* ========================================
       EDIT CHARACTER / WORLDVIEW
    ======================================== */

    if (b.action === "editEntry") {

      const kind = b.kind || "character";

      const state = await loadRecords(kind);

      const index = findIndex(
        state,
        b.id
      );

      const old = state.list[index];

      const item = {

        ...old,

        updatedAt:
          new Date().toISOString()
      };


      if (has(b,"title")) {

        item.title = clean(
          b.title,
          60
        );

        if (!item.title) {

          throw err(
            "이름을 입력해 주세요."
          );
        }
      }


      if (has(b,"description")) {

        item.description = clean(
          b.description,
          120
        );
      }


      if (has(b,"body")) {

        item.body = clean(
          b.body,
          5000
        );
      }


      if (
        /^#[0-9a-f]{6}$/i.test(b.color || "")
      ) {

        item.color = b.color;
      }


      if (FX.includes(b.effect)) {

        item.effect = b.effect;
      }


      if (has(b,"webtoonUrl")) {

        item.webtoonUrl = linkUrl(
          b.webtoonUrl
        );

      } else if (has(b,"playUrl")) {

        item.webtoonUrl = linkUrl(
          b.playUrl
        );
      }


      if (has(b,"webtoonImage")) {

        item.webtoonImage = assetUrl(
          b.webtoonImage
        );
      }


      if (has(b,"webtoonCover")) {

        item.webtoonCover = assetUrl(
          b.webtoonCover
        );
      }


      if (b.image) {

        item.image = await upload(
          dirOf(kind),
          "edit"
        );
      }


      state.list[index] = item;


      await saveRecords(
        state,
        "Edit " + old.title
      );


      return res.json({
        ok: true,
        item
      });
    }


    /* ========================================
       WEBTOON COVER & PLAY LINK
    ======================================== */

    if (b.action === "setWebtoonCover") {

      const kind = b.kind || "character";

      const state = await loadRecords(kind);

      const index = findIndex(
        state,
        b.id
      );

      const item = {

        ...state.list[index],

        updatedAt:
          new Date().toISOString()
      };


      if (has(b,"playUrl")) {

        item.webtoonUrl = linkUrl(
          b.playUrl
        );

      } else if (has(b,"webtoonUrl")) {

        item.webtoonUrl = linkUrl(
          b.webtoonUrl
        );
      }


      if (b.image) {

        item.webtoonCover = await upload(
          "webtoon",
          "cover"
        );

      } else if (b.clear) {

        item.webtoonCover = "";
      }


      state.list[index] = item;


      await saveRecords(
        state,
        "Update webtoon cover " +
        item.title
      );


      return res.json({

        ok: true,

        item,

        url: item.webtoonCover || ""
      });
    }


    /* ========================================
       ADD CHARACTER ILLUSTRATION
    ======================================== */

    if (b.action === "addIllustration") {

      const state = await loadRecords(
        "character"
      );

      const index = findIndex(
        state,
        b.id
      );

      const item = {

        ...state.list[index],

        updatedAt:
          new Date().toISOString()
      };


      const url = await upload(
        "characters/images",
        "extra"
      );


      item.illustrations = [

        ...(
          Array.isArray(item.illustrations)

            ? item.illustrations

            : []
        ),

        url
      ];


      state.list[index] = item;


      await saveRecords(
        state,
        "Add illustration " +
        item.title
      );


      return res.json({

        ok: true,

        item,

        url,

        illustrations:
          item.illustrations
      });
    }


    /* ========================================
       REMOVE CHARACTER ILLUSTRATION
    ======================================== */

    if (b.action === "removeIllustration") {

      const state = await loadRecords(
        "character"
      );

      const index = findIndex(
        state,
        b.id
      );

      const item = {

        ...state.list[index],

        updatedAt:
          new Date().toISOString()
      };


      const list =
        Array.isArray(item.illustrations)

          ? item.illustrations

          : [];


      const url = String(
        b.url || ""
      );


      if (!list.includes(url)) {

        throw err(
          "추가 일러스트를 찾을 수 없어요.",
          404
        );
      }


      item.illustrations = list.filter(
        x => x !== url
      );


      state.list[index] = item;


      await saveRecords(
        state,
        "Remove illustration " +
        item.title
      );


      return res.json({

        ok: true,

        item,

        illustrations:
          item.illustrations
      });
    }


    /* ========================================
       DELETE CHARACTER / WORLDVIEW
    ======================================== */

    if (b.action === "deleteEntry") {

      const state = await loadRecords(
        b.kind || "character"
      );

      const index = findIndex(
        state,
        b.id
      );

      const item = state.list[index];

      state.list.splice(index,1);


      await saveRecords(
        state,
        "Delete " + item.title
      );


      return res.json({
        ok: true
      });
    }


    /* 요청 이름을 포함한 오류 메시지 */

    return res.status(400).json({

      error:
        "알 수 없는 요청이에요. (" +
        clean(b.action,80) +
        ")"
    });


  } catch (e) {

    for (const path of pending) {

      await cleanup(path);
    }


    return res.status(

      e.code === 400 ||
      e.code === 404 ||
      e.code === 413

        ? e.code

        : 500

    ).json({

      error:
        e.message ||
        "서버 오류가 났어요."
    });
  }
};
