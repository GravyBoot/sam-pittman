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
   Filters skill items by data-category. Manages:
   - aria-pressed on filter buttons
   - data-hidden attribute on skill items
   - empty state visibility
   - keyboard: arrow key navigation within the filter group
   ============================================================ */
function initSkillFilter() {
  const filterGroup = qs('.skills-filters');
  const filterBtns  = qsa('.filter-btn', filterGroup || document);
  const skillItems  = qsa('.skill-item');
  const emptyState  = qs('#skills-empty');

  if (!filterBtns.length || !skillItems.length) return;

  function applyFilter(activeFilter) {
    let visibleCount = 0;

    skillItems.forEach(item => {
      const category = item.getAttribute('data-category');
      const matches  = activeFilter === 'all' || category === activeFilter;

      if (matches) {
        item.removeAttribute('data-hidden');
        visibleCount++;
      } else {
        item.setAttribute('data-hidden', 'true');
      }
    });

    // Show/hide empty state
    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }
  }

  function setActiveBtn(activeBtn) {
    filterBtns.forEach(btn => {
      const isActive = btn === activeBtn;
      btn.setAttribute('aria-pressed', String(isActive));
      btn.classList.toggle('filter-btn--active', isActive);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      setActiveBtn(btn);
      applyFilter(filter);
    });
  });

  // Keyboard: arrow keys move focus within filter group
  if (filterGroup) {
    filterGroup.addEventListener('keydown', (e) => {
      const focusedBtn = document.activeElement;
      if (!filterBtns.includes(focusedBtn)) return;

      const idx = filterBtns.indexOf(focusedBtn);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = filterBtns[(idx + 1) % filterBtns.length];
        next.focus();
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = filterBtns[(idx - 1 + filterBtns.length) % filterBtns.length];
        prev.focus();
      }

      if (e.key === 'Home') {
        e.preventDefault();
        filterBtns[0].focus();
      }

      if (e.key === 'End') {
        e.preventDefault();
        filterBtns[filterBtns.length - 1].focus();
      }
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
   6. CONTACT FORM
   Client-side validation with:
   - Inline per-field error messages
   - aria-invalid + aria-describedby for screen readers
   - Success state replaces form on valid submit
   - Loading state on submit button during async "send"
   ============================================================ */
function initContactForm() {
  const form       = qs('#contact-form');
  const submitBtn  = qs('#submit-btn', form || document);
  const successEl  = qs('#form-success');

  if (!form || !submitBtn || !successEl) return;

  /* ---- Validation rules ---- */
  const validators = {
    name: {
      el:       () => qs('#field-name'),
      errorEl:  () => qs('#error-name'),
      groupEl:  () => qs('#group-name'),
      validate: (val) => {
        if (!val.trim()) return 'Name is required.';
        if (val.trim().length < 2) return 'Name must be at least 2 characters.';
        return null;
      },
    },
    email: {
      el:       () => qs('#field-email'),
      errorEl:  () => qs('#error-email'),
      groupEl:  () => qs('#group-email'),
      validate: (val) => {
        if (!val.trim()) return 'Email address is required.';
        // RFC 5322-ish simple check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
          return 'Please enter a valid email address.';
        }
        return null;
      },
    },
    message: {
      el:       () => qs('#field-message'),
      errorEl:  () => qs('#error-message'),
      groupEl:  () => qs('#group-message'),
      validate: (val) => {
        if (!val.trim()) return 'A message is required.';
        if (val.trim().length < 10) return 'Message must be at least 10 characters.';
        return null;
      },
    },
  };

  /* ---- Show an error on a single field ---- */
  function showError(config, message) {
    const input   = config.el();
    const errorEl = config.errorEl();
    const groupEl = config.groupEl();

    if (!input || !errorEl || !groupEl) return;

    input.setAttribute('aria-invalid', 'true');
    errorEl.textContent = message;
    groupEl.classList.add('form-group--error');
  }

  /* ---- Clear error on a single field ---- */
  function clearError(config) {
    const input   = config.el();
    const errorEl = config.errorEl();
    const groupEl = config.groupEl();

    if (!input || !errorEl || !groupEl) return;

    input.removeAttribute('aria-invalid');
    errorEl.textContent = '';
    groupEl.classList.remove('form-group--error');
  }

  /* ---- Validate a single field, returns error string or null ---- */
  function validateField(config) {
    const input = config.el();
    if (!input) return null;
    const error = config.validate(input.value);
    if (error) {
      showError(config, error);
    } else {
      clearError(config);
    }
    return error;
  }

  /* ---- Validate all fields, return whether form is valid ---- */
  function validateAll() {
    const errors = Object.values(validators).map(config => validateField(config));
    return errors.every(e => e === null);
  }

  /* ---- Live validation: clear errors as user corrects input ---- */
  Object.values(validators).forEach(config => {
    const input = config.el();
    if (!input) return;

    // Validate on blur (not on every keystroke — less noisy)
    input.addEventListener('blur', () => validateField(config));

    // Clear error immediately when user starts typing after an error
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        clearError(config);
      }
    });
  });

  /* ---- Submit handler ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isValid = validateAll();

    if (!isValid) {
      // Focus the first invalid field for keyboard users
      const firstInvalid = qs('[aria-invalid="true"]', form);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Loading state
    setSubmitLoading(true);

    try {
      // Simulate async send (replace with real fetch in production)
      await simulateSend();

      // Success: hide form fields, show confirmation
      showSuccess();
    } catch (err) {
      // Network / server error — show a top-level message
      showSubmitError('Something went wrong. Please try again or email me directly.');
      setSubmitLoading(false);
    }
  });

  /* ---- Loading state helpers ---- */
  function setSubmitLoading(isLoading) {
    submitBtn.setAttribute('data-loading', String(isLoading));
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Sending…' : 'Send Message';
  }

  /* ---- Success state ---- */
  function showSuccess() {
    // Hide all form controls
    qsa('.form-group, .form-actions', form).forEach(el => {
      el.hidden = true;
    });

    // Show success message
    successEl.hidden = false;
    successEl.focus();
  }

  /* ---- Top-level submit error (non-field-specific) ---- */
  function showSubmitError(message) {
    // Reuse or create a top-level error element
    let errEl = qs('#submit-error', form);
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.id = 'submit-error';
      errEl.setAttribute('role', 'alert');
      errEl.setAttribute('aria-live', 'assertive');
      errEl.classList.add('form-error');
      qs('.form-actions', form).after(errEl);
    }
    errEl.textContent = message;
  }

  /* ---- Simulated async send (replace with real endpoint) ---- */
  function simulateSend() {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
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
  initContactForm();
});
