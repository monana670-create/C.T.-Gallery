/* ========================================
   C.T. WORLD ARCHIVE
   WORLDVIEW EXPANSION SYSTEM
======================================== */

(() => {

  "use strict";

  const $ = id => document.getElementById(id);

  const viewer = $("viewer");

  const stage = viewer?.querySelector(".v-stage");

  const reduce = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  if (!viewer || !stage) return;

  if ($("ctw-atlas")) return;


  /* ========================================
     WORLD SECTION DEFINITIONS
  ======================================== */

  const groups = [

    {
      key: "facts",
      title: "세계관 정보",
      en: "WORLD INFORMATION",
      image: false
    },

    {
      key: "regions",
      title: "지역 및 장소",
      en: "REGIONS & LOCATIONS",
      image: true,
      coordinates: true
    },

    {
      key: "history",
      title: "세계의 역사",
      en: "CHRONOLOGY",
      label: "날짜 또는 시대",
      image: true
    },

    {
      key: "factions",
      title: "세력 및 종족",
      en: "FACTIONS & RACES",
      label: "분류",
      image: true
    },

    {
      key: "rules",
      title: "세계의 법칙",
      en: "WORLD SYSTEM",
      image: true
    },

    {
      key: "lore",
      title: "설정 자료",
      en: "LORE DATABASE",
      label: "분류",
      image: true
    },

    {
      key: "gallery",
      title: "세계관 일러스트",
      en: "WORLD GALLERY",
      image: true
    },

    {
      key: "secrets",
      title: "기밀 기록",
      en: "CLASSIFIED RECORDS",
      image: true
    },

    {
      key: "custom",
      title: "추가 기록",
      en: "ADDITIONAL RECORDS",
      label: "분류",
      image: true
    }

  ];


  const escape = value =>
    String(value ?? "").replace(
      /[&<>"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[c]
    );


  const safeURL = value => {

    try {

      const raw = String(
        value || ""
      ).trim();

      if (!raw) return "";

      const url = new URL(
        raw,
        location.href
      );

      return /^https?:$/.test(url.protocol)
        ? url.href
        : "";

    } catch {

      return "";
    }
  };


  const list = value =>
    Array.isArray(value)
      ? value.filter(x => x && typeof x === "object")
      : [];


  const validRow = row =>
    !!(
      row.title ||
      row.text ||
      row.label ||
      safeURL(row.image)
    );


  function currentWorld() {

    if (
      viewer.dataset.kind !== "worldview" ||
      !viewer.classList.contains("open")
    ) return null;

    if (
      typeof vList === "undefined" ||
      typeof vIdx === "undefined"
    ) return null;

    return vList[vIdx] || null;
  }


  function admin() {

    return (
      document.body.classList.contains("admin") &&
      typeof adminPw !== "undefined" &&
      !!adminPw
    );
  }


  /* ========================================
     WORLD ATLAS CONTAINER
  ======================================== */

  const atlas = document.createElement("div");

  atlas.id = "ctw-atlas";
  atlas.className = "ctw-atlas";
  atlas.hidden = true;

  const strip = stage.querySelector(".v-strip");

  stage.insertBefore(
    atlas,
    strip || null
  );


  /* ========================================
     RENDER HELPERS
  ======================================== */

  function imageHTML(src, title = "") {

    const url = safeURL(src);

    if (!url) return "";

    return `
      <img
        src="${escape(url)}"
        alt="${escape(title)}"
        loading="lazy"
        decoding="async">
    `;
  }


  function cardHTML(row, id = "") {

    return `
      <article class="ctw-card"
        ${id ? `id="${escape(id)}"` : ""}>

        ${imageHTML(row.image,row.title)}

        ${row.label
          ? `<small>${escape(row.label)}</small>`
          : ""}

        ${row.title
          ? `<h4>${escape(row.title)}</h4>`
          : ""}

        ${row.text
          ? `<p>${escape(row.text)}</p>`
          : ""}

      </article>
    `;
  }


  function sectionHTML(key, title, en, content) {

    if (!content) return "";

    return `
      <section class="ctw-section"
        id="ctw-${escape(key)}">

        <header class="ctw-heading">
          <small>${escape(en)}</small>
          <h3>${escape(title)}</h3>
        </header>

        ${content}

      </section>
    `;
  }


  function coordinates(row) {

    if (
      row.x === null ||
      row.x === undefined ||
      row.x === "" ||
      row.y === null ||
      row.y === undefined ||
      row.y === ""
    ) return null;

    const x = Number(row.x);
    const y = Number(row.y);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 || x > 100 ||
      y < 0 || y > 100
    ) return null;

    return { x, y };
  }


  /* ========================================
     OPTIONAL SECTION RENDERING
  ======================================== */

  let lastWorld = null;
  let lastAdmin = false;
  let revealObserver;


  function renderWorld(force = false) {

    const item = currentWorld();

    if (!item) {

      atlas.hidden = true;
      lastWorld = null;
      revealObserver?.disconnect();

      return;
    }

    if (
      !force &&
      item === lastWorld &&
      lastAdmin === admin()
    ) return;

    lastWorld = item;

    lastAdmin = admin();

    revealObserver?.disconnect();


    const d =
      item.worldDetails &&
      typeof item.worldDetails === "object"

        ? item.worldDetails

        : {};


    const parts = [];
    const navigation = [];


    function addSection(
      key,
      title,
      en,
      content
    ) {

      if (!content) return;

      navigation.push({
        key,
        title
      });

      parts.push(
        sectionHTML(
          key,
          title,
          en,
          content
        )
      );
    }


    /* 기본 장르 / 시대 / 캐치프레이즈 */

    const meta = [

      d.genre
        ? `<span class="ctw-badge">
             ${escape(d.genre)}
           </span>`
        : "",

      d.era
        ? `<span class="ctw-badge">
             ${escape(d.era)}
           </span>`
        : "",

      d.tagline
        ? `<p class="ctw-tagline">
             ${escape(d.tagline)}
           </p>`
        : ""

    ].join("");


    /* 세계관 기본 정보 */

    const facts = list(d.facts)
      .filter(validRow);

    if (facts.length) {

      addSection(
        "facts",
        "세계관 정보",
        "WORLD INFORMATION",

        `<div class="ctw-facts">
          ${facts.map(row => `
            <div class="ctw-fact">

              ${row.title
                ? `<strong>
                     ${escape(row.title)}
                   </strong>`
                : ""}

              ${row.text
                ? `<p>${escape(row.text)}</p>`
                : ""}

            </div>
          `).join("")}
        </div>`
      );
    }


    /* ========================================
       INTERACTIVE WORLD MAP
    ======================================== */

    const regions = list(d.regions)
      .filter(validRow);

    const map = safeURL(d.mapImage);

    if (map) {

      const pins = regions.map(
        (row,i) => {

          const c = coordinates(row);

          if (!c) return "";

          return `
            <button
              type="button"
              class="ctw-pin"
              style="left:${c.x}%;top:${c.y}%"
              data-ctw-jump="ctw-region-${i}"
              aria-label="${escape(
                row.title || "지역 " + (i+1)
              )}">

              ${i+1}

            </button>
          `;
        }
      ).join("");


      addSection(

        "map",
        "세계 지도",
        "WORLD MAP",

        `<div class="ctw-map">
          ${imageHTML(map,"세계 지도")}
          ${pins}
        </div>`
      );
    }


    /* ========================================
       REGIONS
    ======================================== */

    if (regions.length) {

      addSection(

        "regions",
        "지역 및 장소",
        "REGIONS & LOCATIONS",

        `<div class="ctw-grid">

          ${regions.map(
            (row,i) => cardHTML(
              row,
              "ctw-region-" + i
            )
          ).join("")}

        </div>`
      );
    }


    /* ========================================
       HISTORY TIMELINE
    ======================================== */

    const history = list(d.history)
      .filter(validRow);

    if (history.length) {

      addSection(

        "history",
        "세계의 역사",
        "CHRONOLOGY",

        `<div class="ctw-timeline">

          ${history.map(row => `

            <div class="ctw-event">

              ${row.label
                ? `<span class="ctw-date">
                     ${escape(row.label)}
                   </span>`
                : ""}

              ${cardHTML({
                ...row,
                label: ""
              })}

            </div>

          `).join("")}

        </div>`
      );
    }


    /* ========================================
       FACTIONS / RULES / LORE / GALLERY
    ======================================== */

    for (const def of groups) {

      if (
        ![
          "factions",
          "rules",
          "lore",
          "gallery",
          "custom"
        ].includes(def.key)
      ) continue;


      const rows = list(d[def.key])
        .filter(validRow);

      if (!rows.length) continue;


      addSection(

        def.key,
        def.title,
        def.en,

        `<div class="ctw-grid">

          ${rows.map(
            row => cardHTML(row)
          ).join("")}

        </div>`
      );
    }


    /* ========================================
       RELATED CHARACTERS
    ======================================== */

    const ids = Array.isArray(d.characterIds)
      ? d.characterIds
      : [];

    const records =
      typeof characters !== "undefined" &&
      Array.isArray(characters)

        ? characters.filter(
            c => ids.includes(c.id)
          )

        : [];


    if (records.length) {

      addSection(

        "characters",
        "관련 캐릭터",
        "RELATED CHARACTERS",

        `<div class="ctw-character-grid">

          ${records.map(c => `

            <button
              type="button"
              class="ctw-character"
              data-ctw-character="${escape(c.id)}">

              ${imageHTML(c.image,c.title)}

              <span>
                ${escape(c.title)} ▶
              </span>

            </button>

          `).join("")}

        </div>`
      );
    }


    /* ========================================
       SPOILER / CLASSIFIED RECORDS
    ======================================== */

    const secrets = list(d.secrets)
      .filter(validRow);

    if (secrets.length) {

      addSection(

        "secrets",
        "기밀 기록",
        "CLASSIFIED RECORDS",

        secrets.map((row,i) => `

          <details class="ctw-secret">

            <summary>
              🔒 기밀 기록
              ${String(i+1).padStart(2,"0")}
              · 스포일러 주의
            </summary>

            ${cardHTML(row)}

          </details>

        `).join("")
      );
    }


    /* 등록되지 않은 부분은 생성하지 않음 */

    atlas.innerHTML = `

      ${meta
        ? `<div class="ctw-meta">${meta}</div>`
        : ""}

      ${lastAdmin
        ? `<button type="button"
             class="ctw-admin"
             id="ctw-open-editor">
             + 세계관 상세 설정
           </button>`
        : ""}

      ${navigation.length

        ? `<nav class="ctw-nav"
             aria-label="세계관 목차">

            ${navigation.map(n => `
              <button
                type="button"
                data-ctw-jump="ctw-${escape(n.key)}">

                ${escape(n.title)}

              </button>
            `).join("")}

           </nav>`

        : ""}

      ${parts.join("")}

    `;


    atlas.hidden = !(
      meta ||
      parts.length ||
      lastAdmin
    );


    /* ========================================
       SCROLL REVEAL
    ======================================== */

    if (
      !reduce.matches &&
      "IntersectionObserver" in window
    ) {

      revealObserver =
        new IntersectionObserver(

          entries => {

            for (const entry of entries) {

              if (!entry.isIntersecting) {
                continue;
              }

              entry.target.classList.add(
                "ctw-in"
              );

              revealObserver.unobserve(
                entry.target
              );
            }
          },

          {
            root: viewer,
            threshold: .06
          }
        );


      atlas.querySelectorAll(
        ".ctw-section"
      ).forEach(section => {

        section.classList.add(
          "ctw-wait"
        );

        revealObserver.observe(section);
      });
    }
  }


  /* ========================================
     WORLD NAVIGATION
  ======================================== */

  atlas.addEventListener(
    "click",

    e => {

      const jump = e.target.closest(
        "[data-ctw-jump]"
      );

      if (jump) {

        const target = $(
          jump.dataset.ctwJump
        );

        if (!target) return;


        target.scrollIntoView({

          behavior: reduce.matches
            ? "auto"
            : "smooth",

          block: "start"
        });


        target.classList.remove(
          "ctw-highlight"
        );

        void target.offsetWidth;

        target.classList.add(
          "ctw-highlight"
        );

        return;
      }


      const char = e.target.closest(
        "[data-ctw-character]"
      );


      if (char) {

        const index = characters.findIndex(
          c => c.id === char.dataset.ctwCharacter
        );

        if (index < 0) return;


        /*
          기존 상세창을 그대로 사용.
          캐릭터의 디자인이나 기능은 변경하지 않음.
        */

        if (
          typeof renderViewer === "function" &&
          typeof vKind !== "undefined"
        ) {

          vKind = "character";
          vList = characters;
          vIdx = index;

          renderViewer();

          renderWorld(true);

        } else {

          openViewer("character",index);
        }

        return;
      }


      if (
        e.target.closest("#ctw-open-editor")
      ) {

        const item = currentWorld();

        if (item && admin()) {
          editWorld(item);
        }
      }
    }
  );


  /* ========================================
     ADMIN EDITOR IMAGE INPUT
  ======================================== */

  function imageInput(src = "") {

    return `
      <div class="ctw-editor-image">

        ${imageHTML(src)}

        <input
          type="hidden"
          data-image-current
          value="${escape(src)}">

        <label>
          이미지 등록 / 교체
          <input
            type="file"
            accept="image/*"
            data-image-file>
        </label>

        ${src
          ? `<label class="ctw-check">
               <input
                 type="checkbox"
                 data-image-clear>
               기존 이미지 제거
             </label>`
          : ""}

      </div>
    `;
  }


  /* ========================================
     EDITOR ROW GENERATION
  ======================================== */

  function addEditorRow(
    container,
    def,
    row = {}
  ) {

    const element = document.createElement(
      "div"
    );

    element.className = "ctw-editor-row";

    element.innerHTML = `

      <label>

        ${def.key === "facts"
          ? "정보 항목"
          : "제목 또는 이름"}

        <input
          type="text"
          data-field="title"
          maxlength="120"
          value="${escape(row.title)}">

      </label>


      ${def.label

        ? `<label>

             ${escape(def.label)}

             <input
               type="text"
               maxlength="120"
               data-field="label"
               value="${escape(row.label)}">

           </label>`

        : ""}


      <label>
        설명 및 내용

        <textarea
          data-field="text"
          maxlength="3000"
          rows="4">${escape(row.text)}</textarea>

      </label>


      ${def.coordinates

        ? `<div class="ctw-coordinate">

             <label>
               지도 가로 위치 (%)
               <input type="number"
                 data-field="x"
                 min="0" max="100"
                 step=".1"
                 value="${escape(row.x)}">
             </label>

             <label>
               지도 세로 위치 (%)
               <input type="number"
                 data-field="y"
                 min="0" max="100"
                 step=".1"
                 value="${escape(row.y)}">
             </label>

           </div>

           <small class="ctw-editor-help">
             왼쪽 위가 0,0이며
             오른쪽 아래가 100,100이에요.
             비워 두면 지도 핀은 표시되지 않아요.
           </small>`

        : ""}


      ${def.image
        ? imageInput(row.image || "")
        : ""}


      <button
        type="button"
        class="ctw-editor-remove">

        이 항목 제거

      </button>

    `;


    element.querySelector(
      ".ctw-editor-remove"
    ).onclick = () => {

      element.remove();
    };


    container.append(element);
  }


  /* ========================================
     WORLD ADMIN SETTINGS
  ======================================== */

  function editWorld(item) {

    if (!admin()) return;

    const d = item.worldDetails || {};


    openModal(`

      <h3>세계관 상세 설정</h3>

      <p class="ctw-editor-help">

        등록한 내용만 상세 페이지에 표시돼요.
        비어 있는 항목은 자동으로 생략돼요.

      </p>


      <form id="ctw-editor">

        <fieldset id="ctw-fields">

          <legend>세계관 기본 설정</legend>

          <label>
            이름 아래 캐치프레이즈
            <textarea
              name="tagline"
              maxlength="250"
              rows="2">${escape(d.tagline)}</textarea>
          </label>

          <label>
            장르
            <input name="genre"
              maxlength="120"
              value="${escape(d.genre)}">
          </label>

          <label>
            시대 또는 배경
            <input name="era"
              maxlength="120"
              value="${escape(d.era)}">
          </label>


          <details>

            <summary>
              세계 지도
            </summary>

            <div class="ctw-editor-inner"
              id="ctw-map-editor">

              ${imageInput(d.mapImage || "")}

              <small class="ctw-editor-help">
                지도는 가로형 원본을 권장해요.
                지역 및 장소에서 핀의 좌표를 지정할 수 있어요.
              </small>

            </div>

          </details>


          ${groups.map(def => `

            <details>

              <summary>
                ${escape(def.title)}
              </summary>

              <div class="ctw-editor-inner">

                <div data-group="${def.key}"></div>

                <button
                  type="button"
                  class="ctw-editor-add"
                  data-add="${def.key}">

                  + 항목 추가

                </button>

              </div>

            </details>

          `).join("")}


          <details>

            <summary>
              관련 캐릭터
            </summary>

            <div class="ctw-editor-inner">

              ${characters.length

                ? characters.map(c => `

                    <label class="ctw-check">

                      <input
                        type="checkbox"
                        name="ctw-char"
                        value="${escape(c.id)}"

                        ${
                          Array.isArray(d.characterIds) &&
                          d.characterIds.includes(c.id)

                            ? "checked"

                            : ""
                        }>

                      ${escape(c.title)}

                    </label>

                  `).join("")

                : "<p>등록된 캐릭터가 없어요.</p>"
              }

            </div>

          </details>

        </fieldset>


        <p class="msg"
          role="status"></p>

        <div class="row">

          <button type="button"
            data-close>
            취소
          </button>

          <button class="primary"
            type="submit">
            세계관 저장
          </button>

        </div>

      </form>

    `);


    const form = $("ctw-editor");

    if (!form) return;

    const fields = $("ctw-fields");

    const submit = form.querySelector(
      '[type="submit"]'
    );

    const cancel = form.querySelector(
      "[data-close]"
    );

    const msg = form.querySelector(".msg");


    /* 기존 데이터 복원 */

    for (const def of groups) {

      const container = form.querySelector(
        `[data-group="${def.key}"]`
      );

      list(d[def.key]).forEach(row => {

        addEditorRow(
          container,
          def,
          row
        );
      });


      form.querySelector(
        `[data-add="${def.key}"]`
      ).onclick = () => {

        if (container.children.length >= 20) {

          alert(
            "한 분류에 최대 20개의 항목을 등록할 수 있어요."
          );

          return;
        }

        addEditorRow(
          container,
          def
        );
      };
    }


    /* ========================================
       SAVE WORLD SETTINGS
    ======================================== */

    form.onsubmit = async event => {

      event.preventDefault();

      if (
        submit.disabled ||
        !admin()
      ) return;


      submit.disabled = true;
      cancel.disabled = true;
      fields.disabled = true;


      const staged = [];


      /* 선택된 사진이 있을 경우에만 업로드 */

      async function readImage(root) {

        const box = root.querySelector(
          ".ctw-editor-image"
        );

        if (!box) return "";


        const file = box.querySelector(
          "[data-image-file]"
        )?.files[0];


        const old = box.querySelector(
          "[data-image-current]"
        )?.value || "";


        const clear = box.querySelector(
          "[data-image-clear]"
        )?.checked;


        if (file) {

          msg.textContent =
            "세계관 이미지 업로드 중... (" +
            (staged.length+1) +
            ")";


          const asset = await api({

            action: "addWorldAsset",

            ...(await prepareImage(file))
          });


          if (!asset.url) {
            throw new Error(
              "이미지 저장 주소를 받지 못했어요."
            );
          }


          staged.push(asset.url);

          return asset.url;
        }


        return clear ? "" : old;
      }


      try {

        const data = {

          genre: form.elements.genre.value,

          era: form.elements.era.value,

          tagline: form.elements.tagline.value,

          mapImage: await readImage(
            $("ctw-map-editor")
          ),

          characterIds: [
            ...form.querySelectorAll(
              'input[name="ctw-char"]:checked'
            )
          ].map(input => input.value)
        };


        for (const def of groups) {

          data[def.key] = [];

          const container =
            form.querySelector(
              `[data-group="${def.key}"]`
            );


          for (
            const row of container.children
          ) {

            const values = {};


            for (
              const input of row.querySelectorAll(
                "[data-field]"
              )
            ) {

              values[input.dataset.field] =
                input.value;
            }


            if (def.image) {

              values.image =
                await readImage(row);
            }


            if (validRow(values)) {

              data[def.key].push(
                values
              );
            }
          }
        }


        msg.textContent =
          "세계관 설정 저장 중...";


        const result = await api({

          action: "saveWorldDetails",

          kind: "worldview",

          id: item.id,

          worldDetails: data
        });


        /* 저장된 세계관 데이터 즉시 반영 */

        const i = worldviews.findIndex(
          world => world.id === item.id
        );


        if (i >= 0 && result.item) {

          worldviews[i] = result.item;

          renderArchive(
            worldviews,
            "worldview-list",
            "worldview",
            "WORLDVIEW"
          );
        }


        closeModal();


        if (
          currentWorld()?.id === item.id
        ) {

          if (
            typeof renderViewer === "function"
          ) {

            renderViewer();
          }

          renderWorld(true);
        }


      } catch (error) {

        /*
          저장에 실패하면 신규 업로드 파일도 정리.
          다른 데이터가 사용하는 이미지에는 영향 없음.
        */

        for (
          let i = 0;
          i < staged.length;
          i += 20
        ) {

          try {

            await api({

              action: "discardWorldAssets",

              urls: staged.slice(i,i+20)
            });

          } catch {}
        }


        msg.textContent =
          error.message ||
          "세계관을 저장하지 못했어요.";


      } finally {

        submit.disabled = false;
        cancel.disabled = false;
        fields.disabled = false;
      }
    };
  }


  /* ========================================
     EXISTING VIEWER SYNCHRONIZATION
  ======================================== */

  let scheduled = false;


  function schedule() {

    if (scheduled) return;

    scheduled = true;


    requestAnimationFrame(() => {

      scheduled = false;

      renderWorld();
    });
  }


  const observer =
    new MutationObserver(schedule);


  observer.observe(viewer,{

    attributes: true,

    attributeFilter: [
      "class",
      "data-kind"
    ]
  });


  if ($("v-thumbs")) {

    observer.observe(
      $("v-thumbs"),
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"]
      }
    );
  }


  if ($("v-name")) {

    observer.observe(
      $("v-name"),
      {
        childList: true,
        subtree: true
      }
    );
  }


  observer.observe(
    document.body,
    {
      attributes: true,
      attributeFilter: ["class"]
    }
  );


  renderWorld();

})();

/* ========================================
   CARDIUM 3D WORLD ATLAS
======================================== */

;(() => {
  "use strict";

  const viewer = document.getElementById("viewer");

  if (!viewer) return;

  function syncAtlasLink() {

    const existing = document.getElementById(
      "ct-cardium-atlas"
    );

    const name = (
      document.getElementById("v-name")
        ?.textContent || ""
    ).trim();

    const isCardium =
      /카르디움|CARDIUM|\bAMC\b/i.test(name);

    const visible =
      viewer.classList.contains("open") &&
      viewer.dataset.kind === "worldview" &&
      isCardium;

    if (!visible) {
      existing?.remove();
      return;
    }

    const container =
      document.getElementById("ctw-atlas") ||
      viewer.querySelector(".v-info");

    if (!container) return;

    if (existing) {
      if (existing.parentElement !== container) {
        container.prepend(existing);
      }
      return;
    }

    const link = document.createElement("a");

    link.id = "ct-cardium-atlas";
    link.className = "ct-cardium-atlas";

    link.href = "/Cardium_3D_Atlas.html";
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    link.innerHTML = `
      <small>CARDIUM · INTERACTIVE ATLAS</small>
      <strong>3D 세계지도</strong>
      <span>카르디움의 다섯 구역을 탐험하세요.</span>
      <b>EXPLORE WORLD ▶</b>
    `;

    container.prepend(link);
  }

  new MutationObserver(syncAtlasLink)
    .observe(viewer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-kind"]
    });

  syncAtlasLink();

})();
