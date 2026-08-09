(() => {
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

      newsletterNote.textContent = "Vielen Dank – der Newsletter ist vorbereitet, die Anmeldung folgt später.";
      newsletterForm.reset();
    });
  }

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
})();
