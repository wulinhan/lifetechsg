// Home-size pricing tabs
const tabs = document.querySelectorAll('.size-tab');
const panels = document.querySelectorAll('.size-panel');

tabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    tabs.forEach(function (t) {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');

    panels.forEach(function (panel) {
      const isMatch = panel.id === 'panel-' + tab.dataset.size;
      panel.classList.toggle('is-active', isMatch);
      panel.hidden = !isMatch;
    });
  });
});

// Lead magnet form: posts to the Vercel function which emails the
// housing-specific guide via Resend. If the API is unavailable (e.g. a
// static-only deployment), falls back to a direct download.
const LEAD_API = '/api/lead';
const GUIDES = {
  '3-Room': 'assets/guides/no-reno-smart-home-guide-3-room.pdf',
  '4-Room': 'assets/guides/no-reno-smart-home-guide-4-room.pdf',
  '5-Room': 'assets/guides/no-reno-smart-home-guide-5-room.pdf',
  'More': 'assets/guides/no-reno-smart-home-guide-multi-storey.pdf'
};

const leadForm = document.getElementById('leadForm');

if (leadForm) {
  const fields = {
    name: {
      el: document.getElementById('leadName'),
      err: document.getElementById('err-name'),
      valid: function (v) { return v.trim().length >= 2; }
    },
    email: {
      el: document.getElementById('leadEmail'),
      err: document.getElementById('err-email'),
      valid: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }
    },
    phone: {
      el: document.getElementById('leadPhone'),
      err: document.getElementById('err-phone'),
      // Singapore mobile: optional +65, then 8 digits starting with 8 or 9
      valid: function (v) { return /^(?:\+?65)?[89]\d{7}$/.test(v.replace(/[\s-]/g, '')); }
    },
    housing: {
      el: document.getElementById('leadHome'),
      err: document.getElementById('err-home'),
      valid: function (v) { return v !== ''; }
    }
  };

  function showFieldState(field, ok) {
    field.el.classList.toggle('is-invalid', !ok);
    field.err.hidden = ok;
    field.el.setAttribute('aria-invalid', ok ? 'false' : 'true');
  }

  Object.keys(fields).forEach(function (key) {
    ['input', 'change'].forEach(function (evt) {
      fields[key].el.addEventListener(evt, function () {
        if (fields[key].el.classList.contains('is-invalid')) {
          showFieldState(fields[key], fields[key].valid(fields[key].el.value));
        }
      });
    });
  });

  function showSuccess(emailed, email, housing) {
    leadForm.hidden = true;
    const box = document.getElementById('leadSuccess');
    const title = document.getElementById('leadSuccessTitle');
    const msg = document.getElementById('leadSuccessMsg');
    const fallback = document.getElementById('leadFallback');
    const guidePath = GUIDES[housing] || GUIDES['4-Room'];
    fallback.href = guidePath;
    if (emailed) {
      title.textContent = 'Check your inbox';
      msg.childNodes[0].textContent = 'Thanks! Your ' + housing + ' guide is on its way to ' + email + '. Can’t find it? Check spam, or ';
    } else {
      title.textContent = 'Your guide is downloading';
      msg.childNodes[0].textContent = 'Thanks! If the download didn’t start, ';
      const link = document.createElement('a');
      link.href = guidePath;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    box.hidden = false;
  }

  leadForm.addEventListener('submit', function (e) {
    e.preventDefault();

    let allValid = true;
    let firstInvalid = null;
    Object.keys(fields).forEach(function (key) {
      const ok = fields[key].valid(fields[key].el.value);
      showFieldState(fields[key], ok);
      if (!ok) {
        allValid = false;
        if (!firstInvalid) firstInvalid = fields[key].el;
      }
    });
    if (!allValid) {
      firstInvalid.focus();
      return;
    }

    const submitBtn = document.getElementById('leadSubmit');
    submitBtn.disabled = true;

    const email = fields.email.el.value.trim();
    const housing = fields.housing.el.value;
    const payload = {
      name: fields.name.el.value.trim(),
      email: email,
      whatsapp: fields.phone.el.value.replace(/[\s-]/g, ''),
      housing: housing,
      source: 'no-reno-guide-banner'
    };

    fetch(LEAD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      showSuccess(res.ok, email, housing);
    }).catch(function () {
      showSuccess(false, email, housing);
    });
  });
}

// Google reviews.
// Fill this array with genuine reviews (copy them from your Google Business
// profile). Leave it empty and the whole section hides itself, so the page
// never shows a placeholder or an invented review. Avatars are drawn from the
// reviewer's initials — no photo hotlinking needed.
//   { name: 'Jane T.', when: '2 weeks ago', stars: 5, text: 'What they wrote.' }
const REVIEWS = [];

(function renderReviews() {
  const section = document.getElementById('reviews');
  const grid = document.getElementById('reviewsGrid');
  if (!section || !grid) return;

  if (!REVIEWS.length) {
    section.hidden = true;
    return;
  }

  // Deterministic avatar tint from the name, drawn from the brand palette.
  const TINTS = ['#1a9e8f', '#2f6fed', '#e0665f', '#c99a2e', '#6b4fd8', '#3f8f3f'];
  function tintFor(name) {
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return TINTS[sum % TINTS.length];
  }
  function initials(name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0] ? parts[0][0] : '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  const gLogo =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z"/>' +
    '<path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8H1.8v3C3.7 21.4 7.5 24 12 24z"/>' +
    '<path fill="#FBBC05" d="M5.6 14.6a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3z"/>' +
    '<path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.7 2.6 1.8 6.4l3.8 3C6.5 6.7 9 4.8 12 4.8z"/>' +
    '</svg>';

  grid.innerHTML = REVIEWS.map(function (r) {
    const stars = '★★★★★'.slice(0, r.stars || 5) + '☆☆☆☆☆'.slice(0, 5 - (r.stars || 5));
    return (
      '<article class="review-card">' +
        '<div class="review-top">' +
          '<span class="review-avatar" style="background:' + tintFor(r.name) + '" aria-hidden="true">' + initials(r.name) + '</span>' +
          '<div class="review-who">' +
            '<span class="review-name">' + r.name + '</span>' +
            '<span class="review-when">' + (r.when || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<span class="review-stars" aria-label="' + (r.stars || 5) + ' out of 5 stars">' + stars + '</span>' +
        '<p class="review-text">' + r.text + '</p>' +
        '<span class="review-source">' + gLogo + 'Posted on Google</span>' +
      '</article>'
    );
  }).join('');
})();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', function () {
    const open = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  siteNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}
