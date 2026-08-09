(() => {
  const FEATURED_COUNT = 2;
  const LATEST_COUNT = 9;
  const OPINION_COUNT = 3;
  const OPINION_FORMATS = new Set(["kommentar", "essay", "gastbeitrag", "position"]);
  const siteRoot = document.body.dataset.siteRoot || "";

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const resolveUrl = (url) => {
    if (!url) return "#";
    if (/^(https?:|mailto:|tel:|#|\/\/)/i.test(url)) return url;
    return `${siteRoot}${url}`;
  };

  const DEFAULT_AUTHOR = "Redaktion FREIRAUM";

  const formatDate = (isoDate) => {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  };

  const resolveAuthor = (author) => {
    const name = String(author || "").trim();
    return name || DEFAULT_AUTHOR;
  };

  const formatAuthorLabel = (author) => {
    const name = resolveAuthor(author);
    return name === DEFAULT_AUTHOR ? name : `Von ${name}`;
  };

  const renderCreditLine = (item, { className = "byline", includeReadingTime = false } = {}) => {
    const reading =
      includeReadingTime && item.readingMinutes
        ? `
          <span class="meta-sep" aria-hidden="true">·</span>
          <span>${escapeHtml(item.readingMinutes)} Min. Lesezeit</span>`
        : "";

    return `
      <p class="${className}">
        <span class="byline-author">${escapeHtml(formatAuthorLabel(item.author))}</span>
        <span class="meta-sep" aria-hidden="true">·</span>
        <time datetime="${escapeHtml(item.date)}">${escapeHtml(formatDate(item.date))}</time>${reading}
      </p>
    `;
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
        if (a.date === b.date) return 0;
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

  const renderLeadMedia = (article, href) => {
    const alt = article.imageAlt || "Beitragsbild";
    if (article.image) {
      return `
        <a class="lead-media-link" href="${escapeHtml(href)}">
          <img
            class="lead-image"
            src="${escapeHtml(resolveUrl(article.image))}"
            alt="${escapeHtml(alt)}"
            width="1600"
            height="900"
            loading="eager"
            decoding="async"
          >
        </a>
      `;
    }

    return `
      <a class="lead-media-link" href="${escapeHtml(href)}">
        <div class="${mediaToneClass(article.imageTone, { lead: true })}" role="img" aria-label="${escapeHtml(alt)}"></div>
      </a>
    `;
  };

  const renderLead = (article) => {
    const root = document.querySelector("#lead");
    if (!root) return;

    if (!article) {
      root.hidden = true;
      root.innerHTML = "";
      return;
    }

    const href = resolveUrl(article.href || "#artikel");

    root.hidden = false;
    root.innerHTML = `
      <div class="lead-copy">
        <p class="${labelClassName(article.label)}">${escapeHtml(article.label)}</p>
        <h1 id="lead-headline">
          <a href="${escapeHtml(href)}">${escapeHtml(article.title)}</a>
        </h1>
        ${renderCreditLine(article, { className: "byline", includeReadingTime: true })}
        <p class="lead-teaser">
          <a class="lead-teaser-link" href="${escapeHtml(href)}">${escapeHtml(article.teaser || "")}</a>
        </p>
      </div>
      <figure class="lead-media">
        ${renderLeadMedia(article, href)}
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
      .map((article) => {
        const href = resolveUrl(article.href || "#artikel");
        return `
      <article class="featured-item">
        <p class="${labelClassName(article.label)}">${escapeHtml(article.label)}</p>
        <h2 class="featured-title">
          <a href="${escapeHtml(href)}">${escapeHtml(article.title)}</a>
        </h2>
        <p class="featured-teaser">${escapeHtml(article.teaser || "")}</p>
        ${renderCreditLine(article, { className: "meta" })}
      </article>
    `;
      })
      .join("");
  };

  const renderLatest = (articles) => {
    const root = document.querySelector("#latest-grid");
    if (!root) return;

    root.innerHTML = articles
      .map((article) => {
        const href = resolveUrl(article.href || "#artikel");
        return `
      <article class="story">
        <div class="${mediaToneClass(article.imageTone)}" role="img" aria-label="${escapeHtml(article.imageAlt || "Platzhalterbild")}"></div>
        <p class="${labelClassName(article.label)}">${escapeHtml(article.label)}</p>
        <h3 class="story-title"><a href="${escapeHtml(href)}">${escapeHtml(article.title)}</a></h3>
        <p class="story-teaser">${escapeHtml(article.teaser || "")}</p>
        <p class="meta"><time datetime="${escapeHtml(article.date)}">${escapeHtml(formatDate(article.date))}</time></p>
      </article>
    `;
      })
      .join("");
  };

  const renderHomepageArticles = () => {
    const { lead, featured, latest } = splitHomepageArticles(getPublishedArticles());
    renderLead(lead);
    renderFeatured(featured);
    renderLatest(latest);
  };

  const getMainTopics = () =>
    Array.isArray(window.FREIRAUM_TOPICS) ? window.FREIRAUM_TOPICS.filter((topic) => topic && topic.name) : [];

  const topicLinkHtml = (topic) =>
    `<a href="${escapeHtml(resolveUrl(topic.href || "#"))}" data-topic-link="${escapeHtml(topic.id || "")}">${escapeHtml(topic.name)}</a>`;

  const renderTopicsNavigation = () => {
    const topics = getMainTopics();
    const list = document.querySelector("#topics-list");
    const dropdown = document.querySelector("#topics-dropdown");

    if (list) {
      list.innerHTML = topics.map((topic) => `<li>${topicLinkHtml(topic)}</li>`).join("");
    }

    if (dropdown) {
      dropdown.innerHTML = topics.map((topic) => `<li>${topicLinkHtml(topic)}</li>`).join("");
    }
  };

  const getArticlesForTopic = (topicName) =>
    getPublishedArticles().filter(
      (article) =>
        Array.isArray(article.topics) &&
        article.topics.includes(topicName) &&
        String(article.href || "").startsWith("artikel/")
    );

  const renderTopicPage = () => {
    const root = document.querySelector("#topic-articles");
    if (!root) return;

    const topicId = document.body.dataset.topicId;
    if (!topicId) return;

    const topic = getMainTopics().find((entry) => entry.id === topicId);
    if (!topic) return;

    const articles = getArticlesForTopic(topic.name);
    if (!articles.length) {
      root.innerHTML =
        '<p class="topic-empty">In diesem Thema erscheinen Beiträge, sobald sie zugeordnet sind.</p>';
      return;
    }

    root.innerHTML = `
      <div class="topic-list">
        ${articles
          .map((article) => {
            const href = resolveUrl(article.href);
            const media = article.image
              ? `<a class="topic-story-media" href="${escapeHtml(href)}">
                  <img
                    class="topic-story-image"
                    src="${escapeHtml(resolveUrl(article.image))}"
                    alt="${escapeHtml(article.imageAlt || "")}"
                    width="640"
                    height="400"
                    loading="lazy"
                    decoding="async"
                  >
                </a>`
              : `<a class="topic-story-media" href="${escapeHtml(href)}">
                  <div class="${mediaToneClass(article.imageTone)}" role="img" aria-label="${escapeHtml(article.imageAlt || "Beitragsbild")}"></div>
                </a>`;

            return `
          <article class="story topic-story">
            ${media}
            <p class="${labelClassName(article.label)}">${escapeHtml(article.label)}</p>
            <h2 class="story-title"><a href="${escapeHtml(href)}">${escapeHtml(article.title)}</a></h2>
            <p class="story-teaser">${escapeHtml(article.teaser || "")}</p>
            ${renderCreditLine(article, { className: "meta" })}
          </article>
        `;
          })
          .join("")}
      </div>
    `;
  };

  const initTopicsMenu = () => {
    const toggle = document.querySelector("#topics-menu-toggle");
    const dropdown = document.querySelector("#topics-dropdown");
    if (!toggle || !dropdown) return;

    const closeTopicsMenu = () => {
      dropdown.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    };

    const openTopicsMenu = () => {
      dropdown.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    };

    const toggleTopicsMenu = () => {
      if (dropdown.hidden) openTopicsMenu();
      else closeTopicsMenu();
    };

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTopicsMenu();
    });

    document.addEventListener("click", (event) => {
      if (dropdown.hidden) return;
      if (toggle.contains(event.target) || dropdown.contains(event.target)) return;
      closeTopicsMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dropdown.hidden) {
        closeTopicsMenu();
        toggle.focus();
      }
    });

    document.querySelectorAll("[data-topic-link]").forEach((link) => {
      link.addEventListener("click", () => {
        closeTopicsMenu();
      });
    });

    window.FREIRAUM_closeTopicsMenu = closeTopicsMenu;
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
          <span>${escapeHtml(formatAuthorLabel(opinion.author))}</span>
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
      href: resolveUrl(article.href || "#artikel"),
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
      href: resolveUrl(opinion.href || "#standpunkte"),
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
      if (typeof window.FREIRAUM_closeTopicsMenu === "function") {
        window.FREIRAUM_closeTopicsMenu();
      }
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

    const contactForm = document.querySelector("#contact-form");
    const contactNext = document.querySelector("#contact-next");
    const contactSuccess = document.querySelector("#contact-success");

    if (contactForm && contactNext) {
      const returnUrl = `${window.location.origin}${window.location.pathname}?gesendet=1`;
      contactNext.value = returnUrl;
    }

    if (contactSuccess && /[?&]gesendet=1(?:&|$)/.test(window.location.search)) {
      contactSuccess.hidden = false;
      contactSuccess.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    initSearch();
    initTopicsMenu();
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
  renderTopicsNavigation();
  renderTopicPage();
  initChrome();
  initReveal();
})();
