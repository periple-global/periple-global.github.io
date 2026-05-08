/* ===== Periple OEM — main.js ===== */

/* ---------- Scroll reveal ---------- */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
})();

/* ---------- Mobile nav ---------- */
(function () {
  const btn = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
})();

/* ===== Inquiry Cart (localStorage) ===== */
const CART_KEY = 'periple-oem-cart-v1';
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  },
  set(arr) { localStorage.setItem(CART_KEY, JSON.stringify(arr)); this.dispatch(); },
  has(id) { return this.get().some((p) => p.id === id); },
  add(product) {
    const cart = this.get();
    if (cart.some((p) => p.id === product.id)) return false;
    cart.push({
      id: product.id,
      name_kr: product.name_kr,
      name_en: product.name_en,
      category: product.category,
      subcategory: product.subcategory,
      capacities: product.capacities,
      material: product.material,
      image: product.image,
    });
    this.set(cart);
    return true;
  },
  remove(id) {
    this.set(this.get().filter((p) => p.id !== id));
  },
  clear() { this.set([]); },
  count() { return this.get().length; },
  dispatch() { document.dispatchEvent(new CustomEvent('cart:change', { detail: this.get() })); },
};

/* ---------- Header cart count ---------- */
function updateHeaderCart() {
  const el = document.querySelector('.cart__count');
  if (!el) return;
  el.textContent = Cart.count();
}
document.addEventListener('cart:change', updateHeaderCart);
document.addEventListener('DOMContentLoaded', updateHeaderCart);
window.addEventListener('storage', (e) => { if (e.key === CART_KEY) updateHeaderCart(); });

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), 2000);
}

/* ===== Catalog page logic ===== */
const Catalog = {
  products: [],
  filtered: [],
  state: { category: [], subcategory: [], partner: [], material: [], usage: [], volume_bucket: [], sort: 'category' },

  async init() {
    const root = document.querySelector('[data-catalog]');
    if (!root) return;

    const params = new URLSearchParams(location.search);
    const cat = params.get('cat') || root.dataset.category;
    const sub = params.get('sub');
    const partner = params.get('partner');
    if (cat) this.state.category = [cat];
    if (sub) this.state.subcategory = [sub];
    if (partner) this.state.partner = [partner];

    try {
      const res = await fetch('data/products.json');
      this.products = await res.json();
    } catch (err) {
      console.error('Failed to load products:', err);
      return;
    }

    this.buildFilters();
    this.bindFilters();
    this.bindSort();
    this.apply();
    this.syncFilterCheckboxes();
    this.updateActiveCategoryCrumb(cat, sub, partner);
  },

  syncFilterCheckboxes() {
    document.querySelectorAll('input[type="checkbox"][data-filter]').forEach((cb) => {
      const key = cb.dataset.filter;
      cb.checked = (this.state[key] || []).includes(cb.value);
    });
  },

  updateActiveCategoryCrumb(cat, sub, partner) {
    const crumbs = document.querySelector('.plp-hero__crumbs');
    if (!crumbs) return;
    const labels = { skincare: 'Skincare', makeup: 'Makeup', special: 'Special' };
    let active = '';
    if (cat) active = labels[cat] || cat;
    else if (sub) active = sub.charAt(0).toUpperCase() + sub.slice(1);
    else if (partner) active = partner;
    if (active) crumbs.innerHTML = `Home / Package / <strong style="color:var(--color-text);">${active}</strong>`;
    const title = document.querySelector('.plp-hero__title');
    if (title && active) title.textContent = `${active} Packaging`;
  },

  buildFilters() {
    const buckets = {
      category: new Map(),
      subcategory: new Map(),
      usage: new Map(),
      material: new Map(),
      volume_bucket: new Map(),
    };
    this.products.forEach((p) => {
      buckets.category.set(p.category, (buckets.category.get(p.category) || 0) + 1);
      buckets.subcategory.set(p.subcategory, (buckets.subcategory.get(p.subcategory) || 0) + 1);
      (p.usage || []).forEach((u) => buckets.usage.set(u, (buckets.usage.get(u) || 0) + 1));
      (p.volume_bucket || []).forEach((v) => buckets.volume_bucket.set(v, (buckets.volume_bucket.get(v) || 0) + 1));
      const mats = (p.material || '').split(/[\/,]/).map((m) => m.trim()).filter(Boolean);
      mats.forEach((m) => buckets.material.set(m, (buckets.material.get(m) || 0) + 1));
    });

    const catLabels = { skincare: 'Skincare', makeup: 'Makeup', special: 'Special' };
    const subLabels = {
      bottle: 'Bottle', jar: 'Jar', tube: 'Tube', airless: 'Airless',
      pump: 'Pump', dropper: 'Dropper', pen: 'Pen', applicator: 'Applicator',
      compact: 'Compact', stick: 'Stick',
    };
    this.renderFilter('category', buckets.category, (k) => catLabels[k] || k);
    this.renderFilter('subcategory', buckets.subcategory, (k) => subLabels[k] || k);
    this.renderFilter('usage', buckets.usage);
    this.renderFilter('volume_bucket', buckets.volume_bucket);
    this.renderFilter('material', buckets.material);
  },

  renderFilter(key, map, labelFn) {
    const ul = document.querySelector(`[data-filter-list="${key}"]`);
    if (!ul) return;
    const items = [...map.entries()].sort((a, b) => b[1] - a[1]);
    ul.innerHTML = items.map(([val, count]) => `
      <li><label>
        <input type="checkbox" data-filter="${key}" value="${val}">
        <span>${labelFn ? labelFn(val) : val}</span>
        <span class="count">${count}</span>
      </label></li>
    `).join('');
  },

  bindFilters() {
    const root = document.querySelector('[data-catalog]');
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('input[type="checkbox"][data-filter]')) {
        const key = t.dataset.filter;
        const val = t.value;
        const arr = this.state[key];
        if (t.checked) { if (!arr.includes(val)) arr.push(val); }
        else { this.state[key] = arr.filter((v) => v !== val); }
        this.apply();
      }
    });

    document.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      ['category', 'subcategory', 'partner', 'material', 'usage', 'volume_bucket'].forEach((k) => { this.state[k] = []; });
      document.querySelectorAll('input[type="checkbox"][data-filter]').forEach((cb) => cb.checked = false);
      this.apply();
    });
  },

  bindSort() {
    document.querySelector('[data-sort]')?.addEventListener('change', (e) => {
      this.state.sort = e.target.value;
      this.apply();
    });
  },

  apply() {
    const s = this.state;
    this.filtered = this.products.filter((p) => {
      if (s.category.length && !s.category.includes(p.category)) return false;
      if (s.subcategory.length && !s.subcategory.includes(p.subcategory)) return false;
      if (s.partner.length && !s.partner.includes(p.partner)) return false;
      if (s.usage.length && !s.usage.some((u) => (p.usage || []).includes(u))) return false;
      if (s.volume_bucket.length && !s.volume_bucket.some((v) => (p.volume_bucket || []).includes(v))) return false;
      if (s.material.length) {
        const mats = (p.material || '').split(/[\/,]/).map((m) => m.trim());
        if (!s.material.some((m) => mats.includes(m))) return false;
      }
      return true;
    });

    if (s.sort === 'category') {
      const order = { skincare: 0, makeup: 1, special: 2 };
      this.filtered.sort((a, b) => (order[a.category] - order[b.category]) || a.subcategory.localeCompare(b.subcategory));
    }
    else if (s.sort === 'capacity') {
      this.filtered.sort((a, b) => Math.min(...(a.capacities || [0])) - Math.min(...(b.capacities || [0])));
    }
    else if (s.sort === 'name') this.filtered.sort((a, b) => a.name_kr.localeCompare(b.name_kr));

    this.render();
  },

  render() {
    const grid = document.querySelector('[data-grid]');
    const count = document.querySelector('[data-count]');
    if (!grid) return;
    if (count) count.innerHTML = `<strong>${this.filtered.length}</strong>개 / 전체 ${this.products.length}개`;

    if (!this.filtered.length) {
      grid.innerHTML = '<div class="empty-state">조건에 맞는 용기가 없습니다.</div>';
      return;
    }

    grid.innerHTML = this.filtered.map((p) => {
      const usageTags = (p.usage || []).slice(0, 3).map((u) => `<span>${u}</span>`).join('');
      return `
      <article class="product" data-id="${p.id}">
        <div class="product__thumb">
          <img loading="lazy" src="${p.image}" alt="${p.name_kr}" onerror="this.onerror=null;this.src='assets/images/placeholder.jpg';">
        </div>
        <div class="product__body">
          <div class="product__cat">${p.category} · ${p.subcategory}</div>
          <h3 class="product__name">${p.name_kr}</h3>
          <div class="product__en">${p.name_en}</div>
          <div class="product__meta">
            <span><strong>${p.capacities?.join(' / ') || '-'}</strong>ml · ${p.material || ''}</span>
          </div>
          ${usageTags ? `<div class="product__usage-tags">${usageTags}</div>` : ''}
          <div class="product__actions">
            <button class="product__add ${Cart.has(p.id) ? 'is-added' : ''}" data-add="${p.id}">
              ${Cart.has(p.id) ? '✓ Added' : '+ Inquiry'}
            </button>
          </div>
        </div>
      </article>
      `;
    }).join('');

    this.bindCards();
  },

  bindCards() {
    const grid = document.querySelector('[data-grid]');
    if (!grid) return;
    grid.querySelectorAll('.product').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-add]')) return;
        const id = card.dataset.id;
        const p = this.products.find((x) => x.id === id);
        if (p) Modal.open(p);
      });
    });
    grid.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.add;
        const p = this.products.find((x) => x.id === id);
        if (!p) return;
        if (Cart.has(id)) {
          Cart.remove(id);
          btn.classList.remove('is-added');
          btn.textContent = '+ 인콰이어리 담기';
          toast('인콰이어리에서 제거됨');
        } else {
          Cart.add(p);
          btn.classList.add('is-added');
          btn.textContent = '✓ 인콰이어리에 담김';
          toast('인콰이어리에 담았습니다');
        }
      });
    });
  },
};

/* ===== Product modal ===== */
const Modal = {
  el: null,
  open(p) {
    if (!this.el) this.create();
    const modalImg = this.el.querySelector('.modal__img img');
    modalImg.src = p.image;
    modalImg.onerror = () => { modalImg.onerror = null; modalImg.src = 'assets/images/placeholder.jpg'; };
    this.el.querySelector('.modal__cat').textContent = `${p.category} · ${p.subcategory}`;
    this.el.querySelector('.modal__title').textContent = p.name_kr;
    this.el.querySelector('.modal__en').textContent = p.name_en;
    this.el.querySelector('.modal__desc').textContent = p.description || '';
    this.el.querySelector('.modal__specs').innerHTML = `
      <dt>용량</dt><dd>${p.capacities?.join(' / ') || '-'} ml</dd>
      <dt>소재</dt><dd>${p.material || '-'}</dd>
      <dt>특징</dt><dd>${(p.features || []).join(' · ') || '-'}</dd>
    `;
    const codePrefix = p.id.split('-')[0].toUpperCase().slice(0, 2);
    const internalRefs = (p.models || []).map((_, i) =>
      `${codePrefix}-${String(i + 1).padStart(3, '0')}`
    );
    this.el.querySelector('.modal__models').innerHTML = internalRefs
      .map((m) => `<span class="tag">REF · ${m}</span>`).join('');
    const addBtn = this.el.querySelector('.modal__add');
    const setAddState = () => {
      if (Cart.has(p.id)) { addBtn.classList.add('is-added'); addBtn.textContent = '✓ 인콰이어리에 담김'; }
      else { addBtn.classList.remove('is-added'); addBtn.textContent = '+ 인콰이어리 담기'; }
    };
    setAddState();
    addBtn.onclick = () => {
      if (Cart.has(p.id)) { Cart.remove(p.id); toast('인콰이어리에서 제거됨'); }
      else { Cart.add(p); toast('인콰이어리에 담았습니다'); }
      setAddState();
      Catalog.render();
    };
    this.el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  },
  close() {
    this.el?.classList.remove('is-open');
    document.body.style.overflow = '';
  },
  create() {
    this.el = document.createElement('div');
    this.el.className = 'modal-backdrop';
    this.el.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal__close" aria-label="닫기">×</button>
        <div class="modal__img"><img alt=""></div>
        <div class="modal__body">
          <div class="modal__cat"></div>
          <h2 class="modal__title"></h2>
          <div class="modal__en"></div>
          <p class="modal__desc"></p>
          <dl class="modal__specs"></dl>
          <div class="modal__models"></div>
          <button class="btn btn--primary modal__add">+ 인콰이어리 담기</button>
        </div>
      </div>`;
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    this.el.querySelector('.modal__close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
  },
};

/* ===== Inquiry page logic ===== */
const Inquiry = {
  init() {
    const root = document.querySelector('[data-inquiry]');
    if (!root) return;
    this.render();
    document.addEventListener('cart:change', () => this.render());

    document.querySelector('[data-inquiry-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const items = Cart.get();
      const data = Object.fromEntries(new FormData(form).entries());

      const lines = [
        `[Periple OEM/ODM 인콰이어리]`,
        ``,
        `■ 발신: ${data.name || ''} (${data.company || '-'})`,
        `■ 이메일: ${data.email || ''}`,
        `■ 연락처: ${data.phone || '-'}`,
        `■ 국가/지역: ${data.country || '-'}`,
        `■ 예상 수량: ${data.qty || '-'}`,
        `■ 희망 납기: ${data.deadline || '-'}`,
        ``,
        `■ 관심 패키지 (${items.length}개)`,
        ...items.map((p) => `  · [${p.id}] ${p.name_kr} — ${p.category}/${p.subcategory} · ${(p.capacities || []).join('/')} ml · ${p.material || ''}`),
        ``,
        `■ 추가 요청사항`,
        data.message || '-',
      ];
      const body = encodeURIComponent(lines.join('\n'));
      const subject = encodeURIComponent(`[Periple OEM] ${data.company || data.name || '문의'} — ${items.length}개 패키지`);
      window.location.href = `mailto:oem@periple.co.kr?subject=${subject}&body=${body}`;
    });
  },
  render() {
    const list = document.querySelector('[data-cart-list]');
    if (!list) return;
    const items = Cart.get();
    if (!items.length) {
      list.innerHTML = `<div class="cart-empty">담긴 패키지가 없습니다.<br><a href="package.html" style="color:var(--color-accent);font-weight:600;">→ 패키지 둘러보기</a></div>`;
      return;
    }
    list.innerHTML = items.map((p) => `
      <li>
        <img src="${p.image}" alt="" onerror="this.onerror=null;this.src='assets/images/placeholder.jpg';">
        <div>
          <div class="name">${p.name_kr}</div>
          <div class="meta">${p.category} · ${p.subcategory} · ${(p.capacities || []).join('/')} ml</div>
        </div>
        <button class="remove" data-remove="${p.id}" aria-label="제거">×</button>
      </li>
    `).join('');
    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => Cart.remove(btn.dataset.remove));
    });
  },
};

/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  Catalog.init();
  Inquiry.init();
});
