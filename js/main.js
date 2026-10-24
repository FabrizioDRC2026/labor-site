document.documentElement.className='js is-loading';
;

(() => {
  const PHONE = '5517988039838';
  const root = document.documentElement, body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- Bloqueio de scroll compartilhado ---------- */
  const locks = new Set();
  const lock = k => { locks.add(k); body.classList.add('scroll-locked'); };
  const unlock = k => { locks.delete(k); if (!locks.size) body.classList.remove('scroll-locked'); };

  /* ---------- Toast ---------- */
  const toast = $('#form-toast');
  let toastTimer;
  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.classList.toggle('error', isError);
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3600);
  }

  /* ---------- WhatsApp (link real, sem depender de window.open) ---------- */
  function openWhatsApp(message) {
    const a = document.createElement('a');
    a.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------- Foco: utilitários ---------- */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const isVisible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, container).filter(isVisible);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Loader (nunca bloqueia o conteúdo por muito tempo) ---------- */
  const loader = $('#loader');
  const hideLoader = () => { loader.classList.add('done'); root.classList.remove('is-loading'); };
  addEventListener('load', () => setTimeout(hideLoader, reduce ? 0 : 300));
  setTimeout(hideLoader, 1800);

  /* ---------- Scroll: progresso, header, parallax (um único rAF) ---------- */
  const progress = $('#scrollProgress');
  const header = $('.site-header');
  const heroVisual = $('.hero-visual');
  const heroGrid = $('#heroGrid');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const h = root.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
      header.classList.toggle('scrolled', y > 40);
      if (!reduce && y < innerHeight * 1.2) {
        if (heroVisual) heroVisual.style.setProperty('--py', `${(y * 0.06).toFixed(1)}px`);
        if (heroGrid) heroGrid.style.setProperty('--py', `${(y * 0.12).toFixed(1)}px`);
      }
      const regionIntro = $('.region-intro');
      const regionTitle = $('.region-title');
      if (regionIntro && regionTitle && !reduce) {
        const rect = regionIntro.getBoundingClientRect();
        const travel = Math.max(1, regionIntro.offsetHeight - innerHeight);
        const p = Math.max(0, Math.min(1, -rect.top / travel));
        regionTitle.style.setProperty('--headline-opacity', String(1 - Math.max(0, (p - .12) / .68)));
        regionTitle.style.setProperty('--headline-y', `${(-p * 90).toFixed(1)}px`);
        regionTitle.style.setProperty('--headline-scale', String(1 + p * .12));
        regionTitle.style.setProperty('--headline-blur', `${(p * 5).toFixed(1)}px`);
      }
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  const menuBtn = $('.menu-toggle');
  const nav = $('#site-nav');
  const MOBILE = matchMedia('(max-width:1080px)');
  function setMenu(open, returnFocus = false) {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    open ? lock('menu') : unlock('menu');
    if (!open && returnFocus) menuBtn.focus();
  }
  const menuIsOpen = () => nav.classList.contains('is-open');
  menuBtn.addEventListener('click', () => setMenu(!menuIsOpen()));
  $$('.nav-link').forEach(l => l.addEventListener('click', () => { if (menuIsOpen()) setMenu(false); }));
  MOBILE.addEventListener('change', e => { if (!e.matches && menuIsOpen()) setMenu(false); });

  /* ---------- Navegação: seção ativa + indicador deslizante ---------- */
  const navLinks = $$('.nav-link');
  const indicator = $('.nav-indicator');
  function moveIndicator(link) {
    if (!link || MOBILE.matches) return;
    const box = nav.getBoundingClientRect(), r = link.getBoundingClientRect();
    indicator.style.transform = `translateX(${r.left - box.left}px) scaleX(${r.width})`;
    indicator.classList.add('ready');
  }
  const setActive = id => {
    const link = navLinks.find(l => l.getAttribute('href') === `#${id}`);
    if (!link) return;
    navLinks.forEach(l => { l.classList.toggle('active', l === link); l.toggleAttribute('aria-current', l === link); });
    moveIndicator(link);
  };
  if ('IntersectionObserver' in window) {
    const secObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-35% 0px -55% 0px' });
    navLinks.map(l => $(l.getAttribute('href'))).filter(Boolean).forEach(s => secObs.observe(s));
  }
  addEventListener('resize', () => moveIndicator($('.nav-link.active')));
  document.fonts?.ready.then(() => moveIndicator($('.nav-link.active')));
  moveIndicator($('.nav-link.active'));

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal, .reveal-left, .reveal-right, .mask-reveal, .map-card, .reveal-bg');
  if ('IntersectionObserver' in window) {
    const rObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rObs.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => rObs.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---------- Botões magnéticos (só mouse, sem reduced-motion) ---------- */
  if (finePointer && !reduce) {
    $$('.button').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.16;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
        btn.style.setProperty('--mx', `${dx.toFixed(1)}px`);
        btn.style.setProperty('--my', `${dy.toFixed(1)}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.removeProperty('--mx'); btn.style.removeProperty('--my'); });
    });
  }

  /* ---------- Painel WhatsApp ---------- */
  const waFloat = $('#waFloat'), waBubble = $('#waBubble'), waPanel = $('#waPanel'), waOverlay = $('#waOverlay');
  let waReturn = null;
  const waIsOpen = () => waFloat.classList.contains('open');
  function openWa() {
    if (menuIsOpen()) setMenu(false);
    waReturn = document.activeElement;
    waFloat.classList.add('open');
    waOverlay.classList.add('open');
    waBubble.setAttribute('aria-expanded', 'true');
    waPanel.setAttribute('aria-hidden', 'false');
    lock('wa');
    setTimeout(() => $('.wa-option', waPanel)?.focus(), 60);
  }
  function closeWa(restore = true) {
    waFloat.classList.remove('open');
    waOverlay.classList.remove('open');
    waBubble.setAttribute('aria-expanded', 'false');
    waPanel.setAttribute('aria-hidden', 'true');
    unlock('wa');
    if (restore) (waReturn && isVisible(waReturn) ? waReturn : waBubble).focus();
    waReturn = null;
  }
  waBubble.addEventListener('click', e => { e.stopPropagation(); waIsOpen() ? closeWa() : openWa(); });
  waOverlay.addEventListener('click', () => closeWa());
  $$('.wa-option', waPanel).forEach(a => a.addEventListener('click', () => setTimeout(() => closeWa(false), 250)));
  document.addEventListener('click', e => { if (waIsOpen() && !waFloat.contains(e.target)) closeWa(false); });

  /* ---------- Botões de serviço → WhatsApp direto ---------- */
  $$('[data-service]').forEach(b => b.addEventListener('click', () => {
    openWhatsApp(`Olá, LABOR! Gostaria de solicitar um orçamento para ${b.dataset.service}.`);
    showToast(`Abrindo o WhatsApp — ${b.dataset.service}.`);
  }));


  /* ---------- Teclado global: Esc + focus trap ---------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modalIsOpen()) return closeModal();
      if (waIsOpen()) return closeWa();
      if (menuIsOpen()) return setMenu(false, true);
    }
    if (e.key === 'Tab') {
      if (modalIsOpen()) trapFocus($('.feedback-modal-panel', modal), e);
      else if (waIsOpen()) trapFocus(waFloat, e);
      else if (menuIsOpen()) trapFocus(header, e);
    }
  });


  /* ---------- Validação com mensagens claras ---------- */
  function firstInvalid(form) {
    return $$('input,select,textarea', form).find(el => el.willValidate && !el.checkValidity());
  }


  $('#contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const bad = firstInvalid(form);
    if (bad) {
      bad.focus();
      form.reportValidity();
      return showToast('Preencha os campos obrigatórios para continuar.', true);
    }
    const d = new FormData(form);
    const company = String(d.get('company') || '').trim();
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    openWhatsApp([
      'Olá, LABOR! Gostaria de solicitar um orçamento.', '',
      `Nome: ${String(d.get('name')).trim()}`,
      ...(company ? [`Empresa: ${company}`] : []),
      `Serviço: ${d.get('service')}`,
      `Como podemos ajudar: ${String(d.get('message')).trim()}`
    ].join('\n'));
    showToast('Abrindo o WhatsApp com os dados do orçamento.');
    setTimeout(() => { btn.disabled = false; }, 1500);
  });

  /* ---------- Região: clique no mapa dá contexto de cidade ao botão fixo ---------- */
  const mapNodes = $$('.map-node');
  const waCity = $('#waCity');
  const waLinks = $$('.wa-option', document.getElementById('waPanel'));
  function applyCity(name) {
    waCity.hidden = !name;
    waCity.textContent = name ? `Atendimento em ${name}` : '';
    waLinks.forEach(a => {
      const u = new URL(a.dataset.base || a.href);
      a.dataset.base = u.href;
      if (name) u.searchParams.set('text', `${u.searchParams.get('text')} Sou de ${name}.`);
      a.href = u.href;
    });
    mapNodes.forEach(n => n.classList.toggle('active', n.dataset.city === name));
  }
  mapNodes.forEach(n => {
    n.addEventListener('click', () => { applyCity(n.dataset.city); showToast(`${n.dataset.city} selecionada. Use “Solicitar orçamento”.`); });
  });

  const year = $('#current-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();

;
(function(){var m=matchMedia("(max-width:760px)"),v=document.querySelector(".map-svg");function f(){if(v)v.setAttribute("preserveAspectRatio",m.matches?"xMidYMid meet":"none")}f();m.addEventListener&&m.addEventListener("change",f)})();
;
(function(){
  var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(rm) return;
  var wrap=document.getElementById('hero-reveal');
  var panels=wrap?[].slice.call(wrap.querySelectorAll('.cr-panel')):[];
  var heroCopy=wrap?wrap.querySelector('.hero-home-copy'):null;
  var cards=[].slice.call(document.querySelectorAll('.stack-card'));
  var ticking=false;
  function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
  function clamp(v){return Math.max(0,Math.min(1,v))}
  function update(){
    ticking=false;
    var vh=window.innerHeight;
    if(wrap&&panels.length){
      var r=wrap.getBoundingClientRect();
      var p=clamp(-r.top/Math.max(1,wrap.offsetHeight-vh));
      var n=panels.length, dur=0.5, step=(1-dur)/(n-1);
      for(var i=0;i<n;i++){
        var l=clamp((p-i*step)/dur);
        panels[i].style.transform='scaleY('+ease(l).toFixed(4)+')';
      }
      if(heroCopy){heroCopy.style.opacity=String(1-clamp(p*1.6));}
    }
    for(var k=0;k<cards.length-1;k++){
      var nx=cards[k+1].getBoundingClientRect();
      var top=parseFloat(getComputedStyle(cards[k+1]).top)||0;
      var prog=clamp(1-(nx.top-top)/(vh*0.6));
      cards[k].style.transform='scale('+(1-0.06*prog).toFixed(4)+')';
      cards[k].style.filter='brightness('+(1-0.12*prog).toFixed(3)+')';
    }
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  window.addEventListener('scroll',req,{passive:true});
  window.addEventListener('resize',req);
  update();
})();

;
(function(){
  var g=document.querySelector('.service-grid'); if(!g) return;
  var cards=[].slice.call(g.querySelectorAll('.service-card'));
  var dots=document.createElement('div'); dots.className='service-dots'; dots.setAttribute('aria-label','Navegar pelos serviços');
  cards.forEach(function(c,i){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Ir para o serviço '+(i+1));
    b.addEventListener('click',function(){g.scrollTo({left:c.offsetLeft-parseFloat(getComputedStyle(g).paddingLeft||0),behavior:'smooth'})});dots.appendChild(b)});
  g.parentNode.insertBefore(dots,g.nextSibling);
  var bs=[].slice.call(dots.children), t=false;
  function upd(){t=false; var best=0,d=1e9; cards.forEach(function(c,i){var x=Math.abs(c.offsetLeft-parseFloat(getComputedStyle(g).paddingLeft||0)-g.scrollLeft); if(x<d){d=x;best=i}});
    if(g.scrollLeft+g.clientWidth>=g.scrollWidth-4) best=cards.length-1;
    bs.forEach(function(b,i){b.classList.toggle('on',i===best)})}
  g.addEventListener('scroll',function(){if(!t){t=true;requestAnimationFrame(upd)}},{passive:true});
  window.addEventListener('resize',upd); upd();
})();