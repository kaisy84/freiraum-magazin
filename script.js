(() => {
  const FEATURED_COUNT = 2;
  const LATEST_COUNT = 9;
  const OPINION_COUNT = 3;
  const OPINION_FORMATS = new Set(["kommentar", "essay", "gastbeitrag", "position"]);

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatDate = (isoDate) => {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  };

  const labelClassName = (label) => {
    const key = String(label || "").toLowerCase();
    if (key === "debatte" || key === "position") return "label label--debatte";
    if (key === "kommentar" || key === "gastbeitrag") return "label label--kommentar";
    return "label";
  };

  const mediaToneClass = (tone, { lead = false } = {}) => {
    const classes = ["media-plane"];
    if (lead) classes.push("media-plane--lead");
    else classes.push("media-plane--story");

    if (tone === "alt") classes.push("media-plane--alt");
    if (tone === "sage") classes.push("media-plane--sage");
    if (tone === "sand") classes.push("media-plane--sand");
    return classes.join(" ");
  };

  const getPublishedArticles = () => {
    const source = Array.isArray(window.FREIRAUM_ARTICLES) ? window.FREIRAUM_ARTICLES : [];
    return source
      .filter((article) => article && article.published !== false && article.date && article.title)
      .slice()
      .sort((a, b) => {
        if (a.date === b.date) return String(b.id || "").localeCompare(String(a.id || ""));
        return a.date < b.date ? 1 : -1;
      });
  };

  /**
   * Kaskade der Startseite:
   * [0] großer Aufmacher
   * [1–2] Bereich direkt darunter
   * [3+] „Neu erschienen“ (weiterhin chronologisch, neueste zuerst)
   */
  const splitHomepageArticles = (articles) => ({
    lead: articles[0] || null,
    featured: articles.slice(1, 1 + FEATURED_COUNT),
    latest: articles.slice(1 + FEATURED_COUNT, 1 + FEATURED_COUNT + LATEST_COUNT)
  });

  const renderLead = (article) => {
    const root = document.querySelector("#lead");
    if (!root) return;

    if (!article) {
      root.hidden = true;
      root.innerHTML = "";
      return;
    }

    root.hidden = false;
    root.innerHTML = `
      <div class="lead-copy">
        <p class="${labelClassName(article.label)}">${escapeHtml(article.label)}</p>
        <h1 id="lead-headline">
          <a href="${escapeHtml(article.href || "#artikel")}">${escapeHtml(article.title)}</a>
        </h1>
        <p class="lead-teaser">${escapeHtml(article.teaser || "")}</p>
        <p class="byline">
          <span class="byline-author">Von ${escapeHtml(article.author || "Redaktion FREIRAUM")}</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <time datetime="${escapeHtml(article.date)}">${escapeHtml(formatDate(article.date))}</time>
          ${
            article.readingMinutes
              ? `<span class="meta-sep" aria-hidden="true">·</span><span>${escapeHtml(article.readingMinutes)} Min. Lesezeit</span>`
              : ""
          }
        </p>
      </div>
      <figure class="lead-media">
        <div class="${mediaToneClass(article.imageTone, { lead: true })}" role="img" aria-label="${escapeHtml(article.imageAlt || "Platzhalterbild")}"></div>
        <figcaption>${escapeHtml(article.imageCaption || "Platzhalter – Bild folgt")}</figcaption>
      </figure>
    `;
  };

  const renderFeatured = (articles) => {
    const root = document.querySelector("#featured");
    if (!root) return;

    if (!articles.length) {
      root.hidden = true;
      root.innerHTML = "";
      return;
    }

    root.hidden = false;
    root.innerHTML = articles
      .map(
        (article) => `
      <article class="featured-item">
        <p class="${labelClassName(article.label)}">${escapeHtml(article.label)}</p>
        <h2 class="featured-title">
          <a href="${escapeHtml(article.href || "#artikel")}">${escapeHtml(article.title)}</a>
        </h2>
        <p class="featured-teaser">${escapeHtml(article.teaser || "")}</p>
        <p class="meta">
          <span>Von ${escapeHtml(article.author || "Redaktion FREIRAUM")}</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <time datetime="${escapeHtml(article.date)}">${escapeHtml(formatDate(article.date))}</time>
        </p>
      </article>
    `
      )
      .join("");
  };

  const renderLatest = (articles) => {
    const root = document.querySelector("#latest-grid");
    if (!root) return;

    root.innerHTML = articles
      .map(
        (article) => `
      <article class="story">
        <div class="${mediaToneClass(article.imageTone)}" role="img" aria-label="${escapeHtml(article.imageAlt || "Platzhalterbild")}"></div>
        <p class="${labelClassName(article.label)}">${escapeHtml(article.label)}</p>
        <h3 class="story-title"><a href="${escapeHtml(article.href || "#artikel")}">${escapeHtml(article.title)}</a></h3>
        <p class="story-teaser">${escapeHtml(article.teaser || "")}</p>
        <p class="meta"><time datetime="${escapeHtml(article.date)}">${escapeHtml(formatDate(article.date))}</time></p>
      </article>
    `
      )
      .join("");
  };

  const renderHomepageArticles = () => {
    const { lead, featured, latest } = splitHomepageArticles(getPublishedArticles());
    renderLead(lead);
    renderFeatured(featured);
    renderLatest(latest);
  };

  const getPublishedOpinions = () => {
    const source = Array.isArray(window.FREIRAUM_OPINIONS) ? window.FREIRAUM_OPINIONS : [];
    return source
      .filter((opinion) => {
        if (!opinion || opinion.published === false || !opinion.date || !opinion.title) return false;
        return OPINION_FORMATS.has(String(opinion.format || "").toLowerCase());
      })
      .slice()
      .sort((a, b) => {
        if (a.date === b.date) return String(b.id || "").localeCompare(String(a.id || ""));
        return a.date < b.date ? 1 : -1;
      });
  };

  const renderStandpunkte = () => {
    const root = document.querySelector("#standpunkte-grid");
    if (!root) return;

    const opinions = getPublishedOpinions().slice(0, OPINION_COUNT);
    if (!opinions.length) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML = opinions
      .map(
        (opinion) => `
      <article class="debate-item">
        <p class="${labelClassName(opinion.format)}">${escapeHtml(opinion.format)}</p>
        <h3 class="debate-title"><a href="${escapeHtml(opinion.href || "#standpunkte")}">${escapeHtml(opinion.title)}</a></h3>
        <p class="debate-teaser">${escapeHtml(opinion.teaser || "")}</p>
        <p class="meta">
          <span>Von ${escapeHtml(opinion.author || "Redaktion FREIRAUM")}</span>
          ${
            opinion.readingMinutes
              ? `<span class="meta-sep" aria-hidden="true">·</span><span>${escapeHtml(opinion.readingMinutes)} Min.</span>`
              : ""
          }
        </p>
      </article>
    `
      )
      .join("");
  };

  const normalizeSearchText = (value) => {
    const lower = String(value || "").toLowerCase();
    const german = lower
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");
    const plain = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return `${german} ${plain}`;
  };

  const shortenTeaser = (text, max = 140) => {
    const value = String(text || "").trim();
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1).trimEnd()}…`;
  };

  const collectSearchItems = () => {
    const articles = getPublishedArticles().map((article) => ({
      id: `article-${article.id}`,
      type: article.label || "Artikel",
      title: article.title,
      teaser: article.teaser || "",
      href: article.href || "#artikel",
      haystack: normalizeSearchText(
        [
          article.title,
          article.teaser,
          article.label,
          article.author,
          Array.isArray(article.topics) ? article.topics.join(" ") : ""
        ].join(" ")
      )
    }));

    const opinions = getPublishedOpinions().map((opinion) => ({
      id: `opinion-${opinion.id}`,
      type: opinion.format || "Standpunkt",
      title: opinion.title,
      teaser: opinion.teaser || "",
      href: opinion.href || "#standpunkte",
      haystack: normalizeSearchText(
        [opinion.title, opinion.teaser, opinion.format, opinion.author].join(" ")
      )
    }));

    return articles.concat(opinions);
  };

  const initSearch = () => {
    const toggle = document.querySelector("#search-toggle");
    const panel = document.querySelector("#search-panel");
    const input = document.querySelector("#site-search");
    const closeBtn = document.querySelector("#search-close");
    const results = document.querySelector("#search-results");
    const form = document.querySelector(".search-form");
    const navToggle = document.querySelector(".nav-toggle");
    const siteNav = document.querySelector("#site-nav");

    if (!toggle || !panel || !input || !closeBtn || !results) return;

    const items = collectSearchItems();

    const closeMobileNav = () => {
      if (!navToggle || !siteNav) return;
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Menü öffnen");
      siteNav.classList.remove("is-open");
    };

    const clearResults = () => {
      results.hidden = true;
      results.innerHTML = "";
    };

    const renderResults = (matches) => {
      results.hidden = false;

      if (!matches.length) {
        results.innerHTML = `<p class="search-empty">Keine passenden Beiträge gefunden.</p>`;
        return;
      }

      results.innerHTML = matches
        .map(
          (item) => `
        <a class="search-result" href="${escapeHtml(item.href)}">
          <p class="${labelClassName(item.type)}">${escapeHtml(item.type)}</p>
          <span class="search-result-title">${escapeHtml(item.title)}</span>
          ${
            item.teaser
              ? `<p class="search-result-teaser">${escapeHtml(shortenTeaser(item.teaser))}</p>`
              : ""
          }
        </a>
      `
        )
        .join("");
    };

    const runSearch = () => {
      const query = input.value.trim();
      if (!query) {
        clearResults();
        return;
      }

      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const matches = items.filter((item) =>
        words.every((word) => {
          const variants = normalizeSearchText(word).split(/\s+/).filter(Boolean);
          return variants.some((variant) => item.haystack.includes(variant));
        })
      );
      renderResults(matches);
    };

    const openSearch = () => {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      closeMobileNav();
      window.requestAnimationFrame(() => input.focus());
    };

    const closeSearch = ({ restoreFocus = true } = {}) => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      input.value = "";
      clearResults();
      if (restoreFocus) toggle.focus();
    };

    const toggleSearch = () => {
      if (panel.hidden) openSearch();
      else closeSearch();
    };

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      toggleSearch();
    });

    closeBtn.addEventListener("click", () => closeSearch());

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        runSearch();
      });
    }

    input.addEventListener("input", runSearch);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        closeSearch();
      }
    });

    results.addEventListener("click", (event) => {
      const link = event.target.closest("a.search-result");
      if (link) closeSearch({ restoreFocus: false });
    });
  };

  const initChrome = () => {
    const navToggle = document.querySelector(".nav-toggle");
    const siteNav = document.querySelector("#site-nav");
    const yearNode = document.querySelector("[data-year]");
    const newsletterForm = document.querySelector(".newsletter-form");
    const newsletterNote = document.querySelector(".newsletter-note");

    if (yearNode) {
      yearNode.textContent = String(new Date().getFullYear());
    }

    if (navToggle && siteNav) {
      navToggle.addEventListener("click", () => {
        const open = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!open));
        navToggle.setAttribute("aria-label", open ? "Menü öffnen" : "Menü schließen");
        siteNav.classList.toggle("is-open", !open);
      });

      siteNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.setAttribute("aria-label", "Menü öffnen");
          siteNav.classList.remove("is-open");
        });
      });
    }

    if (newsletterForm && newsletterNote) {
      newsletterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(newsletterForm);
        const email = String(data.get("email") || "").trim();

        if (!email) {
          newsletterNote.textContent = "Bitte eine E-Mail-Adresse eingeben.";
          return;
        }

        newsletterNote.textContent =
          "Vielen Dank – der Newsletter ist vorbereitet, die Anmeldung folgt später.";
        newsletterForm.reset();
      });
    }

    initSearch();
  };

  const initReveal = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealNodes = document.querySelectorAll(
      ".featured, .latest, .topics, .experiences, .debates, .split-band"
    );

    if (reduceMotion) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    revealNodes.forEach((node) => node.classList.add("reveal"));

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );

      revealNodes.forEach((node) => observer.observe(node));
    } else {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
    }
  };

  renderHomepageArticles();
  renderStandpunkte();
  initChrome();
  initReveal();
})();
