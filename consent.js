(() => {
  const MEASUREMENT_ID = "G-MF07G0LWJP";
  const STORAGE_KEY = "freiraum-consent";
  const STATES = { NECESSARY: "necessary", ANALYTICS: "analytics" };
  const DEPTHS = [25, 50, 75, 90];

  const siteRoot = document.body?.dataset?.siteRoot || "";
  const datenschutzHref = `${siteRoot}datenschutz.html`;

  const firedDepths = new Set();
  let analyticsLoaded = false;
  let analyticsAllowed = false;
  let bannerEl = null;

  const getConsent = () => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === STATES.ANALYTICS || value === STATES.NECESSARY) return value;
    } catch {
      /* private mode / blocked storage */
    }
    return null;
  };

  const setConsent = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  };

  const hasGtagScript = () =>
    Boolean(
      document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`) ||
        document.querySelector(`script[src*="google-analytics.com"]`)
    );

  const injectStyles = () => {
    if (document.getElementById("freiraum-consent-css")) return;
    const style = document.createElement("style");
    style.id = "freiraum-consent-css";
    style.textContent = `
.consent-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80;
  background: var(--white, #fbf9f4);
  color: var(--ink, #1c2420);
  border-top: 1px solid var(--line-strong, #b9ae9a);
  box-shadow: 0 -12px 40px color-mix(in srgb, var(--green-deep, #152821) 10%, transparent);
}
.consent-banner__inner {
  max-width: var(--measure, 72rem);
  margin: 0 auto;
  padding: 1.15rem var(--gutter, 1.5rem) 1.2rem;
}
.consent-banner__kicker {
  font-family: var(--font-sans, inherit);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--terracotta, #9a5640);
  margin: 0 0 0.45rem;
}
.consent-banner__text {
  font-family: var(--font-serif, Georgia, serif);
  font-size: 1.02rem;
  line-height: 1.5;
  color: var(--ink-soft, #3f4943);
  margin: 0;
  max-width: 46rem;
}
.consent-banner__text a {
  color: var(--green, #1e3a30);
}
.consent-banner__status {
  margin: 0.7rem 0 0;
  font-size: 0.9rem;
  color: var(--muted, #66706a);
}
.consent-banner__details {
  margin-top: 0.85rem;
  padding: 0.85rem 0 0;
  border-top: 1px solid var(--line, #d4cbbb);
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--ink-soft, #3f4943);
}
.consent-banner__details[hidden] {
  display: none;
}
.consent-banner__details p {
  margin: 0 0 0.55rem;
}
.consent-banner__details p:last-child {
  margin-bottom: 0;
}
.consent-banner__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-top: 1rem;
  max-width: 28rem;
}
.consent-btn {
  font-family: var(--font-sans, inherit);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.2;
  padding: 0.72rem 1rem;
  border-radius: 2px;
  cursor: pointer;
  width: 100%;
  min-height: 2.75rem;
}
.consent-btn--necessary,
.consent-btn--analytics {
  border: 1px solid var(--green, #1e3a30);
}
.consent-btn--necessary {
  background: var(--bg-elevated, #f8f5ee);
  color: var(--green, #1e3a30);
}
.consent-btn--necessary:hover {
  background: var(--bg, #f3efe6);
}
.consent-btn--analytics {
  background: var(--green, #1e3a30);
  color: var(--white, #fbf9f4);
}
.consent-btn--analytics:hover {
  background: var(--green-deep, #152821);
}
.consent-btn--settings {
  grid-column: 1 / -1;
  background: none;
  border: 0;
  color: var(--terracotta, #9a5640);
  font-weight: 500;
  min-height: auto;
  padding: 0.25rem 0 0;
  text-decoration: underline;
  text-underline-offset: 0.18em;
  width: auto;
  justify-self: start;
}
.consent-btn--settings:hover {
  color: var(--green, #1e3a30);
}
@media (max-width: 640px) {
  .consent-banner__inner {
    padding: 1rem 1.1rem 1.1rem;
  }
  .consent-banner__text {
    font-size: 0.98rem;
  }
  .consent-banner__actions {
    max-width: none;
  }
}
`;
    document.head.appendChild(style);
  };

  const articleContext = () => {
    const page = document.querySelector(".article-page");
    if (!page) return null;
    const params = {
      article_path: window.location.pathname || "/"
    };
    const title = page.querySelector(".article-title")?.textContent?.trim();
    const category = page.querySelector(".article-header .label")?.textContent?.trim();
    if (title) params.article_title = title;
    if (category) params.article_category = category;
    return params;
  };

  const track = (name, params) => {
    if (!analyticsAllowed || typeof window.gtag !== "function") return;
    window.gtag("event", name, params || {});
  };

  const analyticsCookieNames = () => {
    const names = new Set(["_ga", "_gid", "_gat", `_ga_${MEASUREMENT_ID.replace(/^G-/, "")}`]);
    document.cookie.split(";").forEach((part) => {
      const name = part.split("=")[0].trim();
      if (name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_")) {
        names.add(name);
      }
    });
    return [...names];
  };

  const deleteAnalyticsCookies = () => {
    const host = window.location.hostname.replace(/^www\./, "");
    const domains = ["", window.location.hostname];
    if (host && host !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      domains.push(`.${host}`);
    }
    const suffixes = [
      "",
      "; Secure",
      "; SameSite=Lax",
      "; Secure; SameSite=Lax",
      "; Secure; SameSite=None"
    ];
    analyticsCookieNames().forEach((name) => {
      domains.forEach((domain) => {
        suffixes.forEach((suffix) => {
          const domainPart = domain ? `; domain=${domain}` : "";
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}${suffix}`;
        });
      });
    });
  };

  const loadAnalytics = () => {
    if (analyticsLoaded || hasGtagScript()) {
      analyticsLoaded = true;
      analyticsAllowed = true;
      return;
    }
    analyticsLoaded = true;
    analyticsAllowed = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("config", MEASUREMENT_ID, {
      anonymize_ip: true
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
    initArticleDepth();
  };

  const denyAnalytics = () => {
    analyticsAllowed = false;
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied"
      });
    }
    deleteAnalyticsCookies();
  };

  const articleDepthPercent = (content) => {
    const rect = content.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const height = content.offsetHeight;
    if (height <= 0) return 0;
    const revealed = window.scrollY + window.innerHeight - top;
    return Math.min(100, Math.max(0, (revealed / height) * 100));
  };

  const initArticleDepth = () => {
    if (!analyticsAllowed) return;
    const content = document.querySelector(".article-page .article-body");
    if (!content) return;
    const params = articleContext();
    if (!params) return;

    const check = () => {
      const percent = articleDepthPercent(content);
      DEPTHS.forEach((mark) => {
        if (percent >= mark && !firedDepths.has(mark)) {
          firedDepths.add(mark);
          track(`article_read_${mark}`, params);
        }
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        check();
      });
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  };

  const closeBanner = () => {
    if (!bannerEl) return;
    bannerEl.remove();
    bannerEl = null;
  };

  const currentStatusText = () => {
    const stored = getConsent();
    if (stored === STATES.ANALYTICS) {
      return "Aktuell ist Statistik (Google Analytics) aktiv.";
    }
    if (stored === STATES.NECESSARY) {
      return "Aktuell sind nur notwendige Funktionen aktiv.";
    }
    return "";
  };

  const applyChoice = (value) => {
    setConsent(value);
    if (value === STATES.ANALYTICS) {
      loadAnalytics();
    } else {
      denyAnalytics();
    }
    closeBanner();
  };

  const openBanner = () => {
    injectStyles();
    if (bannerEl) {
      bannerEl.querySelector(".consent-btn--settings")?.focus();
      return;
    }

    bannerEl = document.createElement("div");
    bannerEl.className = "consent-banner";
    bannerEl.setAttribute("role", "dialog");
    bannerEl.setAttribute("aria-modal", "false");
    bannerEl.setAttribute("aria-labelledby", "consent-banner-title");
    bannerEl.innerHTML = `
      <div class="consent-banner__inner">
        <p class="consent-banner__kicker" id="consent-banner-title">Datenschutz</p>
        <p class="consent-banner__text">
          FREIRAUM verwendet technisch notwendige Funktionen und – mit deiner Zustimmung – Google Analytics, um zu verstehen, welche Beiträge gelesen werden und wie das Magazin genutzt wird.
          Mehr dazu in der <a href="${datenschutzHref}">Datenschutzerklärung</a>.
        </p>
        <p class="consent-banner__status" data-consent-status></p>
        <div class="consent-banner__details" hidden>
          <p><strong>Notwendig:</strong> immer aktiv. Damit die Seiten angezeigt und grundlegende Funktionen bereitgestellt werden können.</p>
          <p><strong>Statistik:</strong> Google Analytics 4, nur nach ausdrücklicher Zustimmung. Damit können Seitenaufrufe, Herkunft und die Nutzung von Artikeln ausgewertet werden. Keine vorausgewählte Zustimmung.</p>
        </div>
        <div class="consent-banner__actions">
          <button type="button" class="consent-btn consent-btn--necessary" data-consent="necessary">Nur notwendige</button>
          <button type="button" class="consent-btn consent-btn--analytics" data-consent="analytics">Statistik erlauben</button>
          <button type="button" class="consent-btn consent-btn--settings" data-consent="settings" aria-expanded="false">Einstellungen</button>
        </div>
      </div>
    `;

    const status = bannerEl.querySelector("[data-consent-status]");
    const statusText = currentStatusText();
    if (statusText) status.textContent = statusText;
    else status.remove();

    bannerEl.querySelector("[data-consent='necessary']").addEventListener("click", () => {
      applyChoice(STATES.NECESSARY);
    });
    bannerEl.querySelector("[data-consent='analytics']").addEventListener("click", () => {
      applyChoice(STATES.ANALYTICS);
    });
    const settingsBtn = bannerEl.querySelector("[data-consent='settings']");
    const details = bannerEl.querySelector(".consent-banner__details");
    settingsBtn.addEventListener("click", () => {
      const open = details.hasAttribute("hidden");
      if (open) details.removeAttribute("hidden");
      else details.setAttribute("hidden", "");
      settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.body.appendChild(bannerEl);
  };

  const addFooterLink = () => {
    const list = document.querySelector(".footer-nav ul");
    if (!list || list.querySelector("[data-consent-open]")) return;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#cookie-einstellungen";
    link.dataset.consentOpen = "true";
    link.textContent = "Cookie-Einstellungen";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openBanner();
    });
    item.appendChild(link);
    list.appendChild(item);
  };

  const boot = () => {
    addFooterLink();
    const stored = getConsent();
    if (stored === STATES.ANALYTICS) {
      loadAnalytics();
      return;
    }
    if (stored === STATES.NECESSARY) {
      denyAnalytics();
      return;
    }
    openBanner();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
