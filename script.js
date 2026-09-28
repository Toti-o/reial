(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Broken images fall back */
  $$('img').forEach(function (img) {
    img.addEventListener('error', function () { img.style.display = 'none'; });
  });

  /* Scroll progress bar */
  var progressBar = $('#progressBar');
  if (progressBar) {
    var updateProgress = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      progressBar.style.width = pct + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  /* Nav shrink */
  var nav = $('#nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 30); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Mobile menu */
  var burger = $('#burger');
  var links = $('#navLinks');

  function closeMenu() {
    if (!links || !burger) return;
    links.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('lock');
  }

  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = !links.classList.contains('open');
      links.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('lock', open);
    });
    $$('#navLinks a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  }

  /* Reveal */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('in'); });
  }

  /* Toast */
  var toastEl = $('#toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 4200);
  }

  /* ============================================================
     SHOWREEL — autoplay when in view, pause when scrolled past
     ============================================================ */
  var reelVideo = $('#reelVideo');
  if (reelVideo) {
    /* Try to start playing as soon as it's ready */
    reelVideo.play().catch(function () {
      /* Autoplay was blocked — that's fine, controls are visible */
    });

    if ('IntersectionObserver' in window) {
      var reelObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            /* Video is on screen — play it */
            var p = reelVideo.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            /* Video scrolled out of view — pause it */
            if (!reelVideo.paused) reelVideo.pause();
          }
        });
      }, {
        threshold: 0.5 /* Fires when at least 50% of the video is visible */
      });

      reelObserver.observe(reelVideo);
    }
  }

  /* Work reel */
  var reel = $('#workReel');
  var reelBar = $('#reelBar');
  var prevBtn = $('#reelPrev');
  var nextBtn = $('#reelNext');

  if (reel) {
    function updateReelBar() {
      if (!reelBar) return;
      var max = reel.scrollWidth - reel.clientWidth;
      var pct = max > 0 ? (reel.scrollLeft / max) * 100 : 0;
      reelBar.style.width = pct + '%';
    }
    reel.addEventListener('scroll', updateReelBar, { passive: true });
    window.addEventListener('resize', updateReelBar);
    updateReelBar();

    function scrollAmount() {
      var frame = reel.querySelector('.frame');
      if (!frame) return 320;
      return frame.getBoundingClientRect().width + 24;
    }

    function updateArrows() {
      if (!prevBtn || !nextBtn) return;
      var max = reel.scrollWidth - reel.clientWidth;
      prevBtn.disabled = reel.scrollLeft <= 4;
      nextBtn.disabled = reel.scrollLeft >= max - 4;
    }
    reel.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();

    if (prevBtn) prevBtn.addEventListener('click', function () {
      reel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      reel.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });

    var isDown = false, startX = 0, startScroll = 0, moved = false;
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      isDown = true; moved = false;
      startX = e.clientX; startScroll = reel.scrollLeft;
      reel.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      reel.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!isDown) return;
      isDown = false;
      reel.classList.remove('is-dragging');
      reel.scrollTo({ left: reel.scrollLeft, behavior: 'smooth' });
    });
    reel.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
    reel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); reel.scrollBy({ left: scrollAmount(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); reel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }); }
    });
  }

  /* Video lightbox */
  var lb = $('#lightbox');
  var lbFrame = $('#lbFrame');
  var lastFocus = null;
  var currentlyPlaying = null;

  function stopAllVideos() {
    if (!lbFrame) return;
    lbFrame.innerHTML = '';
    currentlyPlaying = null;
  }

  function openVideo(videoId) {
    if (!lb || !lbFrame) return;
    if (!videoId) { toast('Missing video ID.'); return; }

    /* Pause the showreel if it's playing */
    if (reelVideo && !reelVideo.paused) reelVideo.pause();

    if (currentlyPlaying === videoId && lb.classList.contains('open')) {
      var existingFrame = lbFrame.querySelector('iframe');
      if (existingFrame) existingFrame.focus();
      return;
    }

    stopAllVideos();

    lastFocus = document.activeElement;
    currentlyPlaying = videoId;

    var src = 'https://www.youtube-nocookie.com/embed/' +
              encodeURIComponent(videoId) +
              '?autoplay=1&rel=0&modestbranding=1&playsinline=1';

    lbFrame.innerHTML =
      '<iframe src="' + src + '" ' +
      'title="Reial Production video" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" ' +
      'allowfullscreen ' +
      'referrerpolicy="strict-origin-when-cross-origin" ' +
      'loading="eager"></iframe>';

    lb.classList.add('open');
    document.body.classList.add('lock');
    var closeBtn = $('.lb-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    if (!lb || !lb.classList.contains('open')) return;
    stopAllVideos();
    lb.classList.remove('open');
    document.body.classList.remove('lock');
    if (lastFocus) lastFocus.focus();
  }

  $$('[data-video]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      var id = el.dataset.video;
      if (id) {
        e.preventDefault();
        e.stopPropagation();
        openVideo(id);
      }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var id = el.dataset.video;
        if (id) { e.preventDefault(); openVideo(id); }
      }
    });
  });

  var lbClose = $('.lb-close');
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lb) lb.addEventListener('click', function (e) {
    if (e.target === lb) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeLightbox(); closeMenu(); }
  });

  /* Work filters */
  var filterChips = $$('.filter-chip');
  var workCards = $$('.work-card');

  if (filterChips.length && workCards.length) {
    filterChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        filterChips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var filter = chip.dataset.filter;
        workCards.forEach(function (card) {
          var cats = (card.dataset.cats || '').split(' ');
          var show = (filter === 'all' || cats.indexOf(filter) !== -1);
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* Form */
  var form = $('#inquiryForm');
  var success = $('#formSuccess');

  if (form) {
    function setInvalid(field, invalid) {
      if (field) field.classList.toggle('invalid', invalid);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = $('#f-name');
      var email = $('#f-email');
      var brief = $('#f-brief');
      var company = $('#f-company');
      var phone = $('#f-phone');
      var type = $('#f-type');
      var timeline = $('#f-timeline');
      var budget = $('#f-budget');

      var ok = true;
      if (!name.value.trim()) { setInvalid(name.parentElement, true); ok = false; }
      else { setInvalid(name.parentElement, false); }

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!emailOk) { setInvalid(email.parentElement, true); ok = false; }
      else { setInvalid(email.parentElement, false); }

      if (!brief.value.trim()) { setInvalid(brief.parentElement, true); ok = false; }
      else { setInvalid(brief.parentElement, false); }

      if (!ok) {
        var first = $('.field.invalid input, .field.invalid textarea');
        if (first) first.focus();
        return;
      }

      var lines = [
        'Hi Reial Production, I would like to discuss a project.',
        '',
        'Name: ' + name.value.trim(),
        company.value.trim() ? 'Organisation: ' + company.value.trim() : '',
        'Email: ' + email.value.trim(),
        phone.value.trim() ? 'Phone/WhatsApp: ' + phone.value.trim() : '',
        type.value ? 'Project type: ' + type.value : '',
        timeline.value.trim() ? 'Timeline: ' + timeline.value.trim() : '',
        budget.value ? 'Budget range: ' + budget.value : '',
        '',
        'Brief:',
        brief.value.trim()
      ].filter(function (l) { return l !== ''; });

      var msg = lines.join('\n');
      window.open('https://wa.me/254710840173?text=' + encodeURIComponent(msg), '_blank', 'noopener');

      if (success) success.hidden = false;
      toast('Enquiry ready — opening WhatsApp.');
      form.reset();
      setTimeout(function () { if (success) success.hidden = true; }, 12000);
    });

    $$('.field input, .field textarea, .field select').forEach(function (input) {
      input.addEventListener('input', function () {
        setInvalid(input.closest('.field'), false);
      });
    });
  }

  /* Year */
  var y = $('#year');
  if (y) y.textContent = String(new Date().getFullYear());

})();
