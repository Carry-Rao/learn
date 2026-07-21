import { parseMarkdown } from './markdown.js';
import { renderCode } from './code/render.js';

const REPO = 'Carry-Rao/learn';
let data = null;

function fileNameToTitle(name) {
  return name.replace(/\.md$/i, '').split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function readPath() {
  const p = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (p[0] === 'learn') p.shift();
  return p;
}

async function loadData() {
  if (data) return data;
  const res = await fetch('/content.json');
  data = await res.json();
  return data;
}

function renderBreadcrumb(parts) {
  const el = document.querySelector('#breadcrumb');
  if (!parts.length) { el.innerHTML = ''; return; }
  let html = '<span class="crumb" data-path="">首页</span>';
  for (const p of parts) {
    html += `<span class="sep">/</span><span class="crumb" data-path="${p.path}">${p.name}</span>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.crumb').forEach(s => {
    s.addEventListener('click', () => {
      navigate(s.dataset.path ? s.dataset.path.split('/') : []);
    });
  });
}

function navigate(parts) {
  const path = parts.join('/');
  history.pushState(null, '', path ? '/' + path : '/');
  render(path);
}

function updateGithubLink(path) {
  const btn = document.querySelector('#github-btn');
  if (!path) btn.href = `https://github.com/${REPO}`;
  else btn.href = `https://github.com/${REPO}/tree/main/${path}`;
}

async function render(path) {
  const app = document.querySelector('#app');
  const d = await loadData();

  try {
    if (!path || path === '') {
      updateGithubLink('');
      renderBreadcrumb([]);
      app.innerHTML = `<div class="category-grid">${d.categories.map(c =>
        `<div class="card category-card" data-path="${c.slug}">
          <h2>${c.name}</h2>
          <p class="desc">${c.slug}</p>
        </div>`
      ).join('')}</div>`;
      app.querySelectorAll('.category-card').forEach(el =>
        el.addEventListener('click', () => navigate([el.dataset.path]))
      );
      return;
    }

    const parts = path.split('/');

    if (parts.length === 1) {
      const [slug] = parts;
      const cat = d.categories.find(c => c.slug === slug);
      if (!cat) throw new Error('Category not found');
      updateGithubLink(slug);
      renderBreadcrumb([{ path: slug, name: cat.name }]);
      app.innerHTML = `<div class="column-list">${cat.columns.map(col =>
        `<div class="card column-card" data-path="${slug}/${col.slug}">
          <h3>${col.name}</h3>
          <p class="desc">${col.articles.length} 篇文章</p>
        </div>`
      ).join('')}</div>`;
      app.querySelectorAll('.column-card').forEach(el =>
        el.addEventListener('click', () => navigate(el.dataset.path.split('/')))
      );
      return;
    }

    if (parts.length === 2) {
      const [catSlug, colSlug] = parts;
      const cat = d.categories.find(c => c.slug === catSlug);
      if (!cat) throw new Error('Category not found');
      const col = cat.columns.find(c => c.slug === colSlug);
      if (!col) throw new Error('Column not found');
      updateGithubLink(catSlug + '/' + colSlug);
      renderBreadcrumb([
        { path: catSlug, name: cat.name },
        { path: `${catSlug}/${colSlug}`, name: col.name }
      ]);
      app.innerHTML = `<div class="article-list">${col.articles.map((a, i) =>
        `<div class="card article-card" data-path="${catSlug}/${colSlug}/${a}">
          <h4>${i+1}. ${fileNameToTitle(a)}</h4>
        </div>`
      ).join('')}</div>`;
      app.querySelectorAll('.article-card').forEach(el =>
        el.addEventListener('click', () => navigate(el.dataset.path.split('/')))
      );
      return;
    }

    if (parts.length === 3) {
      const [catSlug, colSlug, slug] = parts;
      const cat = d.categories.find(c => c.slug === catSlug);
      if (!cat) throw new Error('Category not found');
      const col = cat.columns.find(c => c.slug === colSlug);
      if (!col) throw new Error('Column not found');
      const file = slug.endsWith('.md') ? slug : slug + '.md';
      updateGithubLink(catSlug + '/' + colSlug + '/' + file);
      renderBreadcrumb([
        { path: catSlug, name: cat.name },
        { path: `${catSlug}/${colSlug}`, name: col.name },
        { path: `${catSlug}/${colSlug}/${slug}`, name: fileNameToTitle(file) }
      ]);

      app.innerHTML = '<div class="article-detail"><div class="content"><br>加载中...</div></div>';
      const res = await fetch(`/${catSlug}/${colSlug}/${file}`);
      const raw = await res.text();
      const md = parseMarkdown(raw);
      const title = raw.match(/^#\s+(.+)/m);
      app.innerHTML = `<div class="article-detail">
        <h2>${title ? title[1] : fileNameToTitle(file)}</h2>
        <div class="meta">${cat.name} / ${col.name}</div>
        <div class="content">${md.html}</div>
      </div>`;
      for (let i = 1; i <= md.codeCount; i++) {
        const dom = document.querySelector(`#code-block-${i}`);
        if (dom) renderCode(md.codeBlocks[i], md.codeLangs[i], dom);
      }
    }
  } catch (e) {
    app.innerHTML = `<div class="error">加载失败: ${e.message}<br><br><button onclick="location.reload()">重试</button></div>`;
  }
}

export function init() {
  render(readPath().join('/'));
  window.addEventListener('popstate', () => render(readPath().join('/')));
}
