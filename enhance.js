/* C.T. GALLERY — SIGNATURE UI EXTENSION */

(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const reduce = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const hero = document.querySelector(".hero");
  const header = document.querySelector(".header");
  const art = $("hero-art");
  const viewer = $("viewer");

  let fromSpotlight = false;

  /* ========================================
     THREE SHOOTING STARS
  ======================================== */

  if (
    hero &&
    !hero.querySelector(".ct-meteors")
  ) {
    const meteors = document.createElement("div");

    meteors.className = "ct-meteors";

    meteors.setAttribute(
      "aria-hidden",
      "true"
    );

    for (let i = 0; i < 3; i++) {
      const meteor = document.createElement("i");

      meteor.className = "ct-meteor";

      meteors.append(meteor);
    }

    hero.append(meteors);
  }

  /* ========================================
     HOME CHARACTER SPOTLIGHT AND VOICE
  ======================================== */

  if (hero && art) {
    const panel = document.createElement("aside");

    panel.className = "ct-spotlight";
    panel.hidden = true;

    panel.setAttribute(
      "aria-label",
      "현재 전시 캐릭터"
    );

    panel.innerHTML = `
      <div class="ct-feature-top">
        <span>ON DISPLAY</span>
        <span class="ct-spot-index">00/00</span>
      </div>

      <button type="button" class="ct-spot-name">
        CHARACTER
      </button>

      <div class="ct-feature-controls">
        <button
          type="button"
          data-ct-step="-1"
          aria-label="이전 홈 캐릭터">
          ‹
        </button>

        <button
          type="button"
          data-ct-step="1"
          aria-label="다음 홈 캐릭터">
          ›
        </button>

        <button type="button" class="ct-spot-open">
          PROFILE ▶
        </button>
      </div>
    `;

    hero.append(panel);

    const dialogue = document.createElement("aside");

    dialogue.className = "ct-dialogue";
    dialogue.hidden = true;

    dialogue.setAttribute(
      "aria-label",
      "캐릭터 한마디"
    );

    hero.append(dialogue);

    const name = panel.querySelector(".ct-spot-name");
    const index = panel.querySelector(".ct-spot-index");
    const steps = panel.querySelectorAll("[data-ct-step]");

    const getImages = () => [
      ...art.querySelectorAll("img")
    ];

    const getRecords = () =>
      typeof characters !== "undefined" &&
      Array.isArray(characters)
        ? characters
        : [];

    const asURL = value => {
      try {
        return new URL(
          value,
          location.href
        ).href;

      } catch {
        return "";
      }
    };

    const current = () => {
      const imgs = getImages();

      const im =
        art.querySelector("img.on") ||
        imgs[0];

      const records = getRecords();

      const recordIndex = im
        ? records.findIndex(r =>
            r?.image &&
            asURL(r.image) === im.src
          )
        : -1;

      return {
        imgs,
        im,
        records,
        recordIndex
      };
    };

    let lastImage = null;
    let lastVoiceKey = "";

    /* ========================================
       CALENDAR VOICE ANIMATION
    ======================================== */

    function syncDialogue(
      record,
      recordIndex,
      image
    ) {
      const title = String(
        record.title || "CHARACTER"
      );

      const text =
        String(
          record.description || ""
        ).trim() ||
        "아직 등록된 대사가 없어요.";

      const key = JSON.stringify([
        recordIndex,
        image.src,
        title,
        text
      ]);

      if (key === lastVoiceKey) return;

      lastVoiceKey = key;

      const old = dialogue.querySelector(
        ".ct-voice-paper:not(.ct-page-out)"
      );

      const fresh = document.createElement("div");

      fresh.className = "ct-voice-paper";

      fresh.classList.toggle(
        "ct-long-voice",
        Array.from(text).length > 42 ||
        /\n/.test(text)
      );

      fresh.innerHTML = `
        <div class="ct-voice-head">
          <span>CHARACTER VOICE</span>
          <span class="ct-voice-number"></span>
        </div>

        <p class="ct-voice-text"></p>

        <div class="ct-voice-name"></div>
      `;

      fresh.querySelector(
        ".ct-voice-number"
      ).textContent =
        String(recordIndex + 1)
          .padStart(2,"0");

      fresh.querySelector(
        ".ct-voice-text"
      ).textContent = text;

      fresh.querySelector(
        ".ct-voice-name"
      ).textContent = "— " + title;

      dialogue.replaceChildren(fresh);

      dialogue.hidden = false;

      hero.classList.add(
        "ct-dialogue-ready"
      );

      if (old && !reduce.matches) {
        old.classList.remove(
          "ct-page-in"
        );

        old.classList.add(
          "ct-page-out"
        );

        old.setAttribute(
          "aria-hidden",
          "true"
        );

        fresh.classList.add(
          "ct-page-in"
        );

        dialogue.append(old);

        old.addEventListener(
          "animationend",
          () => old.remove(),
          { once: true }
        );

        setTimeout(
          () => old.remove(),
          900
        );
      }
    }

    /* ========================================
       CHARACTER SYNCHRONIZATION
    ======================================== */

    function syncFeature() {
      const {
        imgs,
        im,
        records,
        recordIndex
      } = current();

      panel.hidden =
        !im || recordIndex < 0;

      if (panel.hidden) {
        dialogue.hidden = true;

        dialogue.replaceChildren();

        hero.classList.remove(
          "ct-dialogue-ready"
        );

        lastImage = null;
        lastVoiceKey = "";

        return;
      }

      const record = records[recordIndex];

      name.textContent =
        record?.title ||
        "CHARACTER";

      name.setAttribute(
        "aria-label",
        name.textContent + " 프로필 열기"
      );

      index.textContent =
        `${String(imgs.indexOf(im)+1).padStart(2,"0")}/${String(imgs.length).padStart(2,"0")}`;

      steps.forEach(b => {
        b.disabled = imgs.length < 2;
      });

      if (lastImage !== im) {
        panel.classList.remove(
          "ct-feature-changed"
        );

        if (!reduce.matches) {
          void panel.offsetWidth;

          panel.classList.add(
            "ct-feature-changed"
          );
        }

        lastImage = im;
      }

      syncDialogue(
        record,
        recordIndex,
        im
      );
    }

    function openFeature() {
      const { recordIndex } = current();

      if (
        recordIndex >= 0 &&
        typeof openViewer === "function"
      ) {
        fromSpotlight = true;

        openViewer(
          "character",
          recordIndex
        );

        if ($("v-back")) {
          $("v-back").textContent =
            "홈으로 ▶";
        }
      }
    }

    name.onclick = openFeature;

    panel.querySelector(
      ".ct-spot-open"
    ).onclick = openFeature;

    steps.forEach(b => {
      b.onclick = () => {
        const { imgs, im } = current();

        if (imgs.length < 2) return;

        const next =
          (
            imgs.indexOf(im) +
            Number(b.dataset.ctStep) +
            imgs.length
          ) % imgs.length;

        imgs.forEach((img,i) => {
          img.classList.toggle(
            "on",
            i === next
          );
        });

        syncFeature();
      };
    });

    new MutationObserver(syncFeature)
      .observe(art, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "class",
          "src"
        ]
      });

    syncFeature();
  }

  /* ========================================
     SCROLL GUIDE AND INTRO
  ======================================== */

  if (hero) {
    const hint = document.createElement("button");

    hint.type = "button";
    hint.className = "ct-scroll-hint";

    hint.innerHTML = `
      SCROLL TO EXPLORE
      <span aria-hidden="true">↓</span>
    `;

    hint.onclick = () => {
      const target =
        $("m-head") &&
        !$("m-head").hidden
          ? $("m-head")
          : document.querySelector("footer");

      target?.scrollIntoView({
        behavior: reduce.matches
          ? "instant"
          : "smooth",

        block: "start"
      });
    };

    hero.append(hint);

    const intro = $("intro");

    const enter = () => {
      if (
        !intro ||
        intro.classList.contains("done")
      ) {
        hero.classList.add(
          "ct-hero-ready"
        );

        return true;
      }

      return false;
    };

    if (!enter() && intro) {
      const watcher = new MutationObserver(() => {
        if (enter()) {
          watcher.disconnect();
        }
      });

      watcher.observe(intro, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }
  }

  /* ========================================
     CHARACTER / WORLD ARCHIVE NUMBER
  ======================================== */

  if (
    viewer &&
    $("v-name") &&
    viewer.querySelector(".v-head")
  ) {
    const meta = document.createElement("div");

    meta.className = "ct-view-meta";

    meta.innerHTML = `
      <small>ARCHIVE RECORD</small>
      <strong>00 / 00</strong>
    `;

    viewer.querySelector(".v-head")
      .prepend(meta);

    const thumbs = $("v-thumbs");

    const syncRecord = () => {
      const all = thumbs
        ? [...thumbs.querySelectorAll(".v-th")]
        : [];

      const active = all.findIndex(b =>
        b.classList.contains("on")
      );

      const fmt = n =>
        String(n).padStart(2,"0");

      meta.querySelector("small").textContent =
        viewer.dataset.kind === "worldview"
          ? "WORLD RECORD"
          : "CHARACTER RECORD";

      meta.querySelector("strong").textContent =
        `${fmt(active+1)} / ${fmt(all.length)}`;

      if (
        fromSpotlight &&
        $("v-back")
      ) {
        $("v-back").textContent =
          "홈으로 ▶";
      }
    };

    if (thumbs) {
      new MutationObserver(syncRecord)
        .observe(thumbs, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class"]
        });
    }

    syncRecord();

    new MutationObserver(() => {
      if (!viewer.classList.contains("open")) {
        fromSpotlight = false;
      }
    }).observe(viewer, {
      attributes: true,
      attributeFilter: ["class"]
    });

    /* ========================================
       CINEMATIC IMAGE REVEAL
    ======================================== */

    const image = $("v-img");

    if (
      image &&
      typeof image.animate === "function"
    ) {
      let previous = "";
      let animation;

      const revealArt = () => {
        if (!viewer.classList.contains("open")) {
          previous = "";
          return;
        }

        if (
          reduce.matches ||
          !image.complete ||
          !image.naturalWidth ||
          previous === image.src
        ) return;

        previous = image.src;

        animation?.cancel();

        const world =
          viewer.dataset.kind === "worldview";

        animation = image.animate([
          {
            clipPath: world
              ? "inset(0 100% 0 0)"
              : "inset(0 0 100% 0)",

            transform:
              "translate3d(12px,0,0) scale(.985)"
          },

          {
            clipPath: "inset(0)",
            transform: "none"
          }

        ], {
          duration: 620,
          easing: "cubic-bezier(.16,1,.3,1)"
        });
      };

      image.addEventListener(
        "load",
        revealArt
      );

      const watch =
        new MutationObserver(revealArt);

      watch.observe(viewer, {
        attributes: true,
        attributeFilter: ["class"]
      });

      watch.observe(image, {
        attributes: true,
        attributeFilter: ["src"]
      });
    }
  }

  /* ========================================
     SCROLL PROGRESS AND PARALLAX
  ======================================== */

  let scheduled = false;

  function updateScroll() {
    scheduled = false;

    const root = document.documentElement;

    const range =
      root.scrollHeight -
      window.innerHeight;

    const progress = range > 0
      ? Math.max(
          0,
          Math.min(
            1,
            window.scrollY / range
          )
        )
      : 0;

    header?.style.setProperty(
      "--ct-progress",
      progress.toFixed(4)
    );

    if (hero) {
      const visible =
        hero.getClientRects().length > 0;

      const motion =
        !reduce.matches && visible
          ? Math.max(
              0,
              Math.min(
                22,
                -hero.getBoundingClientRect().top * .15
              )
            )
          : 0;

      hero.style.setProperty(
        "--ct-parallax",
        `${motion}px`
      );
    }
  }

  function scheduleScroll() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(updateScroll);
  }

  addEventListener(
    "scroll",
    scheduleScroll,
    { passive: true }
  );

  addEventListener(
    "resize",
    scheduleScroll,
    { passive: true }
  );

  document.addEventListener("click", e => {
    if (
      e.target.closest?.(
        "[data-target],#stk-work"
      )
    ) {
      setTimeout(
        scheduleScroll,
        750
      );
    }
  });

  if (
    "ResizeObserver" in window &&
    document.querySelector("main")
  ) {
    new ResizeObserver(scheduleScroll)
      .observe(
        document.querySelector("main")
      );
  }

  scheduleScroll();

  /* ========================================
     SCROLL REVEAL
  ======================================== */

  if (
    "IntersectionObserver" in window &&
    !reduce.matches
  ) {
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          entry.target.classList.add(
            "ct-in"
          );

          io.unobserve(entry.target);
        }
      },
      {
        threshold: .06
      }
    );

    document.querySelectorAll(
      ".page-header, .content-section > .section-title"
    ).forEach(el => {
      el.classList.add("ct-reveal");

      io.observe(el);
    });
  }

  /* ========================================
     SIGNATURE BUTTON SOUND SYSTEM
  ======================================== */

  let soundOn = true;

  try {
    soundOn =
      localStorage.getItem("ctButtonSound") !== "off";
  } catch {}

  let context;
  let master;
  let lastSound = 0;
  let soundGeneration = 0;

  const tones = {
    soft: [
      [740,0,.09,.07],
      [988,.045,.10,.038]
    ],

    menu: [
      [622,0,.11,.075],
      [831,.052,.14,.05],
      [1109,.10,.13,.024]
    ],

    open: [
      [659,0,.15,.07],
      [988,.045,.16,.05],
      [1319,.095,.19,.035]
    ],

    close: [
      [784,0,.10,.065],
      [523,.045,.12,.04]
    ],

    step: [
      [880,0,.075,.062],
      [1175,.035,.09,.025]
    ],

    admin: [
      [523,0,.12,.06],
      [784,.06,.13,.045]
    ],

    danger: [
      [440,0,.13,.052],
      [330,.06,.15,.036]
    ],

    confirm: [
      [740,0,.12,.06],
      [932,.055,.14,.046],
      [1245,.105,.16,.035]
    ]
  };

  function tone(
    freq,
    when,
    length,
    amp
  ) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "sine";

    osc.frequency.setValueAtTime(
      freq,
      when
    );

    gain.gain.setValueAtTime(
      .0001,
      when
    );

    gain.gain.exponentialRampToValueAtTime(
      amp,
      when + .008
    );

    gain.gain.exponentialRampToValueAtTime(
      .0001,
      when + length
    );

    osc.connect(gain);
    gain.connect(master);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    osc.start(when);

    osc.stop(
      when + length + .015
    );
  }

  function play(type = "soft") {
    if (
      !soundOn ||
      performance.now() - lastSound < 45
    ) return;

    lastSound = performance.now();

    const generation = ++soundGeneration;

    try {
      const AC =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AC) return;

      if (
        !context ||
        context.state === "closed"
      ) {
        context = new AC();

        master = context.createGain();

        master.gain.value = .55;

        master.connect(
          context.destination
        );
      }

      const render = () => {
        if (
          !soundOn ||
          generation !== soundGeneration ||
          context.state !== "running"
        ) return;

        const t =
          context.currentTime + .005;

        (tones[type] || tones.soft)
          .forEach(([f,d,l,a]) => {
            tone(
              f,
              t + d,
              l,
              a
            );
          });
      };

      if (context.state === "running") {
        render();

      } else {
        context.resume()
          .then(render)
          .catch(() => {});
      }

    } catch {}
  }

  /* ========================================
     SOUND ON / OFF
  ======================================== */

  if (header && !$("ct-sound")) {
    const toggle =
      document.createElement("button");

    toggle.id = "ct-sound";
    toggle.type = "button";
    toggle.className = "ct-sound";

    const syncSound = () => {
      toggle.textContent =
        soundOn
          ? "♪ ON"
          : "♪ OFF";

      toggle.setAttribute(
        "aria-label",
        "버튼 효과음"
      );

      toggle.setAttribute(
        "aria-pressed",
        String(soundOn)
      );

      if (master && context) {
        master.gain.cancelScheduledValues(
          context.currentTime
        );

        master.gain.setTargetAtTime(
          soundOn ? .55 : .0001,
          context.currentTime,
          .012
        );
      }
    };

    toggle.onclick = () => {
      soundOn = !soundOn;

      try {
        localStorage.setItem(
          "ctButtonSound",
          soundOn ? "on" : "off"
        );
      } catch {}

      syncSound();

      if (soundOn) {
        play("confirm");
      }
    };

    header.insertBefore(
      toggle,
      $("menu-toggle") || null
    );

    syncSound();
  }

  /* ========================================
     BUTTON SOUND CLASSIFICATION
  ======================================== */

  function kind(button) {
    if (
      button.matches(
        ".del,.cdel"
      )
    ) {
      return "danger";
    }

    if (
      button.matches(
        "#lightbox-close,#v-close,#v-back,[data-close]"
      )
    ) {
      return "close";
    }

    if (
      button.matches(
        ".pagination button,.v-arr,.v-th,[data-ct-step]"
      )
    ) {
      return "step";
    }

    if (
      button.matches(
        "#admin-toggle,.add-btn"
      )
    ) {
      return "admin";
    }

    if (
      button.matches(
        ".archive-card,.gallery-item,.m-item,.ct-spot-open,.ct-spot-name,.nt-head,.v-web"
      )
    ) {
      return "open";
    }

    if (
      button.matches(
        "[data-target],#stk-work,#menu-toggle,.logo"
      )
    ) {
      return "menu";
    }

    if (
      button.matches(
        ".primary,.primary-btn"
      )
    ) {
      return "confirm";
    }

    return "soft";
  }

  /* ========================================
     BUTTON INTERACTION ANIMATION
  ======================================== */

  document.addEventListener(
    "click",
    event => {
      if (
        !event.isTrusted ||
        event.defaultPrevented
      ) return;

      const button =
        event.target.closest?.(
          "button,a.v-web,a.logo"
        );

      if (
        !button ||
        button.disabled ||
        button.id === "start" ||
        button.id === "ct-sound"
      ) return;

      play(kind(button));

      if (
        !reduce.matches &&
        button.matches(
          ".hb,.nav-btn,.mobile-nav-btn,.stk,.add-btn,.v-arr,.ct-feature-controls button,.primary,.primary-btn,.pagination button,.menu-toggle,.ct-spot-open,.ct-scroll-hint"
        )
      ) {
        button.classList.remove(
          "ct-pressed"
        );

        void button.offsetWidth;

        button.classList.add(
          "ct-pressed"
        );
      }
    },
    true
  );

  document.addEventListener(
    "animationend",
    e => {
      if (e.animationName === "ct-click") {
        e.target.classList.remove(
          "ct-pressed"
        );
      }
    }
  );

})();

/* ========================================
   C.T. GALLERY
   ADMIN EDIT SYSTEM
======================================== */

(() => {
  "use strict";

  function isAdmin() {
    return document.body.classList.contains("admin") &&
      !!adminPw;
  }


  /* 공통 수정 창 */

  function editor(title, fields, fill, save) {
    if (!isAdmin()) return;

    openModal(`
      <h3>${title}</h3>

      <form id="ct-edit-form">
        ${fields}

        <p class="msg" role="status"></p>

        <div class="row">
          <button type="button" data-close>
            취소
          </button>

          <button class="primary" type="submit">
            변경사항 저장
          </button>
        </div>
      </form>
    `);

    const form = document.getElementById(
      "ct-edit-form"
    );

    const field = name =>
      form.elements.namedItem(name);

    const msg = form.querySelector(".msg");

    const submit =
      form.querySelector('[type="submit"]');

    const cancel =
      form.querySelector("[data-close]");

    fill(field);

    form.onsubmit = async e => {
      e.preventDefault();

      if (submit.disabled || !isAdmin()) return;

      submit.disabled = cancel.disabled = true;

      const status = text => {
        msg.textContent = text;
      };

      try {
        status("저장 준비 중...");

        await save(field, status);

        if (form.isConnected) closeModal();

      } catch (err) {
        if (form.isConnected) {
          status(err.message);
        } else {
          alert(err.message);
        }

      } finally {
        submit.disabled = cancel.disabled = false;
      }
    };
  }


  /* ========================================
     캐릭터 및 세계관 수정
  ======================================== */

  function editEntry(kind, item) {

    if (!item.id) {
      alert("이 항목은 수정할 수 있는 ID가 없어요.");
      return;
    }

    editor(
      kind === "character"
        ? "캐릭터 수정"
        : "세계관 수정",

      `
        <label>
          이름
          <input name="title"
            maxlength="60" required>
        </label>

        <label>
          한 줄 소개
          <input name="description"
            maxlength="120">
        </label>

        <label>
          자세한 설명
          <textarea name="body"
            rows="5"
            maxlength="5000"></textarea>
        </label>

        <label>
          포인트 색
          <input name="color" type="color">
        </label>

        <label>
          효과

          <select name="effect">
            <option value="none">없음</option>
            <option value="glow">은은한 빛</option>
            <option value="pulse">숨쉬는 빛</option>
            <option value="spin">회전하는 빛줄기</option>
          </select>
        </label>

        <label>
          대표 이미지 교체 (선택)

          <input name="image"
            type="file"
            accept="image/*">

          <small>
            선택하지 않으면 기존 이미지를 유지해요.
          </small>
        </label>

        <label>
          웹툰 링크

          <input name="webtoonUrl"
            type="url"
            maxlength="300">
        </label>

        <label>
          웹툰 이미지 교체 (선택)

          <input name="webtoonImage"
            type="file"
            accept="image/*">
        </label>

        <label class="ct-edit-check">
          <input name="clearWebtoon" type="checkbox">
          기존 웹툰 이미지 표시 제거
        </label>
      `,

      f => {
        f("title").value =
          item.title || "";

        f("description").value =
          item.description || "";

        f("body").value =
          item.body || "";

        f("color").value =
          okColor(item.color) || "#3fa9ff";

        f("effect").value =
          effects.includes(item.effect)
            ? item.effect
            : "none";

        f("webtoonUrl").value =
          item.webtoonUrl || "";
      },

      async (f, status) => {

        const payload = {
          action: "editEntry",
          kind,
          id: item.id,

          title: f("title").value,
          description: f("description").value,
          body: f("body").value,
          color: f("color").value,
          effect: f("effect").value,
          webtoonUrl: f("webtoonUrl").value
        };

        const image = f("image").files[0];
        const web = f("webtoonImage").files[0];
        const clear = f("clearWebtoon").checked;


        /* 대표 이미지 변경 */

        if (image) {
          status("대표 이미지 준비 중...");

          Object.assign(
            payload,
            await prepareImage(image)
          );
        }


        /* 웹툰 이미지 변경 */

        if (web) {
          status("웹툰 이미지 올리는 중...");

          const asset = await api({
            action: "addAsset",
            ...(await prepareImage(web))
          });

          payload.webtoonImage = asset.url;

        } else if (clear) {
          payload.webtoonImage = "";
        }


        /* 기존 항목 업데이트 */

        status("변경사항 저장 중...");

        const result = await api(payload);

        const list = kind === "character"
          ? characters
          : worldviews;

        const idx = list.findIndex(
          x => x.id === item.id
        );

        if (idx >= 0 && result.item) {

          list[idx] = result.item;

          renderArchive(
            list,

            kind === "character"
              ? "character-list"
              : "worldview-list",

            kind,

            kind === "character"
              ? "CHARACTER"
              : "WORLDVIEW"
          );

          if (kind === "character") {
            startHero();
          }

          updateStats();

        } else {
          await loadData();
        }
      }
    );
  }


  /* ========================================
     작품 교체용 이미지 변환
  ======================================== */

  async function prepareReplacement(file, name) {

    const ext = name.split(".").pop().toLowerCase();

    const mime = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif"
    }[ext];

    if (!mime) {
      throw new Error(
        "지원하지 않는 이미지 형식이에요."
      );
    }

    let blob;

    if (ext === "gif") {

      if (file.type !== "image/gif") {
        throw new Error(
          "기존 GIF 작품은 GIF 파일로 교체해 주세요."
        );
      }

      blob = file;

    } else {

      const bmp = await createImageBitmap(file);

      try {

        const scale = Math.min(
          1,
          1600 / Math.max(bmp.width, bmp.height)
        );

        const canvas =
          document.createElement("canvas");

        canvas.width = Math.max(
          1,
          Math.round(bmp.width * scale)
        );

        canvas.height = Math.max(
          1,
          Math.round(bmp.height * scale)
        );

        const ctx = canvas.getContext("2d");

        if (mime === "image/jpeg") {
          ctx.fillStyle = "#ffffff";

          ctx.fillRect(
            0, 0,
            canvas.width,
            canvas.height
          );
        }

        ctx.drawImage(
          bmp,
          0, 0,
          canvas.width,
          canvas.height
        );

        blob = await new Promise(resolve => {
          canvas.toBlob(resolve, mime, .85);
        });

      } finally {
        bmp.close();
      }
    }

    if (!blob || blob.type !== mime) {
      throw new Error(
        "이 브라우저에서 이미지 변환을 지원하지 않아요."
      );
    }

    if (blob.size > 2550000) {
      throw new Error(
        "이미지가 너무 커요. 더 작은 파일로 선택해 주세요."
      );
    }

    const image = await new Promise(
      (resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {
          resolve(
            String(reader.result).split(",")[1]
          );
        };

        reader.onerror = () => {
          reject(
            new Error("이미지를 읽지 못했어요.")
          );
        };

        reader.readAsDataURL(blob);
      }
    );

    return {
      image,
      imageType: mime
    };
  }


  /* ========================================
     작품 이미지 수정
  ======================================== */

  function editImage(file) {

    editor(
      "작품 이미지 교체",

      `
        <p>
          기존 작품의 파일명과 순서는 그대로 유지돼요.
        </p>

        <label>
          새 이미지

          <input name="image"
            type="file"
            accept="image/*"
            required>
        </label>
      `,

      () => {},

      async (f, status) => {

        status("이미지 준비 중...");

        const data = await prepareReplacement(
          f("image").files[0],
          file.name
        );

        status("작품 교체 중...");

        const result = await api({
          action: "replaceImage",
          name: file.name,
          ...data
        });

        ++galleryRequestId;

        const current = allImageFiles.find(
          x => x.name === file.name
        );

        if (current) {

          const url = new URL(
            result.url || current.download_url
          );

          if (!result.url) {
            url.searchParams.set(
              "v",
              Date.now()
            );
          }

          current.download_url = url.href;

          refreshGalleryView();

        } else {
          await loadGallery(false, true);
        }
      }
    );
  }


  /* ========================================
     공지 수정
  ======================================== */

  function editNotice(nt) {

    editor(
      "공지 수정",

      `
        <label>
          제목
          <input name="title"
            maxlength="80"
            required>
        </label>

        <label>
          내용

          <textarea name="body"
            rows="8"
            maxlength="3000"
            required></textarea>
        </label>
      `,

      f => {
        f("title").value = nt.title;
        f("body").value = nt.body;
      },

      async (f, status) => {

        status("공지 저장 중...");

        const result = await board({
          action: "editNotice",
          n: nt.n,

          title: f("title").value,
          body: f("body").value
        });

        const current = notices.find(
          x => x.n === nt.n
        );

        if (current) {

          current.title = result.title;
          current.body = result.body;

          renderNotices();
          updateStickers();

        } else {
          await loadNotices();
        }
      }
    );
  }


  /* ========================================
     관리자 수정 버튼 자동 생성
  ======================================== */

  function install() {

    const targets = [
      [
        "gallery",
        ".gi",

        () => allImageFiles.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
        ),

        editImage
      ],

      [
        "character-list",
        ".fxw",
        () => characters,
        item => editEntry("character", item)
      ],

      [
        "worldview-list",
        ".fxw",
        () => worldviews,
        item => editEntry("worldview", item)
      ],

      [
        "notices",
        ".nt",
        () => notices,
        editNotice
      ]
    ];

    for (const [id, selector, items, onEdit] of targets) {

      const root = document.getElementById(id);

      if (!root) continue;

      const mount = () => {

        const list = items();

        [...root.children]

          .filter(el => el.matches(selector))

          .forEach((wrap, i) => {

            const item = list[i];

            if (
              !item ||
              wrap.querySelector(".ct-edit-btn")
            ) return;

            const btn =
              document.createElement("button");

            btn.type = "button";
            btn.className = "ct-edit-btn";
            btn.textContent = "수정";

            btn.onclick = e => {
              e.stopPropagation();

              if (isAdmin()) {
                onEdit(item);
              }
            };

            wrap.appendChild(btn);
          });
      };

      new MutationObserver(mount).observe(
        root,
        { childList: true }
      );

      mount();
    }
  }


  /* 초기화 */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      install,
      { once: true }
    );
  } else {
    install();
  }

})();

/* ========================================
   C.T. GALLERY
   CINEMATIC HOME & WEBTOON READER
======================================== */

;(() => {

  "use strict";


  /* ========================================
     1. CINEMATIC AMBIENT BACKGROUND
  ======================================== */

  function initCinematic() {

    const hero = document.querySelector(".hero");

    const art = document.getElementById("hero-art");

    if (
      !hero ||
      !art ||
      hero.querySelector(".ct-ambient")
    ) return;


    const ambient = document.createElement("div");

    ambient.className = "ct-ambient";

    ambient.setAttribute(
      "aria-hidden",
      "true"
    );

    hero.prepend(ambient);


    let activeSrc = "";
    let generation = 0;


    function syncAmbient() {

      const active = art.querySelector("img.on");

      const src =
        active?.currentSrc ||
        active?.src ||
        "";

      if (src === activeSrc) return;

      activeSrc = src;

      const ticket = ++generation;


      if (!src) {
        ambient.replaceChildren();
        return;
      }


      ambient.querySelectorAll("img:not(.on)")
        .forEach(img => img.remove());


      const frame = new Image();

      frame.alt = "";
      frame.draggable = false;

      ambient.appendChild(frame);


      function show() {

        requestAnimationFrame(() => {

          if (
            ticket !== generation ||
            !frame.isConnected
          ) {
            frame.remove();
            return;
          }


          /* 이전 배경은 천천히 사라짐 */

          ambient.querySelectorAll("img.on")
            .forEach(old => {

              old.classList.remove("on");

              setTimeout(
                () => old.remove(),
                1450
              );
            });


          /* 새로운 배경 등장 */

          frame.classList.add("on");

        });
      }


      frame.addEventListener(
        "load",
        show,
        { once: true }
      );

      frame.addEventListener(
        "error",
        () => frame.remove(),
        { once: true }
      );

      frame.src = src;
    }


    /* 기존 캐릭터 전환과 자동 연동 */

    new MutationObserver(syncAmbient).observe(
      art,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "src"]
      }
    );

    syncAmbient();
  }


  /* ========================================
     2. WEBTOON READER
  ======================================== */

  function initWebtoon() {

    const viewer =
      document.getElementById("viewer");

    const stage =
      viewer?.querySelector(".v-stage");

    const preview =
      document.getElementById("v-web");

    const thumb =
      document.getElementById("v-web-img");

    const info =
      viewer?.querySelector(".v-info");

    const thumbs =
      document.getElementById("v-thumbs");


    if (
      !viewer ||
      !stage ||
      !preview ||
      !thumb ||
      !info ||
      viewer.querySelector(".ct-webtoon-reader")
    ) return;


    /* 웹툰 열람 화면 생성 */

    const reader = document.createElement("section");

    reader.className = "ct-webtoon-reader";

    reader.hidden = true;


    reader.innerHTML = `

      <header class="ct-reader-head">

        <span class="tag">
          WEBTOON ARCHIVE
        </span>

        <h2 id="ct-reader-title"
          tabindex="-1"></h2>

        <p>CHARACTER STORY</p>

      </header>


      <div class="ct-reader-content">

        <p class="ct-reader-status"
          role="status">

          이미지를 불러오는 중...

        </p>

        <img class="ct-reader-image"
          alt="웹툰 본문"
          hidden>

      </div>


      <div class="ct-reader-end">

        <span>— END OF RECORD —</span>

        <a class="ct-reader-external"
          target="_blank"
          rel="noopener noreferrer"
          hidden>

          외부 웹툰 링크 ▶

        </a>

        <button type="button"
          class="ct-reader-back">

          ◀ 캐릭터 상세창으로 돌아가기

        </button>

      </div>
    `;


    viewer.appendChild(reader);


    const title =
      reader.querySelector("#ct-reader-title");

    const status =
      reader.querySelector(".ct-reader-status");

    const image =
      reader.querySelector(".ct-reader-image");

    const external =
      reader.querySelector(".ct-reader-external");

    const back =
      reader.querySelector(".ct-reader-back");

    const label =
      preview.querySelector("span");


    let savedScroll = 0;
    let returnFocus = null;
    let readerHistory = false;
    let goingBack = false;


    /* 현재 캐릭터 데이터 */

    const current = () =>

      typeof vList !== "undefined"

        ? vList[vIdx]

        : null;


    /* 이미지 및 링크 주소 확인 */

    const safeUrl = value => {

      try {

        const raw =
          String(value || "").trim();

        if (!raw) return "";

        const url =
          new URL(raw, location.href);

        return /^https?:$/.test(url.protocol)

          ? url.href

          : "";

      } catch {

        return "";
      }
    };


    /* ========================================
       3. 캐릭터 상세창 복귀
    ======================================== */

    function restoreReader(focus = true) {

      if (reader.hidden) return;

      reader.hidden = true;
      stage.hidden = false;

      viewer.classList.remove(
        "ct-webtoon-reading"
      );

      viewer.setAttribute(
        "aria-labelledby",
        "v-name"
      );

      readerHistory = false;
      goingBack = false;

      image.hidden = true;
      image.removeAttribute("src");

      viewer.scrollTop = savedScroll;


      if (
        focus &&
        viewer.classList.contains("open")
      ) {

        (
          returnFocus?.isConnected
            ? returnFocus
            : preview
        )?.focus({
          preventScroll: true
        });
      }

      returnFocus = null;
    }


    /* ========================================
       4. 웹툰 미리보기 활성화
    ======================================== */

    function syncPreview() {

      if (!viewer.classList.contains("open")) {

        restoreReader(false);

        return;
      }


      const item = current();

      if (!item) return;


      const src =
        safeUrl(item.webtoonImage);

      const link =
        safeUrl(item.webtoonUrl);


      preview.classList.toggle(
        "ct-webtoon-preview",
        !!src
      );


      /* 이미지 또는 링크 중 하나만 있어도 표시 */

      preview.hidden = !src && !link;


      if (src) {

        preview.href = src;

        thumb.src = src;
        thumb.hidden = false;

        if (label) {
          label.textContent = "웹툰 열람하기 ▶";
        }

      } else {

        thumb.hidden = true;

        if (link) {

          preview.href = link;

        } else {

          preview.removeAttribute("href");
        }

        if (label) {
          label.textContent = "웹툰 바로가기 ▶";
        }
      }


      info.hidden =
        !item.description &&
        !item.body &&
        preview.hidden;
    }


    /* ========================================
       5. 웹툰 전체 열람
    ======================================== */

    function openReader(pushHistory = true) {

      if (
        !reader.hidden ||
        !viewer.classList.contains("open")
      ) return;


      const item = current();

      const src =
        safeUrl(item?.webtoonImage);

      if (!src) return;


      const link =
        safeUrl(item.webtoonUrl);


      savedScroll = viewer.scrollTop;

      returnFocus = document.activeElement;


      title.textContent =
        item.title || "웹툰";


      external.hidden = !link;

      if (link) {

        external.href = link;

      } else {

        external.removeAttribute("href");
      }


      status.hidden = false;

      status.textContent =
        "이미지를 불러오는 중...";

      image.hidden = true;


      /* 상세창 대신 웹툰 열람 화면 표시 */

      stage.hidden = true;

      reader.hidden = false;

      viewer.classList.add(
        "ct-webtoon-reading"
      );

      viewer.setAttribute(
        "aria-labelledby",
        "ct-reader-title"
      );


      /* 이미지 로딩 완료 */

      image.onload = () => {

        status.hidden = true;

        image.hidden = false;
      };


      image.onerror = () => {

        status.textContent =
          "웹툰 이미지를 불러오지 못했어요.";

        status.hidden = false;

        image.hidden = true;
      };


      image.src = src;


      /* 스마트폰 뒤로 가기 지원 */

      readerHistory = false;

      if (pushHistory) {

        try {

          history.pushState(
            {
              ...history.state,

              ctViewer: true,
              ctWebtoon: true
            },
            ""
          );

          readerHistory = true;

        } catch {}
      }


      viewer.scrollTop = 0;

      title.focus({
        preventScroll: true
      });
    }


    /* ========================================
       6. 돌아가기 버튼
    ======================================== */

    function goBack() {

      if (
        reader.hidden ||
        goingBack
      ) return;


      if (
        readerHistory &&
        history.state?.ctWebtoon
      ) {

        goingBack = true;

        history.back();

      } else {

        restoreReader();
      }
    }


    preview.addEventListener("click", e => {

      if (!safeUrl(current()?.webtoonImage)) {
        return;
      }

      if (
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) return;

      e.preventDefault();

      openReader();
    });


    back.addEventListener(
      "click",
      goBack
    );


    /* 브라우저 뒤로 가기 및 앞으로 가기 */

    window.addEventListener("popstate", e => {

      if (
        !reader.hidden &&
        readerHistory
      ) {

        e.stopImmediatePropagation();

        restoreReader();

      } else if (
        e.state?.ctWebtoon &&
        viewer.classList.contains("open")
      ) {

        e.stopImmediatePropagation();

        openReader(false);

        readerHistory = !reader.hidden;
      }

    }, true);


    /* ESC로 웹툰 닫기 */

    document.addEventListener("keydown", e => {

      if (reader.hidden) return;


      if (e.key === "Escape") {

        e.preventDefault();

        e.stopImmediatePropagation();

        goBack();

      } else if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {

        e.stopImmediatePropagation();
      }

    }, true);


    /* 기존 캐릭터 상세창과 자동 연동 */

    const observer =
      new MutationObserver(syncPreview);


    observer.observe(viewer, {

      attributes: true,

      attributeFilter: ["class"]
    });


    if (thumbs) {

      observer.observe(thumbs, {

        childList: true
      });
    }


    syncPreview();
  }


  /* ========================================
     INITIALIZATION
  ======================================== */

  function install() {

    initCinematic();

    initWebtoon();
  }


  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      install,
      { once: true }
    );

  } else {

    install();
  }

})();
