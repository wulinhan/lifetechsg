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
