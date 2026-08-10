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

  const WORDS_PER_MINUTE = 220;
  const readingTimeCache = new Map();

  /** Strip tags/entities and collapse whitespace for word counting. */
  const stripToPlainText = (value) =>
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#\d+;/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const countWords = (value) => {
    const plain = stripToPlainText(value);
    if (!plain) return 0;
    return plain.split(/\s+/).filter(Boolean).length;
  };

  /** Auto reading time from plain text or HTML. Min. 1 minute, 220 wpm, rounded up. */
  const calculateReadingTime = (text) => {
    const words = countWords(text);
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  };

  const formatReadingTime = (minutes) => `${Math.max(1, Number(minutes) || 1)} Min. Lesezeit`;

  const readingCacheKey = (item) => String(item.id || item.href || "");

  const getReadingMinutes = (item) => {
    if (!item) return 1;
    if (item.readingMinutesComputed) return item.readingMinutesComputed;
    const cached = readingTimeCache.get(readingCacheKey(item));
    if (cached) return cached;
    if (item.readingMinutes) return Math.max(1, Math.ceil(Number(item.readingMinutes)));
    return calculateReadingTime([item.title, item.teaser, item.body].filter(Boolean).join(" "));
  };

  const setReadingMinutes = (item, minutes) => {
    const value = Math.max(1, Number(minutes) || 1);
    item.readingMinutesComputed = value;
    readingTimeCache.set(readingCacheKey(item), value);
    return value;
  };

  const hasArticlePage = (item) => /^artikel\/.+\.html$/i.test(String(item.href || ""));

  const loadReadingMinutes = async (item) => {
    if (!item) return 1;
    if (item.readingMinutesComputed) return item.readingMinutesComputed;

    const key = readingCacheKey(item);
    if (readingTimeCache.has(key)) {
      item.readingMinutesComputed = readingTimeCache.get(key);
      return item.readingMinutesComputed;
    }

    if (item.body) {
      return setReadingMinutes(item, calculateReadingTime(item.body));
    }

    if (hasArticlePage(item)) {
      try {
        const response = await fetch(resolveUrl(item.href), { credentials: "same-origin" });
        if (response.ok) {
          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          const body = doc.querySelector(".article-body");
          if (body) {
            return setReadingMinutes(item, calculateReadingTime(body.innerHTML));
          }
        }
      } catch (_error) {
        // Fall through to temporary fallbacks.
      }
    }

    if (item.readingMinutes) {
      return setReadingMinutes(item, item.readingMinutes);
    }

    return setReadingMinutes(
      item,
      calculateReadingTime([item.title, item.teaser].filter(Boolean).join(" "))
    );
  };

  const enrichReadingMinutes = async (items) => {
    await Promise.all(items.map((item) => loadReadingMinutes(item)));
  };

  const readingTimeMarkup = (item) => `
          <span class="meta-sep" aria-hidden="true">·</span>
          <span>${escapeHtml(formatReadingTime(getReadingMinutes(item)))}</span>`;

  const renderCreditLine = (item, { className = "byline", showAuthor = true } = {}) => {
    const authorBlock = showAuthor
      ? `
        <span class="byline-author">${escapeHtml(formatAuthorLabel(item.author))}</span>
        <span class="meta-sep" aria-hidden="true">·</span>`
      : "";

    return `
      <p class="${className}">${authorBlock}
        <time datetime="${escapeHtml(item.date)}">${escapeHtml(formatDate(item.date))}</time>${readingTimeMarkup(item)}
      </p>
    `;
  };

  window.FREIRAUM_calculateReadingTime = calculateReadingTime;

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
        ${renderCreditLine(article, { className: "byline" })}
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
        ${renderCreditLine(article, { className: "meta", showAuthor: false })}
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

  const slugifyLabel = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " und ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");

  const topicHrefForName = (name) => {
    const topic = getMainTopics().find((entry) => entry.name === name);
    if (topic && topic.href) return resolveUrl(topic.href);
    return resolveUrl(`themen/${slugifyLabel(name)}.html`);
  };

  const tagHrefForName = (name) => resolveUrl(`schlagwort/${slugifyLabel(name)}.html`);

  const normalizeTopicList = (value) =>
    (Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()).filter(Boolean);

  const normalizeTagList = (value) =>
    (Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()).filter(Boolean);

  const topicLinkHtml = (topic) =>
    `<a href="${escapeHtml(resolveUrl(topic.href || "#"))}" data-topic-link="${escapeHtml(topic.id || "")}">${escapeHtml(topic.name)}</a>`;

  const renderTaxonomyLine = (item) => {
    const topics = normalizeTopicList(item.topics).slice(0, 2);
    const tags = normalizeTagList(item.tags).slice(0, 2);
    if (!topics.length && !tags.length) return "";

    const topicLinks = topics
      .map(
        (name, index) =>
          `${index > 0 ? '<span class="meta-sep" aria-hidden="true">·</span>' : ""}<a class="article-taxonomy-topic" href="${escapeHtml(topicHrefForName(name))}">${escapeHtml(name)}</a>`
      )
      .join("");

    const tagLinks = tags
      .map(
        (name, index) =>
          `${index > 0 ? '<span class="meta-sep" aria-hidden="true">·</span>' : ""}<a class="article-taxonomy-tag" href="${escapeHtml(tagHrefForName(name))}">${escapeHtml(name)}</a>`
      )
      .join("");

    const arrow =
      topics.length && tags.length
        ? '<span class="article-taxonomy-arrow" aria-hidden="true">→</span>'
        : "";

    return `
      <p class="article-taxonomy">
        ${topics.length ? `<span class="article-taxonomy-topics">${topicLinks}</span>` : ""}
        ${arrow}
        ${tags.length ? `<span class="article-taxonomy-tags">${tagLinks}</span>` : ""}
      </p>
    `;
  };

  const findArticleForCurrentPage = () => {
    const byId = document.body.dataset.articleId;
    const articles = getPublishedArticles();
    if (byId) {
      const match = articles.find((article) => article.id === byId);
      if (match) return match;
    }

    const path = window.location.pathname.replace(/\\/g, "/");
    return (
      articles.find((article) => {
        const href = String(article.href || "");
        return href && path.endsWith(href.replace(/^\.\//, ""));
      }) || null
    );
  };

  /**
   * Related reading recommendations.
   * Scores by shared tags (+3) and topics (+2), plus a small label bonus (+0.5).
   * Designed so opinions could be passed later, but article pages currently use articles only.
   */
  const getRelatedArticles = (currentArticle, allArticles, limit = 3) => {
    if (!currentArticle || !Array.isArray(allArticles) || limit < 1) return [];

    const currentId = currentArticle.id;
    const currentTags = normalizeTagList(currentArticle.tags);
    const currentTopics = normalizeTopicList(currentArticle.topics);
    const currentLabel = String(currentArticle.label || "").trim().toLowerCase();

    const candidates = allArticles.filter(
      (item) =>
        item &&
        item.published !== false &&
        item.id &&
        item.id !== currentId &&
        item.date &&
        item.title
    );

    const scoreItem = (item) => {
      const tags = normalizeTagList(item.tags);
      const topics = normalizeTopicList(item.topics);
      let score = 0;

      currentTags.forEach((tag) => {
        if (tags.includes(tag)) score += 3;
      });
      currentTopics.forEach((topic) => {
        if (topics.includes(topic)) score += 2;
      });

      const label = String(item.label || item.format || "").trim().toLowerCase();
      if (currentLabel && label && currentLabel === label) score += 0.5;

      return score;
    };

    const byDateDesc = (a, b) => {
      if (a.date === b.date) return String(b.id || "").localeCompare(String(a.id || ""));
      return a.date < b.date ? 1 : -1;
    };

    const ranked = candidates
      .map((item) => ({ item, score: scoreItem(item) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return byDateDesc(a.item, b.item);
      });

    const selected = [];
    const used = new Set([currentId]);

    ranked.forEach((entry) => {
      if (selected.length >= limit || entry.score <= 0) return;
      selected.push(entry.item);
      used.add(entry.item.id);
    });

    if (selected.length < limit) {
      candidates
        .filter((item) => !used.has(item.id))
        .sort(byDateDesc)
        .forEach((item) => {
          if (selected.length >= limit) return;
          selected.push(item);
          used.add(item.id);
        });
    }

    return selected.slice(0, limit);
  };

  window.FREIRAUM_getRelatedArticles = getRelatedArticles;

  const renderRelatedArticles = (items) => {
    if (!items.length) return "";

    const cards = items
      .map((article) => {
        const href = resolveUrl(article.href || "#artikel");
        const media = article.image
          ? `<a class="related-media" href="${escapeHtml(href)}" tabindex="-1" aria-hidden="true">
              <img
                class="related-image"
                src="${escapeHtml(resolveUrl(article.image))}"
                alt=""
                width="640"
                height="400"
                loading="lazy"
                decoding="async"
              >
            </a>`
          : "";

        return `
      <article class="related-item">
        ${media}
        <p class="${labelClassName(article.label)}">${escapeHtml(article.label || "Artikel")}</p>
        <h3 class="related-title">
          <a href="${escapeHtml(href)}">${escapeHtml(article.title)}</a>
        </h3>
        <p class="related-teaser">${escapeHtml(article.teaser || "")}</p>
        ${renderCreditLine(article, { className: "meta", showAuthor: false })}
      </article>
    `;
      })
      .join("");

    return `
      <aside class="related-articles" aria-labelledby="related-heading">
        <h2 id="related-heading" class="related-heading">Weiterlesen</h2>
        <div class="related-grid">
          ${cards}
        </div>
      </aside>
    `;
  };

  const initArticleRelated = () => {
    const page = document.querySelector(".article-page");
    if (!page) return;

    const current = findArticleForCurrentPage();
    if (!current) return;

    const related = getRelatedArticles(current, getPublishedArticles(), 3);
    if (related.length < 2) return;

    const existing = document.querySelector(".related-articles");
    if (existing) existing.remove();

    const body = page.querySelector(".article-body");
    const markup = renderRelatedArticles(related);
    if (body) body.insertAdjacentHTML("afterend", markup);
    else page.insertAdjacentHTML("beforeend", markup);
  };

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

  const initNavDropdowns = () => {
    const items = Array.from(document.querySelectorAll(".nav-item--dropdown"));
    if (!items.length) return;

    const menus = items
      .map((container) => {
        const toggle = container.querySelector(".nav-dropdown-toggle");
        const dropdown = container.querySelector(".nav-dropdown");
        if (!toggle || !dropdown) return null;
        return { container, toggle, dropdown, closeTimer: null };
      })
      .filter(Boolean);

    if (!menus.length) return;

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const clearCloseTimer = (menu) => {
      if (menu.closeTimer !== null) {
        window.clearTimeout(menu.closeTimer);
        menu.closeTimer = null;
      }
    };

    const closeMenu = (menu) => {
      clearCloseTimer(menu);
      menu.dropdown.hidden = true;
      menu.toggle.setAttribute("aria-expanded", "false");
    };

    const closeAllMenus = (except = null) => {
      menus.forEach((menu) => {
        if (except && menu === except) return;
        closeMenu(menu);
      });
    };

    const openMenu = (menu) => {
      closeAllMenus(menu);
      clearCloseTimer(menu);
      menu.dropdown.hidden = false;
      menu.toggle.setAttribute("aria-expanded", "true");
    };

    const scheduleCloseMenu = (menu) => {
      clearCloseTimer(menu);
      menu.closeTimer = window.setTimeout(() => {
        menu.closeTimer = null;
        menu.dropdown.hidden = true;
        menu.toggle.setAttribute("aria-expanded", "false");
      }, 140);
    };

    menus.forEach((menu) => {
      menu.toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (menu.dropdown.hidden) openMenu(menu);
        else closeMenu(menu);
      });

      menu.container.addEventListener("mouseenter", () => {
        if (!hoverQuery.matches) return;
        openMenu(menu);
      });

      menu.container.addEventListener("mouseleave", () => {
        if (!hoverQuery.matches) return;
        scheduleCloseMenu(menu);
      });

      menu.dropdown.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => closeMenu(menu));
      });
    });

    document.addEventListener("click", (event) => {
      const inside = menus.some((menu) => menu.container.contains(event.target));
      if (!inside) closeAllMenus();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openMenuEntry = menus.find((menu) => !menu.dropdown.hidden);
      if (!openMenuEntry) return;
      closeMenu(openMenuEntry);
      openMenuEntry.toggle.focus();
    });

    // Topic links are injected after init; close via delegation.
    document.addEventListener("click", (event) => {
      const topicLink = event.target.closest("[data-topic-link]");
      if (!topicLink) return;
      closeAllMenus();
    });

    window.FREIRAUM_closeNavMenus = closeAllMenus;
    window.FREIRAUM_closeTopicsMenu = closeAllMenus;
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
        ${renderCreditLine(opinion, { className: "meta" })}
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
      author: article.author,
      date: article.date,
      readingMinutesComputed: getReadingMinutes(article),
      href: resolveUrl(article.href || "#artikel"),
      haystack: normalizeSearchText(
        [
          article.title,
          article.teaser,
          article.label,
          article.author,
          normalizeTopicList(article.topics).join(" "),
          normalizeTagList(article.tags).join(" ")
        ].join(" ")
      )
    }));

    const opinions = getPublishedOpinions().map((opinion) => ({
      id: `opinion-${opinion.id}`,
      type: opinion.format || "Standpunkt",
      title: opinion.title,
      teaser: opinion.teaser || "",
      author: opinion.author,
      date: opinion.date,
      readingMinutesComputed: getReadingMinutes(opinion),
      href: resolveUrl(opinion.href || "#standpunkte"),
      haystack: normalizeSearchText(
        [
          opinion.title,
          opinion.teaser,
          opinion.format,
          opinion.author,
          normalizeTopicList(opinion.topics).join(" "),
          normalizeTagList(opinion.tags).join(" ")
        ].join(" ")
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
          ${renderCreditLine(item, { className: "meta search-result-meta" })}
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
    initNavDropdowns();
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

  const initArticleReadingTime = () => {
    const body = document.querySelector(".article-page .article-body");
    const target = document.querySelector("[data-reading-time]");
    if (!body || !target) return;
    target.textContent = formatReadingTime(calculateReadingTime(body.innerHTML));
  };

  const initArticleTaxonomy = () => {
    const header = document.querySelector(".article-page .article-header");
    if (!header) return;

    const existing = header.querySelector(".article-taxonomy");
    if (existing) existing.remove();

    const article = findArticleForCurrentPage();
    if (!article) return;

    const markup = renderTaxonomyLine(article);
    if (!markup) return;

    const byline = header.querySelector(".byline");
    if (byline) byline.insertAdjacentHTML("afterend", markup);
    else header.insertAdjacentHTML("beforeend", markup);
  };

  const boot = async () => {
    const articles = getPublishedArticles();
    const opinions = getPublishedOpinions();
    await enrichReadingMinutes(articles.concat(opinions));

    renderHomepageArticles();
    renderStandpunkte();
    renderTopicsNavigation();
    renderTopicPage();
    initArticleReadingTime();
    initArticleTaxonomy();
    initArticleRelated();
    initChrome();
    initReveal();
  };

  boot();
})();
