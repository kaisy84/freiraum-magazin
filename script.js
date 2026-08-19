(() => {
  const FEATURED_COUNT = 2;
  const LATEST_COUNT = 9;
  const OPINION_COUNT = 3;
  const OPINION_FORMATS = new Set(["kommentar", "essay", "gastbeitrag", "position"]);
  const SITE_ORIGIN = "https://magazin-freiraum.de";
  const siteRoot = document.body?.dataset?.siteRoot || "";

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

  const opinionAsPage = (opinion) => ({
    ...opinion,
    label: opinion.format || opinion.label || "Standpunkt"
  });

  const getPublishedFullPages = () =>
    getPublishedArticles()
      .concat(
        getPublishedOpinions()
          .filter(hasArticlePage)
          .map(opinionAsPage)
      )
      .sort((a, b) => {
        if (a.date === b.date) return String(b.id || "").localeCompare(String(a.id || ""));
        return a.date < b.date ? 1 : -1;
      });

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

  const mediaToneClass = (tone, { size = "story" } = {}) => {
    const classes = ["media-plane"];
    if (size === "lead") classes.push("media-plane--lead");
    else if (size === "hero") classes.push("media-plane--hero");
    else if (size === "search") classes.push("media-plane--search");
    else classes.push("media-plane--story");

    if (tone === "alt") classes.push("media-plane--alt");
    if (tone === "sage") classes.push("media-plane--sage");
    if (tone === "sand") classes.push("media-plane--sand");
    return classes.join(" ");
  };

  /**
   * Canonical cover field: `image` in articles.js.
   * All article visuals (home, topics, search, related, article hero) use this API.
   */
  const getArticleCover = (article) => {
    if (!article || typeof article.image !== "string") return null;
    const src = article.image.trim();
    return src || null;
  };

  const getArticleCoverAlt = (article) => {
    const alt = article && typeof article.imageAlt === "string" ? article.imageAlt.trim() : "";
    return alt || "Beitragsbild";
  };

  const renderCoverPlaceholder = (article, { size = "story" } = {}) => {
    const alt = getArticleCoverAlt(article);
    return `<div class="${mediaToneClass(article?.imageTone, { size })}" role="img" aria-label="${escapeHtml(alt)}"></div>`;
  };

  const renderCoverImage = (
    article,
    { className = "", width = 640, height = 400, loading = "lazy", decorative = false } = {}
  ) => {
    const src = getArticleCover(article);
    if (!src) return "";

    const alt = decorative ? "" : getArticleCoverAlt(article);
    const classAttr = className ? ` class="${escapeHtml(className)}"` : "";

    return `<img${classAttr}
            src="${escapeHtml(resolveUrl(src))}"
            alt="${escapeHtml(alt)}"
            width="${width}"
            height="${height}"
            loading="${escapeHtml(loading)}"
            decoding="async"
          >`;
  };

  const COVER_VARIANTS = {
    lead: {
      linkClass: "lead-media-link",
      imgClass: "lead-image",
      width: 1600,
      height: 900,
      size: "lead",
      loading: "eager"
    },
    story: {
      linkClass: "story-media",
      imgClass: "story-image",
      width: 640,
      height: 400,
      size: "story",
      loading: "lazy",
      decorativeLinkWhenPlaceholder: true
    },
    topic: {
      linkClass: "topic-story-media",
      imgClass: "topic-story-image",
      width: 640,
      height: 400,
      size: "story",
      loading: "lazy"
    },
    related: {
      linkClass: "related-media",
      imgClass: "related-image",
      width: 640,
      height: 400,
      size: "story",
      loading: "lazy",
      decorative: true
    },
    hero: {
      linkClass: null,
      imgClass: null,
      width: 1600,
      height: 900,
      size: "hero",
      loading: "eager"
    },
    search: {
      linkClass: null,
      imgClass: "search-result-image",
      width: 120,
      height: 75,
      size: "search",
      loading: "lazy",
      decorative: true
    }
  };

  /** Unified cover markup: real image from article.image, else central placeholder. */
  const renderArticleCover = (article, { variant = "story", href = null } = {}) => {
    const cfg = COVER_VARIANTS[variant] || COVER_VARIANTS.story;
    const cover = getArticleCover(article);
    const inner = cover
      ? renderCoverImage(article, {
          className: cfg.imgClass || "",
          width: cfg.width,
          height: cfg.height,
          loading: cfg.loading,
          decorative: Boolean(cfg.decorative)
        })
      : renderCoverPlaceholder(article, { size: cfg.size });

    if (!cfg.linkClass || !href) return inner;

    const decorativeLink =
      Boolean(cfg.decorative) || (Boolean(cfg.decorativeLinkWhenPlaceholder) && !cover);
    const linkAttrs = decorativeLink ? ' tabindex="-1" aria-hidden="true"' : "";
    return `<a class="${cfg.linkClass}" href="${escapeHtml(href)}"${linkAttrs}>${inner}</a>`;
  };

  window.FREIRAUM_getArticleCover = getArticleCover;

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
        ${renderArticleCover(article, { variant: "lead", href })}
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
        ${renderArticleCover(article, { variant: "story", href })}
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
    const byId =
      document.body?.dataset?.articleId || document.documentElement?.dataset?.articleId || "";
    const pages = getPublishedFullPages();
    if (byId) {
      const match = pages.find((article) => article.id === byId);
      if (match) return match;
    }

    const path = window.location.pathname.replace(/\\/g, "/");
    return (
      pages.find((article) => {
        const href = String(article.href || "");
        return href && path.endsWith(href.replace(/^\.\//, ""));
      }) || null
    );
  };

  const getSeoTitle = (article) => {
    const custom = typeof article.seoTitle === "string" ? article.seoTitle.trim() : "";
    if (custom) return custom;
    return `${article.title} | FREIRAUM`;
  };

  const getSeoDescription = (article) => {
    const custom = typeof article.seoDescription === "string" ? article.seoDescription.trim() : "";
    if (custom) return custom;
    return String(article.teaser || "").trim();
  };

  const getDateModified = (article) => {
    if (!article || article.dateModified == null) return null;
    const value = String(article.dateModified).trim();
    return value || null;
  };

  /** Absolute public URL on magazin-freiraum.de (never github.io). */
  const toCanonicalUrl = (path) => {
    if (!path) return `${SITE_ORIGIN}/`;
    const raw = String(path).trim();
    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        if (/github\.io$/i.test(url.hostname)) {
          return `${SITE_ORIGIN}${url.pathname}${url.search}${url.hash}`;
        }
        return url.toString();
      } catch (_error) {
        return `${SITE_ORIGIN}/`;
      }
    }
    if (raw.startsWith("#")) return `${SITE_ORIGIN}/`;
    const clean = raw.replace(/^\.\//, "").replace(/^\//, "");
    return `${SITE_ORIGIN}/${clean}`;
  };

  const toAbsoluteAssetUrl = (path) => {
    const cover = typeof path === "string" ? path.trim() : "";
    if (!cover) return null;
    return toCanonicalUrl(cover);
  };

  const setUniqueMetaByName = (name, content) => {
    const nodes = Array.from(document.head.querySelectorAll(`meta[name="${name}"]`));
    nodes.slice(1).forEach((node) => node.remove());
    let el = nodes[0];
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  const setUniqueMetaByProperty = (property, content) => {
    const nodes = Array.from(document.head.querySelectorAll(`meta[property="${property}"]`));
    nodes.slice(1).forEach((node) => node.remove());
    let el = nodes[0];
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  const removeMetaByProperty = (property) => {
    document.head.querySelectorAll(`meta[property="${property}"]`).forEach((node) => node.remove());
  };

  const setUniqueCanonical = (href) => {
    const nodes = Array.from(document.head.querySelectorAll('link[rel="canonical"]'));
    nodes.slice(1).forEach((node) => node.remove());
    let el = nodes[0];
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  };

  const setJsonLd = (data) => {
    document.head
      .querySelectorAll('script[type="application/ld+json"][data-freiraum-seo]')
      .forEach((node) => node.remove());
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-freiraum-seo", "article");
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
  };

  const schemaAuthorForArticle = (article) => {
    const name = resolveAuthor(article.author);
    if (/^redaktion\s+freiraum$/i.test(name)) {
      return { "@type": "Organization", name: "Redaktion FREIRAUM" };
    }
    if (/^anonym\b/i.test(name)) {
      return { "@type": "Organization", name: "FREIRAUM" };
    }
    return { "@type": "Person", name };
  };

  /** Onpage SEO fallback – static <head> on article pages is authoritative for crawlers. */
  const initArticleSeo = () => {
    if (!document.head) return;
    const isArticlePage =
      Boolean(document.body?.dataset?.articleId || document.documentElement?.dataset?.articleId) ||
      Boolean(document.querySelector(".article-page"));
    if (!isArticlePage) return;

    // Prefer server-delivered SEO (visible in view-source). Do not inject duplicates.
    const existingCanonical = document.head.querySelector('link[rel="canonical"]');
    if (existingCanonical) return;

    const article = findArticleForCurrentPage();
    if (!article || !hasArticlePage(article)) return;

    const seoTitle = getSeoTitle(article);
    const seoDescription = getSeoDescription(article);
    const canonical = toCanonicalUrl(article.href);
    const imageUrl = toAbsoluteAssetUrl(getArticleCover(article));
    const modified = getDateModified(article);
    const section = Array.isArray(article.topics) && article.topics[0] ? article.topics[0] : "";

    document.title = seoTitle;
    if (seoDescription) setUniqueMetaByName("description", seoDescription);
    setUniqueCanonical(canonical);

    setUniqueMetaByProperty("og:type", "article");
    setUniqueMetaByProperty("og:site_name", "FREIRAUM");
    setUniqueMetaByProperty("og:title", seoTitle);
    if (seoDescription) setUniqueMetaByProperty("og:description", seoDescription);
    setUniqueMetaByProperty("og:url", canonical);
    if (imageUrl) setUniqueMetaByProperty("og:image", imageUrl);
    else removeMetaByProperty("og:image");

    if (article.date) setUniqueMetaByProperty("article:published_time", article.date);
    if (modified) setUniqueMetaByProperty("article:modified_time", modified);
    else removeMetaByProperty("article:modified_time");
    if (section) setUniqueMetaByProperty("article:section", section);

    setUniqueMetaByName("twitter:card", "summary_large_image");
    setUniqueMetaByName("twitter:title", seoTitle);
    if (seoDescription) setUniqueMetaByName("twitter:description", seoDescription);
    if (imageUrl) setUniqueMetaByName("twitter:image", imageUrl);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: seoDescription || undefined,
      datePublished: article.date || undefined,
      author: schemaAuthorForArticle(article),
      publisher: {
        "@type": "Organization",
        name: "FREIRAUM",
        url: `${SITE_ORIGIN}/`
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical
      }
    };

    if (imageUrl) jsonLd.image = [imageUrl];
    if (modified) jsonLd.dateModified = modified;
    if (section) jsonLd.articleSection = section;

    setJsonLd(jsonLd);
  };

  window.FREIRAUM_initArticleSeo = initArticleSeo;

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
        return `
      <article class="related-item">
        ${renderArticleCover(article, { variant: "related", href })}
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

    const related = getRelatedArticles(current, getPublishedFullPages(), 3);
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
    getPublishedFullPages().filter(
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
            return `
          <article class="story topic-story">
            ${renderArticleCover(article, { variant: "topic", href })}
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
      .map((opinion) => {
        const href = hasArticlePage(opinion)
          ? resolveUrl(opinion.href)
          : opinion.href || "#standpunkte";
        const cover = getArticleCover(opinion)
          ? renderArticleCover(opinion, { variant: "story", href })
          : "";
        return `
      <article class="debate-item">
        ${cover}
        <p class="${labelClassName(opinion.format)}">${escapeHtml(opinion.format)}</p>
        <h3 class="debate-title"><a href="${escapeHtml(href)}">${escapeHtml(opinion.title)}</a></h3>
        <p class="debate-teaser">${escapeHtml(opinion.teaser || "")}</p>
        ${renderCreditLine(opinion, { className: "meta" })}
      </article>
    `;
      })
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
      kind: "article",
      type: article.label || "Artikel",
      title: article.title,
      teaser: article.teaser || "",
      author: article.author,
      date: article.date,
      readingMinutesComputed: getReadingMinutes(article),
      href: resolveUrl(article.href || "#artikel"),
      image: article.image,
      imageAlt: article.imageAlt,
      imageTone: article.imageTone,
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
      kind: "opinion",
      type: opinion.format || "Standpunkt",
      title: opinion.title,
      teaser: opinion.teaser || "",
      author: opinion.author,
      date: opinion.date,
      readingMinutesComputed: getReadingMinutes(opinion),
      href: resolveUrl(opinion.href || "#standpunkte"),
      image: opinion.image,
      imageAlt: opinion.imageAlt,
      imageTone: opinion.imageTone,
      showCover: hasArticlePage(opinion),
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
        .map((item) => {
          const media =
            item.kind === "article" || item.showCover
              ? `<span class="search-result-media">${renderArticleCover(item, { variant: "search" })}</span>`
              : "";

          return `
        <a class="search-result" href="${escapeHtml(item.href)}">
          ${media}
          <span class="search-result-body">
            <p class="${labelClassName(item.type)}">${escapeHtml(item.type)}</p>
            <span class="search-result-title">${escapeHtml(item.title)}</span>
            ${
              item.teaser
                ? `<p class="search-result-teaser">${escapeHtml(shortenTeaser(item.teaser))}</p>`
                : ""
            }
            ${renderCreditLine(item, { className: "meta search-result-meta" })}
          </span>
        </a>
      `;
        })
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

  /** Fill article hero from the central `image` field – no hardcoded cover paths in HTML. */
  const initArticleCover = () => {
    const figure = document.querySelector(".article-page .article-hero");
    if (!figure) return;

    const article = findArticleForCurrentPage();
    if (!article) {
      figure.hidden = true;
      figure.innerHTML = "";
      return;
    }

    figure.hidden = false;
    figure.innerHTML = renderArticleCover(article, { variant: "hero" });

    const caption = typeof article.imageCaption === "string" ? article.imageCaption.trim() : "";
    if (caption && getArticleCover(article)) {
      figure.insertAdjacentHTML(
        "beforeend",
        `<figcaption>${escapeHtml(caption)}</figcaption>`
      );
    }
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

  /**
   * Thin reading-progress line for article pages.
   * Progress is measured against `.article-body` only (not header/footer/related).
   */
  const initArticleReadingProgress = () => {
    const page = document.querySelector(".article-page");
    const content = page?.querySelector(".article-body");
    if (!page || !content) return;
    if (document.querySelector(".reading-progress")) return;

    const track = document.createElement("div");
    track.className = "reading-progress";
    track.setAttribute("aria-hidden", "true");
    track.innerHTML = '<div class="reading-progress__fill"></div>';
    document.body.prepend(track);

    const fill = track.firstElementChild;
    let contentTop = 0;
    let contentHeight = 0;
    let ticking = false;

    const measure = () => {
      const rect = content.getBoundingClientRect();
      contentTop = rect.top + window.scrollY;
      contentHeight = content.offsetHeight;
    };

    const applyProgress = (progress) => {
      fill.style.transform = `scaleX(${progress})`;
    };

    const update = () => {
      ticking = false;
      const viewportHeight = window.innerHeight || 1;
      const scrollY = window.scrollY;
      const start = contentTop;
      const end = contentTop + contentHeight - viewportHeight;
      let progress = 0;

      if (end <= start) {
        progress = scrollY + viewportHeight >= contentTop + contentHeight ? 1 : 0;
      } else {
        progress = (scrollY - start) / (end - start);
      }

      applyProgress(Math.min(1, Math.max(0, progress)));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize);
  };

  const boot = async () => {
    initArticleSeo();
    initArticleCover();

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
    initArticleReadingProgress();
    initChrome();
    initReveal();
  };

  initArticleSeo();
  boot();
})();
