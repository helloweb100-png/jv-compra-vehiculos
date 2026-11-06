/* ==========================================================================
   JV Compra de Vehículos · Landing premium
   - Todo funciona sin librerías externas.
   - anime.js (CDN, opcional) solo añade detalles: ráfaga del cronómetro y ondas en botones.
   - Respeta prefers-reduced-motion.
   ========================================================================== */
(() => {
  'use strict';

  /* ======================================================================
     CONFIGURACIÓN · el número de WhatsApp vive SOLO aquí.
     Formato internacional: 52 + 10 dígitos. Si queda vacío, el botón flotante,
     los enlaces y el envío del formulario se ocultan con elegancia.
     ====================================================================== */
  const WHATSAPP_NUMBER = '523325800108';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const tieneAnime = () => typeof window.anime === 'function';

  // Marca que el JS cargó: desactiva el respaldo CSS que muestra todo tras 3.5 s.
  root.classList.add('js-ok');

  /** Ejecuta un módulo sin que un fallo tumbe al resto de la página. */
  const seguro = (fn) => {
    try { fn(); } catch (error) { console.warn('[landing]', error); }
  };

  /* ======================================================================
     1. WhatsApp
     ====================================================================== */
  const waDisponible = /^\d{11,15}$/.test(WHATSAPP_NUMBER);

  function waLink(texto) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  }

  function telefonoLegible() {
    const d = WHATSAPP_NUMBER.replace(/^52/, '');
    return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : d;
  }

  function abrirWhatsApp(url) {
    // Un <a target="_blank"> evita que el bloqueador de ventanas emergentes interfiera.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function initWhatsApp() {
    if (!waDisponible) {
      root.classList.add('sin-wa');
      return;
    }
    $$('[data-wa]').forEach((a) => {
      const mensaje = a.dataset.waMsg || 'Hola, quiero vender mi vehículo. ¿Me pueden dar su oferta?';
      a.href = waLink(mensaje);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    $$('[data-wa-display]').forEach((el) => { el.textContent = telefonoLegible(); });

    // En escritorio, el botón flotante muestra su texto unos segundos para invitar a escribir.
    const flotante = $('.wa-float');
    if (flotante && finePointer && !reduceMotion) {
      setTimeout(() => flotante.classList.add('is-expanded'), 6000);
      setTimeout(() => flotante.classList.remove('is-expanded'), 10500);
    }
  }

  /* ======================================================================
     2. Cargador (spinner de arranque) · desaparece en ≤ 2.4 s
     ====================================================================== */
  function initCargador(alTerminar) {
    const cargador = $('#cargador');
    const pct = $('#cargadorPct');
    if (!cargador || reduceMotion) {
      if (cargador) cargador.remove();
      alTerminar();
      return;
    }
    const DURACION = 1300;
    const t0 = performance.now();
    let terminado = false;

    const terminar = () => {
      if (terminado) return;
      terminado = true;
      if (pct) pct.textContent = '100';
      cargador.classList.add('is-done');
      alTerminar();
      setTimeout(() => cargador.remove(), 1200);
    };

    const paso = (ahora) => {
      const t = clamp((ahora - t0) / DURACION);
      if (pct) pct.textContent = String(Math.round(easeOut(t) * 100));
      if (t < 1) requestAnimationFrame(paso);
      else setTimeout(terminar, 60);
    };
    requestAnimationFrame(paso);
    setTimeout(terminar, 1700); // tope de seguridad
  }

  /* ======================================================================
     3. Texto dividido por palabras (titulares con entrada enmascarada)
     ====================================================================== */
  function dividirTexto(el) {
    const completo = el.textContent.trim().replace(/\s+/g, ' ');
    let indice = 0;
    const recorrer = (nodo) => {
      Array.from(nodo.childNodes).forEach((hijo) => {
        if (hijo.nodeType === 3) {
          const frag = document.createDocumentFragment();
          hijo.textContent.split(/(\s+)/).forEach((trozo) => {
            if (!trozo) return;
            if (/^\s+$/.test(trozo)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.style.setProperty('--i', String(indice++));
            wi.textContent = trozo;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          nodo.replaceChild(frag, hijo);
        } else if (hijo.nodeType === 1) {
          recorrer(hijo);
        }
      });
    };
    recorrer(el);
    el.setAttribute('aria-label', completo);
    el.classList.add('is-split');
  }

  /* ======================================================================
     4. Entradas al hacer scroll (IntersectionObserver)
     ====================================================================== */
  function initReveals() {
    // Escalona hermanos que no traen un retraso propio
    $$('.bento, .faq__list, .compara__grid, .chips').forEach((grupo) => {
      $$('.reveal', grupo).forEach((el, i) => {
        if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${(i % 6) * 0.08}s`);
      });
    });

    const items = $$('.reveal, [data-split]');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-in');
        io.unobserve(entrada.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ======================================================================
     5. Menú móvil
     ====================================================================== */
  function initMenu() {
    const boton = $('#burger');
    const menu = $('#menu');
    if (!boton || !menu) return;
    const cerrar = () => {
      menu.classList.remove('is-open');
      boton.setAttribute('aria-expanded', 'false');
      boton.setAttribute('aria-label', 'Abrir menú');
      document.body.classList.remove('menu-open');
    };
    boton.addEventListener('click', () => {
      const abierto = menu.classList.toggle('is-open');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
      document.body.classList.toggle('menu-open', abierto);
    });
    $$('a', menu).forEach((a) => a.addEventListener('click', cerrar));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
    window.matchMedia('(min-width: 980px)').addEventListener('change', (e) => { if (e.matches) cerrar(); });
  }

  /* ======================================================================
     6. Partículas del hero (brasas amarillas + estelas de velocidad)
     ====================================================================== */
  function initParticulas() {
    const canvas = $('#particulas');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const colores = ['255,212,0', '255,231,102', '255,64,70', '255,255,255'];
    let w = 0;
    let h = 0;
    let brasas = [];
    let estelas = [];
    let visible = true;
    let raf = null;
    const raton = { x: -999, y: -999 };

    const nuevaBrasa = (inicial) => ({
      x: Math.random() * w,
      y: inicial ? Math.random() * h : h + 12,
      r: Math.random() * 2.2 + 0.5,
      vy: -(Math.random() * 0.55 + 0.18),
      vx: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.7 + 0.25,
      fase: Math.random() * Math.PI * 2,
      c: colores[Math.floor(Math.random() * colores.length)],
    });

    const nuevaEstela = () => ({
      x: -220,
      y: h * (0.55 + Math.random() * 0.4),
      largo: Math.random() * 160 + 90,
      v: Math.random() * 14 + 12,
      c: Math.random() > 0.5 ? '255,212,0' : '255,255,255',
      a: Math.random() * 0.35 + 0.18,
    });

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cantidad = Math.round(clamp(w / 14, 28, 90));
      brasas = Array.from({ length: cantidad }, () => nuevaBrasa(true));
      estelas = [];
    };

    let t = 0;
    const cuadro = () => {
      raf = null;
      if (!visible || document.hidden) return;
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (const b of brasas) {
        b.y += b.vy;
        b.x += b.vx + Math.sin(t * 1.4 + b.fase) * 0.18;
        const dx = b.x - raton.x;
        const dy = b.y - raton.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) { // el cursor aparta las brasas
          const f = (1 - d2 / 14400) * 2.2;
          b.x += (dx / (Math.sqrt(d2) || 1)) * f;
          b.y += (dy / (Math.sqrt(d2) || 1)) * f;
        }
        if (b.y < -12 || b.x < -12 || b.x > w + 12) Object.assign(b, nuevaBrasa(false));
        const alfa = b.a * (0.65 + 0.35 * Math.sin(t * 2 + b.fase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${b.c},${alfa * 0.18})`;
        ctx.arc(b.x, b.y, b.r * 4, 0, 6.2832);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `rgba(${b.c},${alfa})`;
        ctx.arc(b.x, b.y, b.r, 0, 6.2832);
        ctx.fill();
      }

      if (estelas.length < 3 && Math.random() < 0.02) estelas.push(nuevaEstela());
      estelas = estelas.filter((e) => {
        e.x += e.v;
        const g = ctx.createLinearGradient(e.x - e.largo, 0, e.x, 0);
        g.addColorStop(0, `rgba(${e.c},0)`);
        g.addColorStop(1, `rgba(${e.c},${e.a})`);
        ctx.fillStyle = g;
        ctx.fillRect(e.x - e.largo, e.y, e.largo, 2);
        return e.x - e.largo < w;
      });

      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(cuadro);
    };

    const arrancar = () => { if (!raf) raf = requestAnimationFrame(cuadro); };

    medir();
    let temporizador;
    window.addEventListener('resize', () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(medir, 200);
    });
    const hero = $('#inicio');
    if (hero) {
      hero.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        raton.x = e.clientX - r.left;
        raton.y = e.clientY - r.top;
      });
      hero.addEventListener('pointerleave', () => { raton.x = -999; raton.y = -999; });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entradas) => {
        visible = entradas[0].isIntersecting;
        if (visible) arrancar();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });
    arrancar();
  }

  /* ======================================================================
     7. Panel "escáner de ofertas" del hero: ciclo constante de vehículos
     ====================================================================== */
  function initHud() {
    const vehiculos = $$('.hud__veh');
    const hud = $('.hud');
    if (!vehiculos.length || !hud) return;
    const etiqueta = $('#hudEtiqueta');
    const tiempo = $('#hudTiempo');
    const arco = $('#hudArco');
    const listo = $('#hudOk');
    const checks = $$('.hud__checks li');
    const escaneo = $('.hud__scan');
    const CICLO = 4200;
    const CUENTA = 3300;
    const LONGITUD = 2 * Math.PI * 27;
    arco.style.strokeDasharray = String(LONGITUD);

    if (reduceMotion) { // versión estática
      checks.forEach((li) => li.classList.add('on'));
      listo.classList.add('on');
      return;
    }

    let activo = 0;
    let cicloActual = -1;
    let inicio = performance.now();
    let corriendo = false;
    let visible = true;
    let ultimoTexto = '';

    const cambiarA = (siguiente) => {
      const previo = vehiculos[activo];
      previo.classList.remove('is-active');
      previo.classList.add('is-leaving');
      setTimeout(() => previo.classList.remove('is-leaving'), 800);
      vehiculos[siguiente].classList.add('is-active');
      activo = siguiente;
      etiqueta.textContent = vehiculos[siguiente].dataset.nombre;
      checks.forEach((li) => li.classList.remove('on'));
      listo.classList.remove('on');
      // Reinicia el haz de escaneo para que siga sincronizado con el ciclo
      escaneo.style.animation = 'none';
      void escaneo.offsetWidth;
      escaneo.style.animation = '';
    };

    const cuadro = (ahora) => {
      if (!visible || document.hidden) { corriendo = false; return; }
      const t = ahora - inicio;
      const ciclo = Math.floor(t / CICLO);
      const fase = t % CICLO;
      if (ciclo !== cicloActual) {
        if (cicloActual !== -1) cambiarA((activo + 1) % vehiculos.length);
        cicloActual = ciclo;
      }
      const avance = clamp(fase / CUENTA);
      const segundos = Math.round(300 * (1 - avance));
      const texto = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
      if (texto !== ultimoTexto) { tiempo.textContent = texto; ultimoTexto = texto; }
      arco.style.strokeDashoffset = String(LONGITUD * avance);
      [450, 1150, 1850].forEach((umbral, i) => { if (fase > umbral) checks[i].classList.add('on'); });
      if (fase > CUENTA) listo.classList.add('on');
      requestAnimationFrame(cuadro);
    };

    const arrancar = () => {
      if (corriendo) return;
      corriendo = true;
      inicio = performance.now() - (cicloActual >= 0 ? (performance.now() - inicio) % CICLO : 0);
      requestAnimationFrame(cuadro);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entradas) => {
        visible = entradas[0].isIntersecting;
        if (visible) arrancar();
      }, { threshold: 0.05 }).observe(hud);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });
    arrancar();
  }

  /* ======================================================================
     8. Inclinación 3D con el cursor (panel del hero y anuncio del contacto)
     ====================================================================== */
  function initInclinacion() {
    if (reduceMotion || !finePointer) return;
    $$('[data-tilt-root]').forEach((objetivo) => {
      const zona = objetivo.closest('section') || objetivo;
      const max = objetivo.classList.contains('flyer-wrap') ? 11 : 8;
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;
      let raf = null;
      const paso = () => {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        objetivo.style.setProperty('--rx', `${cx.toFixed(2)}deg`);
        objetivo.style.setProperty('--ry', `${cy.toFixed(2)}deg`);
        raf = (Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02) ? requestAnimationFrame(paso) : null;
      };
      const mover = () => { if (!raf) raf = requestAnimationFrame(paso); };
      zona.addEventListener('pointermove', (e) => {
        const r = zona.getBoundingClientRect();
        ty = ((e.clientX - r.left) / r.width - 0.5) * max * 2;
        tx = -((e.clientY - r.top) / r.height - 0.5) * max * 2;
        mover();
      });
      zona.addEventListener('pointerleave', () => { tx = 0; ty = 0; mover(); });
    });
  }

  /* ======================================================================
     9. Destello que sigue al cursor en las tarjetas del bento
     ====================================================================== */
  function initDestello() {
    $$('[data-spot]').forEach((tile) => {
      tile.addEventListener('pointermove', (e) => {
        const r = tile.getBoundingClientRect();
        tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
        tile.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ======================================================================
     10. Efectos ligados al scroll (un solo bucle con requestAnimationFrame)
     ====================================================================== */
  function initScroll() {
    const encabezado = $('#encabezado');
    const progreso = $('#progreso');
    const ciudadHero = $('.hero__city');
    const digitos = $('.hero__digits');
    const hero = $('#inicio');
    const tarjetas = $$('[data-scard]');
    const escena = $('#escena');
    const cola = $('.escena__tail');
    const proceso = $('#como-funciona');
    const pasos = $('.pasos');
    const lista = $$('[data-paso]');
    const cron = $('#cronometro');
    const swTiempo = $('#swTiempo');
    const swEtiqueta = $('#swEtiqueta');
    const pistas = $$('.marquee__track');

    let programado = false;
    let ultimoY = window.scrollY;
    let cronometroListo = false;

    /* La tarjeta de la escena queda fija abajo: su altura real define dónde se detiene */
    const carta = $('.escena__card');
    const medirCarta = () => {
      if (escena && carta) escena.style.setProperty('--card-h', `${carta.offsetHeight}px`);
    };
    medirCarta();
    if (carta && 'ResizeObserver' in window) new ResizeObserver(medirCarta).observe(carta);

    /* --- Cinta: acelera con la velocidad del scroll --- */
    let impulso = 0;
    let marqRaf = null;
    const animaciones = () => pistas.map((p) => p.getAnimations().find((a) => a.animationName === 'marq')).filter(Boolean);
    const marqPaso = () => {
      impulso *= 0.93;
      const tasa = 1 + Math.min(impulso, 6);
      animaciones().forEach((a) => { a.playbackRate = tasa; });
      if (impulso > 0.02) marqRaf = requestAnimationFrame(marqPaso);
      else { marqRaf = null; animaciones().forEach((a) => { a.playbackRate = 1; }); }
    };
    const marqImpulso = (v) => {
      if (reduceMotion) return;
      impulso = Math.max(impulso, Math.abs(v) / 9);
      if (!marqRaf) marqRaf = requestAnimationFrame(marqPaso);
    };

    /* --- Ráfaga de chispas al terminar el cronómetro --- */
    const rafaga = () => {
      if (reduceMotion || !cron) return;
      const r = cron.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const colores = ['#FFD400', '#FF4046', '#FFFFFF', '#25D366'];
      const chispas = Array.from({ length: 22 }, (_, i) => {
        const el = document.createElement('i');
        el.className = 'burst';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.background = colores[i % colores.length];
        document.body.appendChild(el);
        return el;
      });
      chispas.forEach((el, i) => {
        const ang = (i / chispas.length) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 70 + Math.random() * 110;
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist;
        if (tieneAnime()) {
          window.anime({ targets: el, translateX: dx, translateY: dy, scale: [1, 0], opacity: [1, 0], duration: 900 + Math.random() * 400, easing: 'easeOutExpo', complete: () => el.remove() });
        } else {
          el.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(0)`, opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => el.remove();
        }
      });
    };

    const actualizar = () => {
      programado = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const maximo = document.documentElement.scrollHeight - vh;

      if (encabezado) encabezado.classList.toggle('is-solid', y > 24);
      if (progreso) progreso.style.setProperty('--sp', maximo > 0 ? (y / maximo).toFixed(4) : '0');
      marqImpulso(y - ultimoY);
      ultimoY = y;

      /* Paralaje suave del hero */
      if (hero && y < hero.offsetHeight + 200 && !reduceMotion) {
        if (digitos) digitos.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
        if (ciudadHero) ciudadHero.style.transform = `translate3d(0, ${(y * 0.1).toFixed(1)}px, 0)`;
      }

      /* Tarjetas apiladas: la anterior se hunde mientras la siguiente la cubre */
      if (tarjetas.length && !reduceMotion) {
        tarjetas.forEach((carta, i) => {
          const siguiente = tarjetas[i + 1];
          if (!siguiente) return;
          const a = carta.getBoundingClientRect();
          if (a.bottom < -200 || a.top > vh + 200) return;
          const b = siguiente.getBoundingClientRect();
          const cubierto = clamp(1 - (b.top - a.top) / a.height);
          carta.style.setProperty('--sc', (1 - cubierto * 0.055).toFixed(4));
          carta.style.setProperty('--dim', cubierto.toFixed(3));
        });
      }

      /* Escena: el cuadro se abre hasta ocupar toda la pantalla */
      if (escena && cola && !reduceMotion) {
        const r = escena.getBoundingClientRect();
        if (r.bottom > -100 && r.top < vh + 100) {
          const total = cola.offsetHeight;
          const recorrido = clamp(-r.top, 0, total);
          escena.style.setProperty('--e', easeOut(clamp(recorrido / (vh * 0.42))).toFixed(4));
          escena.style.setProperty('--s', (recorrido / total).toFixed(4));
        }
      }

      /* Cómo funciona: cronómetro y línea de tiempo ligados al scroll */
      if (proceso && pasos && cron) {
        const r = pasos.getBoundingClientRect();
        if (r.bottom > -200 && r.top < vh + 200) {
          const p = clamp((vh * 0.62 - r.top) / r.height);
          cron.style.setProperty('--p', p.toFixed(4));
          pasos.style.setProperty('--pl', p.toFixed(4));
          const restante = p >= 0.985 ? 0 : Math.round(300 * (1 - p));
          const texto = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`;
          if (swTiempo.textContent !== texto) swTiempo.textContent = texto;
          const terminado = p >= 0.985;
          cron.classList.toggle('is-done', terminado);
          swEtiqueta.textContent = terminado ? '¡Pago inmediato!' : 'Tiempo para tu pago';
          if (terminado && !cronometroListo) { cronometroListo = true; rafaga(); }
          if (p < 0.9) cronometroListo = false;
          lista.forEach((paso) => {
            const n = $('.paso__n', paso).getBoundingClientRect();
            paso.classList.toggle('is-on', n.top + n.height / 2 < vh * 0.66);
          });
        }
      }
    };

    const pedir = () => {
      if (!programado) { programado = true; requestAnimationFrame(actualizar); }
    };
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    actualizar();
  }

  /* ======================================================================
     11. Resaltado del menú según la sección visible
     ====================================================================== */
  function initMenuActivo() {
    if (!('IntersectionObserver' in window)) return;
    const enlaces = $$('.nav ul a');
    const mapa = new Map();
    enlaces.forEach((a) => {
      const sec = $(a.getAttribute('href'));
      if (sec) mapa.set(sec, a);
    });
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        const enlace = mapa.get(e.target);
        if (enlace && e.isIntersecting) {
          enlaces.forEach((a) => a.removeAttribute('aria-current'));
          enlace.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    mapa.forEach((_, sec) => io.observe(sec));
  }

  /* ======================================================================
     12. Preguntas frecuentes (cierra las demás en navegadores sin name="")
     ====================================================================== */
  function initFaq() {
    const detalles = $$('.qa');
    detalles.forEach((d) => d.addEventListener('toggle', () => {
      if (!d.open) return;
      detalles.forEach((otro) => { if (otro !== d) otro.open = false; });
    }));
  }

  /* ======================================================================
     13. Onda al tocar los botones (anime.js si está; si no, Web Animations)
     ====================================================================== */
  function initOndas() {
    if (reduceMotion) return;
    document.addEventListener('pointerdown', (e) => {
      const boton = e.target.closest('.btn');
      if (!boton) return;
      const r = boton.getBoundingClientRect();
      const onda = document.createElement('span');
      const tam = Math.max(r.width, r.height) * 2;
      onda.setAttribute('aria-hidden', 'true');
      onda.style.cssText = `position:absolute;left:${e.clientX - r.left - tam / 2}px;top:${e.clientY - r.top - tam / 2}px;width:${tam}px;height:${tam}px;border-radius:50%;background:rgba(255,255,255,.45);pointer-events:none;z-index:0;`;
      boton.appendChild(onda);
      if (tieneAnime()) {
        window.anime({ targets: onda, scale: [0, 1], opacity: [0.6, 0], duration: 700, easing: 'easeOutQuad', complete: () => onda.remove() });
      } else {
        onda.animate([{ transform: 'scale(0)', opacity: 0.6 }, { transform: 'scale(1)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => onda.remove();
      }
    }, { passive: true });
  }

  /* ======================================================================
     14. Formulario de contacto → mensaje de WhatsApp
     ====================================================================== */
  function initFormulario() {
    const form = $('#formulario');
    if (!form) return;
    const msg = $('#formMsg');
    const mostrar = (texto) => { msg.textContent = texto; msg.hidden = !texto; };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      mostrar('');
      const nombre = form.nombre.value.trim();
      const vehiculo = form.vehiculo.value.trim();
      const situacion = form.situacion.value;
      const detalles = form.detalles.value.trim();

      let valido = true;
      [['nombre', nombre], ['vehiculo', vehiculo]].forEach(([campo, valor]) => {
        const caja = form[campo].closest('.field');
        const mal = valor.length < 2;
        caja.classList.toggle('is-bad', mal);
        if (mal) valido = false;
      });
      if (!valido) {
        mostrar('Cuéntanos tu nombre y qué vehículo quieres vender para armar tu mensaje.');
        const primero = form.querySelector('.is-bad input');
        if (primero) primero.focus();
        return;
      }
      if (!waDisponible) {
        mostrar('Por ahora no podemos abrir WhatsApp desde este formulario.');
        return;
      }
      const partes = [
        `Hola, soy ${nombre}.`,
        `Quiero vender mi vehículo: ${vehiculo}.`,
        `Mi situación: ${situacion}.`,
      ];
      if (detalles) partes.push(`Detalles: ${detalles}.`);
      partes.push('¿Me pueden dar su oferta?');
      abrirWhatsApp(waLink(partes.join('\n')));
    });
    $$('input', form).forEach((input) => input.addEventListener('input', () => {
      input.closest('.field').classList.remove('is-bad');
      mostrar('');
    }));
  }

  /* ======================================================================
     Arranque
     ====================================================================== */
  seguro(initWhatsApp);
  seguro(() => $$('[data-split]').forEach(dividirTexto));
  seguro(initMenu);
  seguro(initFormulario);
  seguro(initFaq);
  seguro(initDestello);
  seguro(initOndas);

  let revelacionesListas = false;
  let paginaIniciada = false;
  const iniciarPagina = () => {
    if (paginaIniciada) return;
    paginaIniciada = true;
    root.classList.add('is-ready');
    seguro(() => {
      const h1 = $('h1[data-split]');
      if (h1) h1.style.setProperty('--base', '250ms');
    });
    seguro(() => { initReveals(); revelacionesListas = true; });
    seguro(initParticulas);
    seguro(initHud);
    seguro(initInclinacion);
    seguro(initScroll);
    seguro(initMenuActivo);
  };
  try {
    initCargador(iniciarPagina);
  } catch (error) {
    console.warn('[landing]', error);
    iniciarPagina();
  }

  // Red de seguridad: solo si las entradas por scroll no pudieron iniciarse, se muestra todo.
  setTimeout(() => {
    if (revelacionesListas) return;
    $$('.reveal, [data-split]').forEach((el) => el.classList.add('is-in'));
  }, 5000);
})();
