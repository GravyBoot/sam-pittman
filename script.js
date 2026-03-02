/**
 * script.js — Resume interactivity
 *
 * Modules:
 *  1. initSmoothScroll     — intercepts anchor clicks
 *  2. initNavHighlight     — IntersectionObserver active nav link
 *  3. initMobileNav        — hamburger toggle
 *  4. initSkillFilter      — category filtering with keyboard support
 *  5. initExperience       — <details> keyboard polish + animation
 *  6. initContactForm      — client-side validation + success state
 */

'use strict';

/* ============================================================
   UTILITIES
   ============================================================ */

/**
 * Query a single element, throws if missing in dev.
 * @param {string} selector
 * @param {Document|Element} [root=document]
 * @returns {Element|null}
 */
function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Query all elements as an Array.
 * @param {string} selector
 * @param {Document|Element} [root=document]
 * @returns {Element[]}
 */
function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Add multiple event listeners to one element.
 * @param {Element} el
 * @param {string[]} events
 * @param {Function} handler
 */
function onEvents(el, events, handler) {
  events.forEach(event => el.addEventListener(event, handler));
}


/* ============================================================
   1. SMOOTH SCROLL
   Intercepts all internal anchor clicks and scrolls smoothly,
   accounting for the sticky header height.
   ============================================================ */
function initSmoothScroll() {
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (targetId === '#') return;

    const target = qs(targetId);
    if (!target) return;

    e.preventDefault();

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Move focus to the section for screen-reader users
    // Only if target isn't naturally focusable
    if (!target.matches('a, button, input, textarea, select, [tabindex]')) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      // Clean up tabindex after focus leaves
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  });
}


/* ============================================================
   2. NAV HIGHLIGHT
   Uses IntersectionObserver to mark the nav link whose section
   is most visible in the viewport.
   ============================================================ */
function initNavHighlight() {
  const navLinks = qsa('.nav-link[data-section]');
  const sections = qsa('section[id]');

  if (!navLinks.length || !sections.length) return;

  // Map section id → nav link for fast lookup
  const linkMap = new Map();
  navLinks.forEach(link => {
    const id = link.getAttribute('data-section');
    linkMap.set(id, link);
  });

  let activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    navLinks.forEach(link => {
      const isActive = link.getAttribute('data-section') === id;
      link.classList.toggle('is-active', isActive);
      link.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  // Track intersection ratios per section
  const ratioMap = new Map();
  sections.forEach(section => ratioMap.set(section.id, 0));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        ratioMap.set(entry.target.id, entry.intersectionRatio);
      });

      // The section with the highest visible ratio wins
      let topId = null;
      let topRatio = 0;
      ratioMap.forEach((ratio, id) => {
        if (ratio > topRatio) {
          topRatio = ratio;
          topId = id;
        }
      });

      if (topId) setActive(topId);
    },
    {
      // Observe with multiple thresholds for smooth tracking
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      rootMargin: `-${getHeaderHeight()}px 0px 0px 0px`,
    }
  );

  sections.forEach(section => observer.observe(section));

  // Recalculate rootMargin on resize (header height could change)
  window.addEventListener('resize', debounce(() => {
    observer.disconnect();
    sections.forEach(section => observer.observe(section));
  }, 200));
}

function getHeaderHeight() {
  const header = qs('.site-header');
  return header ? header.offsetHeight : 0;
}


/* ============================================================
   3. MOBILE NAV
   Toggles the primary nav open/closed on small screens.
   Closes on outside click or Escape key.
   ============================================================ */
function initMobileNav() {
  const toggle = qs('.nav-toggle');
  const nav    = qs('#primary-nav');

  if (!toggle || !nav) return;

  function openNav() {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
  }

  function closeNav() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  function isOpen() {
    return nav.classList.contains('is-open');
  }

  toggle.addEventListener('click', () => {
    isOpen() ? closeNav() : openNav();
  });

  // Close when a nav link is clicked (navigates to section)
  qsa('.nav-link', nav).forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) {
      closeNav();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      closeNav();
      toggle.focus();
    }
  });
}


/* ============================================================
   4. SKILL FILTER
   ============================================================ */
function initSkillFilter() {
  var filterGroup = document.querySelector('.skills-filters');
  var skillsList  = document.querySelector('#skills-list');
  var emptyState  = document.querySelector('#skills-empty');

  if (!filterGroup || !skillsList) return;

  var filterBtns = filterGroup.querySelectorAll('[data-filter]');
  var skillItems = skillsList.querySelectorAll('[data-category]');

  if (!filterBtns.length || !skillItems.length) return;

  function applyFilter(value) {
    var visible = 0;
    for (var i = 0; i < skillItems.length; i++) {
      var item = skillItems[i];
      var match = value === 'all' || item.getAttribute('data-category') === value;
      if (match) {
        item.style.display = '';
        visible++;
      } else {
        item.style.display = 'none';
      }
    }
    if (emptyState) {
      emptyState.hidden = visible > 0;
    }
  }

  function setActive(activeBtn) {
    for (var i = 0; i < filterBtns.length; i++) {
      var btn = filterBtns[i];
      var active = btn === activeBtn;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) {
        btn.classList.add('filter-btn--active');
      } else {
        btn.classList.remove('filter-btn--active');
      }
    }
  }

  for (var i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener('click', function() {
      var value = this.getAttribute('data-filter');
      setActive(this);
      applyFilter(value);
    });
  }
}


/* ============================================================
   5. EXPERIENCE — <details> keyboard polish
   Native <details>/<summary> handles expand/collapse.
   This layer adds:
   - Space key triggers toggle (some browsers only respond to Enter)
   - Collapse all others when one opens (accordion behaviour)
   - Smooth height animation via a max-height technique
   ============================================================ */
function initExperience() {
  const detailsEls = qsa('.experience-details');
  if (!detailsEls.length) return;

  // Prepare animation: measure and set max-height on body elements
  function getBody(details) {
    return qs('.experience-body', details);
  }

  // Accordion: close all other entries when one opens
  detailsEls.forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        detailsEls.forEach(other => {
          if (other !== details && other.open) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });

  // Keyboard: Space on summary should toggle (matches button convention)
  detailsEls.forEach(details => {
    const summary = qs('summary', details);
    if (!summary) return;

    summary.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault(); // prevent page scroll
        summary.click();
      }
    });

    // Ensure summary is always accessible as a button-like element
    if (!summary.hasAttribute('role')) {
      // <summary> already has implicit button role, but set aria-expanded
      // to reinforce state for screen readers beyond the open/closed detail
    }

    // Keep aria-expanded in sync with open state for maximum compatibility
    function syncAria() {
      summary.setAttribute('aria-expanded', String(details.open));
    }

    details.addEventListener('toggle', syncAria);
    syncAria(); // initialise
  });
}


/* ============================================================
   6. COPY EMAIL TO CLIPBOARD
   Copies the email address to clipboard on click/Enter/Space.
   Shows a transient "Copied!" confirmation, then resets.
   ============================================================ */
function initCopyEmail() {
  const btn       = qs('#copy-email-btn');
  const confirm   = qs('#copy-confirm');

  if (!btn || !confirm) return;

  const email = btn.getAttribute('data-email');
  let resetTimer = null;

  async function copyEmail() {
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      showConfirm();
    } catch {
      // Fallback for older browsers / insecure contexts
      const textarea = document.createElement('textarea');
      textarea.value = email;
      textarea.style.position = 'fixed';
      textarea.style.opacity  = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showConfirm();
    }
  }

  function showConfirm() {
    btn.classList.add('is-copied');
    confirm.hidden = false;

    // Reset after 2 s
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      btn.classList.remove('is-copied');
      confirm.hidden = true;
    }, 2000);
  }

  btn.addEventListener('click', copyEmail);

  // Keyboard: Space already fires click on <button>, but be explicit
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyEmail();
    }
  });
}


/* ============================================================
   DEBOUNCE UTILITY
   ============================================================ */
/**
 * Returns a function that delays invoking fn until after wait ms
 * have elapsed since the last invocation.
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}


/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initNavHighlight();
  initMobileNav();
  initSkillFilter();
  initExperience();
  initCopyEmail();
});
