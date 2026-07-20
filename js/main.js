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
// Genuine reviews from the Life Tech SG Google Business profile. `photos` are
// the images each reviewer attached, shown as small squircle thumbnails above
// the text (tap to enlarge). Missing files are skipped, so nothing looks broken.
// Leave the array empty and the whole section hides itself.
const REVIEWS = [
  {
    name: 'Alvin Lim', when: '5 months ago', stars: 5,
    photos: ['assets/reviews/alvin-1.webp', 'assets/reviews/alvin-2.webp'],
    text: 'First-time homeowner working with smart home systems and had a great experience with Mike. Installer Clarence was professional and knowledgeable. They took the time to explain everything clearly and shared in-depth tips on how I can continue expanding and using my smart home devices. Highly recommend.'
  },
  {
    name: 'Erika Rugdee', when: '2 months ago', stars: 5,
    photos: ['assets/reviews/erika-1.webp', 'assets/reviews/erika-2.webp', 'assets/reviews/erika-3.webp'],
    text: 'Had a really smooth experience with Life Tech SG, especially working with Mike on our smart home setup. I’m honestly not a tech person at all, but the whole process was very easy and fuss-free. Mike handled pretty much everything from start to finish, explaining things in a simple way, giving practical suggestions, and setting everything up without overwhelming us. I was quite hands-off throughout, mostly just choosing from the different switch designs to match our home. What I appreciated was how seamless everything felt. There was no complicated setup on our end, and Mike made sure everything worked properly before handing over. And honestly, who knew you could automate so much? From the aircon turning on before we get home to setting timers for things like the cooker hob to switch off. It just makes daily life a lot easier and gives extra peace of mind. Now that we’ve moved in, it’s been a game changer. Coming home is so convenient, lights, aircon, and other settings are all just a touch away, or even automatic when we walk into a room. It’s one of those upgrades you don’t realise you need until you have it. Best part is no hard sales and the best after sales service. Mike was ready any time to answer our questions and even coming down multiple times to assist us. Tech dummy approved! 10/10 recommend!'
  },
  {
    name: 'Syed Umar', when: 'a year ago', stars: 5,
    photos: ['assets/reviews/syed-1.webp', 'assets/reviews/syed-2.webp', 'assets/reviews/syed-3.webp', 'assets/reviews/syed-4.webp'],
    text: 'Decided to go with Life Tech SG after meeting with a few smart companies. Mike’s education on his social media pages really helps and on the 1st meeting, he was very detailed but not confusing and really met our simple demands. Liaising with our contractor is a breeze and completion done perfectly. Clarence is also a tremendous help, right from setting up and after sales service. He really went the extra mile and came back during off days to assist. 100% recommended and definitely will engage Life Tech SG for future services and referral. Customer Service is impeccable!'
  },
  {
    name: 'AT AT', when: '2 years ago', stars: 5,
    photos: ['assets/reviews/at-1.webp', 'assets/reviews/at-2.webp'],
    text: 'Mike is the guy to look for if you need smart home setup, the team is professional before and after installation. Always prompt in their reply. No hard selling and Johnny did a great job on the installation and integration too. Strongly recommended.'
  },
  {
    name: 'jaschintaz', when: '3 years ago', stars: 5,
    photos: ['assets/reviews/jaschinta-1.webp', 'assets/reviews/jaschinta-2.webp', 'assets/reviews/jaschinta-3.webp'],
    text: 'This is a great place to start if you are as clueless about smart home devices as me. Mike was very patient with me and explained about the various smart home options available, and compatible apps, devices and appliances. The showroom is divided into the smart living room, smart bedroom and smart kitchen, and a general area with the other smart appliances. From the demo conducted showrooms, you can get an idea about how to set up the various smart home options in your own home. To my surprise, the smart home devices are also not as pricey as I thought they would be. Smart home technology has really come a long way! Drop by today if you’d like to explore smart home options without the hassle of researching each separate provider on your own and see for yourself how these devices work live!'
  },
  {
    name: 'Sazali Samuri', when: 'a year ago', stars: 5,
    photos: ['assets/reviews/sazali-1.webp', 'assets/reviews/sazali-2.webp'],
    text: 'Big thanks to Mike and Clarence from Life Tech / Home Auto for setting up our smart home system! They provided all the devices we needed, specifically tailored for homes with non-neutral wiring. The installation process was smooth and hassle-free, and everything works perfectly. We couldn’t be happier with their professional service and attention to detail. Highly recommend them for anyone looking to upgrade their home with smart technology.'
  },
  {
    name: 'Gary Tan KC', when: '2 years ago', stars: 5,
    photos: ['assets/reviews/gary-1.webp', 'assets/reviews/gary-2.webp'],
    text: 'Came across Life Tech SG when searching for smart home options. They offer very attractive smart home packages that are affordable to us as new home owners. Visited Mike’s showroom and was given a very informative tour about what smart home setup is all about. Mike is very patient, professional and very knowledgeable in this domain. Johnny was assigned as the installer for my smart home. He is very dedicated in his job, very meticulous and careful as he understands that it’s our new home. He went the extra mile to provide full explanation and integration into my Google Home, which was a breeze. Kudos to his hard work and 6 hours spent setting up everything for us. We will definitely recommend Life Tech SG for new homeowners looking for smart home solutions!'
  },
  {
    name: 'Jeremy Tan', when: '6 months ago', stars: 5,
    photos: ['assets/reviews/Jeremy.webp'],
    text: 'Had a great experience with the smart home installation for my place. The setup was smooth, efficient, and honestly a breeze from start to finish. Everything was explained clearly in simple terms, and Clarence took the time to walk me through how the system works without rushing. What stood out was the patience and attention to detail, making sure everything was properly configured and that I was comfortable using it before wrapping up. Professional, knowledgeable, and very easy to work with. Highly recommended if you’re looking for a fuss-free, competitively priced and reliable smart home setup!'
  }
];

(function renderReviews() {
  const section = document.getElementById('reviews');
  const grid = document.getElementById('reviewsGrid');
  if (!section || !grid) return;

  if (!REVIEWS.length) {
    section.hidden = true;
    return;
  }

  // Deterministic avatar tint from the name, drawn from the brand palette.
  // Used as the monogram fallback when a reviewer photo is missing.
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

  function cardHTML(r) {
    const n = r.stars || 5;
    const stars = '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
    const photos = (r.photos || []).map(function (src) {
      return '<button type="button" class="review-thumb" data-full="' + src + '">' +
        '<img src="' + src + '" alt="Photo from ' + r.name + '’s review" loading="lazy" onerror="this.closest(\'.review-thumb\').remove()">' +
      '</button>';
    }).join('');
    const photoRow = photos ? '<div class="review-photos">' + photos + '</div>' : '';
    return (
      '<article class="review-card">' +
        '<div class="review-top">' +
          '<span class="review-avatar" style="background:' + tintFor(r.name) + '" aria-hidden="true">' + initials(r.name) + '</span>' +
          '<div class="review-who">' +
            '<span class="review-name">' + r.name + '</span>' +
            '<span class="review-when">' + (r.when || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<span class="review-stars" aria-label="' + n + ' out of 5 stars">' + stars + '</span>' +
        photoRow +
        '<p class="review-text">' + r.text + '</p>' +
        '<span class="review-source">' + gLogo + 'Posted on Google</span>' +
      '</article>'
    );
  }

  // Two identical groups let the track loop seamlessly at translateX(-50%).
  const group = '<div class="reviews-group">' + REVIEWS.map(cardHTML).join('') + '</div>';
  grid.innerHTML = '<div class="reviews-track">' + group + group + '</div>';
  const track = grid.querySelector('.reviews-track');

  // Press-and-hold to pause on touch (hover-pause is handled in CSS for mouse).
  // A quick tap still fires click, so tapping a photo thumbnail opens the
  // lightbox; the momentary pause during that tap is imperceptible.
  ['touchstart', 'pointerdown'].forEach(function (evt) {
    grid.addEventListener(evt, function () { track.classList.add('is-held'); }, { passive: true });
  });
  ['touchend', 'touchcancel', 'pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
    grid.addEventListener(evt, function () { track.classList.remove('is-held'); }, { passive: true });
  });

  // Lightbox: tap a thumbnail to view the full photo.
  const lb = document.createElement('div');
  lb.className = 'review-lightbox';
  lb.hidden = true;
  lb.innerHTML =
    '<button type="button" class="review-lightbox-close" aria-label="Close">&times;</button>' +
    '<img alt="">';
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('img');

  function closeLightbox() {
    lb.hidden = true;
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
  }

  grid.addEventListener('click', function (e) {
    const thumb = e.target.closest('.review-thumb');
    if (!thumb) return;
    lbImg.src = thumb.getAttribute('data-full');
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.closest('.review-lightbox-close')) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lb.hidden) closeLightbox();
  });
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
