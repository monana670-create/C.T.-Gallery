/* C.T. GALLERY — SIGNATURE UI EXTENSION */

(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  const hero = document.querySelector(".hero");
  const header = document.querySelector(".header");
  const art = $("hero-art");
  const viewer = $("viewer");

  let fromSpotlight = false;

  /* ========================================
     HOME CHARACTER SPOTLIGHT
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
        return new URL(value, location.href).href;
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

    let last = null;

    function syncFeature() {
      const {
        imgs,
        im,
        records,
        recordIndex
      } = current();

      panel.hidden =
        !im || recordIndex < 0;

      if (panel.hidden) return;

      name.textContent =
        records[recordIndex]?.title ||
        "CHARACTER";

      name.setAttribute(
        "aria-label",
        name.textContent + " 프로필 열기"
      );

      index.textContent =
        `${String(imgs.indexOf(im) + 1).padStart(2,"0")}/${String(imgs.length).padStart(2,"0")}`;

      steps.forEach(b => {
        b.disabled = imgs.length < 2;
      });

      if (last !== im) {
        panel.classList.remove(
          "ct-feature-changed"
        );

        if (!reduce.matches) {
          void panel.offsetWidth;

          panel.classList.add(
            "ct-feature-changed"
          );
        }

        last = im;
      }
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

        imgs.forEach((img, i) => {
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

    /* ========================================
       HOME SCROLL GUIDE
    ======================================== */

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

    /* ========================================
       HOME ENTRANCE ANIMATION
    ======================================== */

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

    if (intro && !enter()) {
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
        `${fmt(active + 1)} / ${fmt(all.length)}`;

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
       CINEMATIC CHARACTER IMAGE REVEAL
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
     SCROLL PROGRESS / PARALLAX
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
        "[data-target], #stk-work"
      )
    ) {
      setTimeout(scheduleScroll,750);
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
     SCROLL REVEAL ANIMATIONS
  ======================================== */

  if (
    "IntersectionObserver" in window &&
    !reduce.matches
  ) {
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          entry.target.classList.add("ct-in");

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
     SIGNATURE SOUND SYSTEM
     NO EXTERNAL AUDIO FILES
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

        master.connect(context.destination);
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
     SOUND ON / OFF BUTTON
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
          ".hb,.nav-btn,.mobile-nav-btn,.stk,.add-btn,.v-arr,.ct-feature-controls button,.primary,.primary-btn,.pagination button,.menu-toggle,.ct-spot-open"
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
