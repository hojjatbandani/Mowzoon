/* Mowzoon landing — small, dependency-free enhancements. Every page works
   without this file; it only adds motion and conveniences. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var lang = doc.lang === "ar" ? "ar" : "en";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function remember(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* Private mode or blocked storage: nothing to remember. */
    }
  }

  /* Header: solid once the page scrolls. */
  var header = $(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile navigation. */
  var toggle = $(".nav-toggle");
  var nav = $("#site-nav");
  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    $$("a", nav).forEach(function (link) {
      link.addEventListener("click", function () {
        setNav(false);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setNav(false);
    });
  }

  /* The language switch remembers the choice for the root page. */
  $$("[data-lang]").forEach(function (link) {
    link.addEventListener("click", function () {
      remember("mowzoon-lang", link.getAttribute("data-lang"));
    });
  });

  /* Reveal on scroll. */
  var revealables = $$("[data-reveal]");
  revealables.forEach(function (el) {
    var delay = el.getAttribute("data-delay");
    if (delay) el.style.setProperty("--delay", delay + "ms");
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );
    revealables.forEach(function (el) {
      revealer.observe(el);
    });
  }

  /* Count-up numbers ("266.35"), in the page's digits. */
  function format(value, decimals) {
    return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (isNaN(target)) return;
    if (reduceMotion) {
      el.textContent = format(target, decimals);
      return;
    }
    var start = null;
    var duration = 1600;
    function step(time) {
      if (start === null) start = time;
      var t = Math.min((time - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased, decimals);
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  var hero = $(".hero");
  if (hero) {
    window.requestAnimationFrame(function () {
      hero.classList.add("is-ready");
    });
  }
  window.setTimeout(function () {
    $$("[data-count]").forEach(countUp);
  }, 350);

  /* The hero phone and cards lean towards the pointer. */
  var visual = $(".hero-visual");
  if (visual && finePointer && !reduceMotion) {
    var phone = $(".hero-phone", visual);
    var cards = $$(".float-card", visual);
    var frame = null;
    visual.addEventListener("pointermove", function (event) {
      var rect = visual.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(function () {
        if (phone) phone.style.transform = "rotateY(" + x * 10 + "deg) rotateX(" + -y * 8 + "deg)";
        cards.forEach(function (card, i) {
          var depth = (i + 1) * 6;
          card.style.translate = x * depth + "px " + y * depth + "px";
        });
      });
    });
    visual.addEventListener("pointerleave", function () {
      if (phone) phone.style.transform = "";
      cards.forEach(function (card) {
        card.style.translate = "";
      });
    });
  }

  /* Feature cards: a soft light follows the pointer. */
  if (finePointer) {
    $$(".feature-card").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", event.clientX - rect.left + "px");
        card.style.setProperty("--my", event.clientY - rect.top + "px");
      });
    });
  }

  /* The AI chat plays once it comes into view: the message, typing, the
     reply, then the change it made. */
  var chat = $(".chat");
  if (chat) {
    var parts = $$(".bubble, .typing", chat);
    var play = function () {
      if (reduceMotion) {
        parts.forEach(function (p) {
          if (!p.classList.contains("typing")) p.classList.add("is-shown");
        });
        return;
      }
      var timeline = [
        [0, 0, true],
        [700, 1, true],
        [1900, 1, false],
        [1900, 2, true],
        [2900, 3, true],
      ];
      timeline.forEach(function (step) {
        window.setTimeout(function () {
          var part = parts[step[1]];
          if (part) part.classList.toggle("is-shown", step[2]);
        }, step[0]);
      });
    };
    if ("IntersectionObserver" in window) {
      var chatWatcher = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            play();
            chatWatcher.disconnect();
          }
        },
        { threshold: 0.4 }
      );
      chatWatcher.observe(chat);
    } else {
      play();
    }
  }

  /* The steps' joining line. */
  var steps = $(".steps");
  if (steps && "IntersectionObserver" in window && !reduceMotion) {
    var stepWatcher = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          steps.classList.add("is-visible");
          stepWatcher.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    stepWatcher.observe(steps);
  } else if (steps) {
    steps.classList.add("is-visible");
  }

  /* Screens gallery: arrows, and a gentle auto-advance that stops for good
     once the visitor takes over. */
  var track = $(".gallery-track");
  if (track) {
    var rtl = doc.dir === "rtl";
    var amount = function () {
      var item = $(".gallery-item", track);
      return item ? item.getBoundingClientRect().width + 26 : 280;
    };
    var move = function (dir) {
      track.scrollBy({ left: (rtl ? -1 : 1) * dir * amount(), behavior: reduceMotion ? "auto" : "smooth" });
    };
    var prev = $("[data-gallery='prev']");
    var next = $("[data-gallery='next']");
    var auto = null;
    var stopAuto = function () {
      if (auto) window.clearInterval(auto);
      auto = null;
    };
    if (prev) {
      prev.addEventListener("click", function () {
        stopAuto();
        move(-1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        stopAuto();
        move(1);
      });
    }
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach(function (type) {
      track.addEventListener(type, stopAuto, { passive: true });
    });
    if (!reduceMotion && "IntersectionObserver" in window) {
      var galleryWatcher = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting && !auto) {
            auto = window.setInterval(function () {
              var max = track.scrollWidth - track.clientWidth;
              var at = Math.abs(track.scrollLeft);
              if (at >= max - 8) {
                track.scrollTo({ left: 0, behavior: "smooth" });
              } else {
                move(1);
              }
            }, 3200);
          } else if (!entries[0].isIntersecting) {
            stopAuto();
          }
        },
        { threshold: 0.4 }
      );
      galleryWatcher.observe(track);
    }
  }

  /* FAQ: one answer open at a time, opening smoothly. */
  var faqs = $$(".faq details");
  faqs.forEach(function (item) {
    var summary = $("summary", item);
    var answer = $(".answer", item);
    if (!summary || !answer || reduceMotion) return;
    summary.addEventListener("click", function (event) {
      event.preventDefault();
      if (item.open) {
        var closing = answer.animate([{ height: answer.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], {
          duration: 260,
          easing: "ease-in",
        });
        closing.onfinish = function () {
          item.open = false;
        };
        return;
      }
      faqs.forEach(function (other) {
        if (other !== item && other.open) other.open = false;
      });
      item.open = true;
      var height = answer.offsetHeight;
      answer.animate([{ height: "0px", opacity: 0 }, { height: height + "px", opacity: 1 }], {
        duration: 320,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      });
    });
  });

  /* Legal pages: highlight the section being read. */
  var tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (link) {
      byId[link.getAttribute("href").slice(1)] = link;
    });
    var sectionWatcher = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(function (l) {
            l.classList.remove("is-active");
          });
          var active = byId[entry.target.id];
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    $$(".legal h2[id]").forEach(function (heading) {
      sectionWatcher.observe(heading);
    });
  }

  /* Delete-account request: opens the visitor's email app with the request
     filled in, addressed to privacy@mowzoon.app. */
  var form = $("#delete-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var email = form.elements.email.value.trim();
      var note = form.elements.note.value.trim();
      var subject = form.getAttribute("data-subject");
      var body = form
        .getAttribute("data-body")
        .replace("{email}", email)
        .replace("{note}", note || "-")
        .replace(/\\n/g, "\n");
      window.location.href =
        "mailto:privacy@mowzoon.app?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      var status = $(".form-status", form.parentNode);
      if (status) status.classList.add("is-shown");
    });
  }

  /* The year in the footer. */
  $$("[data-year]").forEach(function (el) {
    el.textContent = new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", { useGrouping: false }).format(
      new Date().getFullYear()
    );
  });
})();
