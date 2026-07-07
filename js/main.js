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

// Lead magnet form
// To capture leads, set LEAD_ENDPOINT to a form backend URL
// (e.g. a Formspree endpoint like https://formspree.io/f/XXXXXXXX).
// Leave empty to skip network submission and just serve the download.
const LEAD_ENDPOINT = '';
const GUIDE_PATH = 'assets/no-reno-smart-home-guide.pdf';

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
    fields[key].el.addEventListener('input', function () {
      if (fields[key].el.classList.contains('is-invalid')) {
        showFieldState(fields[key], fields[key].valid(fields[key].el.value));
      }
    });
    fields[key].el.addEventListener('change', function () {
      if (fields[key].el.classList.contains('is-invalid')) {
        showFieldState(fields[key], fields[key].valid(fields[key].el.value));
      }
    });
  });

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

    const payload = {
      name: fields.name.el.value.trim(),
      email: fields.email.el.value.trim(),
      whatsapp: fields.phone.el.value.replace(/[\s-]/g, ''),
      housing: fields.housing.el.value,
      source: 'no-reno-guide-banner'
    };

    function finish() {
      leadForm.hidden = true;
      document.getElementById('leadSuccess').hidden = false;
      const link = document.createElement('a');
      link.href = GUIDE_PATH;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    if (LEAD_ENDPOINT) {
      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () {}).finally(finish);
    } else {
      finish();
    }
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
