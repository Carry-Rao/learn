import { parseMarkdown } from './markdown.js';

const REPO = 'Carry-Rao/learn';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${REPO}/contents`;
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
let CATEGORIES = [];

function fileNameToTitle(name) {
  return name.replace(/\.md$/i, '').split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function readPath() {
  const p = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (p[0] === 'learn') p.shift(); // handle /learn/... dev path
  return p;
}

async function apiGet(path) {
  const url = path ? `${API}/${path}` : API;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function getCategories() {
  if (CATEGORIES.length) return CATEGORIES;
  const items = await apiGet('');
  CATEGORIES = items.filter(i => i.type === 'dir' && !i.name.startsWith('.'));
  return CATEGORIES;
}

async function getColumns(cat) {
  const items = await apiGet(cat);
  return items.filter(i => i.type === 'dir');
}

async function getArticles(cat, col) {
  const items = await apiGet(`${cat}/${col}`);
  return items.filter(i => i.type === 'file' && i.name.endsWith('.md'));
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

async function render(path) {
  const app = document.querySelector('#app');
  const crumbs = [];
  let html = '';

  try {
    if (!path || path === '') {
      const cats = await getCategories();
      updateGithubLink('');
      renderBreadcrumb([]);
      app.innerHTML = `<div class="category-grid">${cats.map(c =>
        `<div class="card category-card" data-path="${c.name}">
          <h2>${fileNameToTitle(c.name)}</h2>
          <p class="desc">${c.name}</p>
        </div>`
      ).join('')}</div>`;
      app.querySelectorAll('.category-card').forEach(el =>
        el.addEventListener('click', () => navigate([el.dataset.path]))
      );
      return;
    }

    const parts = path.split('/');
    if (parts.length === 1) {
      const [cat] = parts;
      const cols = await getColumns(cat);
      updateGithubLink(cat);
      crumbs.push({ path: cat, name: fileNameToTitle(cat) });
      renderBreadcrumb(crumbs);
      app.innerHTML = `<div class="column-list">${cols.map(c =>
        `<div class="card column-card" data-path="${cat}/${c.name}">
          <h3>${fileNameToTitle(c.name)}</h3>
          <p class="desc">${c.name}</p>
        </div>`
      ).join('')}</div>`;
      app.querySelectorAll('.column-card').forEach(el =>
        el.addEventListener('click', () => navigate(el.dataset.path.split('/')))
      );
      return;
    }

    if (parts.length === 2) {
      const [cat, col] = parts;
      const arts = await getArticles(cat, col);
      crumbs.push({ path: cat, name: fileNameToTitle(cat) });
      updateGithubLink(cat + '/' + col);
      crumbs.push({ path: `${cat}/${col}`, name: fileNameToTitle(col) });
      renderBreadcrumb(crumbs);
      app.innerHTML = `<div class="article-list">${arts.map((a, i) => {
        const slug = a.name.replace(/\.md$/i, '');
        return `<div class="card article-card" data-path="${cat}/${col}/${slug}">
          <h4>${i+1}. ${fileNameToTitle(a.name)}</h4>
          <p class="desc">${a.name}</p>
        </div>`;
      }).join('')}</div>`;
      app.querySelectorAll('.article-card').forEach(el =>
        el.addEventListener('click', () => navigate(el.dataset.path.split('/')))
      );
      return;
    }

    if (parts.length === 3) {
      const [cat, col, slug] = parts;
      const file = slug.endsWith('.md') ? slug : slug + '.md';
      crumbs.push({ path: cat, name: fileNameToTitle(cat) });
      crumbs.push({ path: `${cat}/${col}`, name: fileNameToTitle(col) });
      updateGithubLink(cat + '/' + col + '/' + file);
      crumbs.push({ path: `${cat}/${col}/${slug}`, name: fileNameToTitle(file) });
      renderBreadcrumb(crumbs);

      app.innerHTML = '<div class="article-detail"><div class="content"><br>加载中...</div></div>';
      const res = await fetch(`${RAW}/${cat}/${col}/${file}`);
      const raw = await res.text();
      const md = parseMarkdown(raw);
      const title = raw.match(/^#\s+(.+)/m);
      app.innerHTML = `<div class="article-detail">
        <h2>${title ? title[1] : fileNameToTitle(file)}</h2>
        <div class="meta">${fileNameToTitle(cat)} / ${fileNameToTitle(col)}</div>
        <div class="content">${md.html}</div>
      </div>`;
    }
  } catch (e) {
    app.innerHTML = `<div class="error">加载失败: ${e.message}<br><br><button onclick="location.reload()">重试</button></div>`;
  }
}

function updateGithubLink(path) {
  const btn = document.querySelector('#github-btn');
  if (!path) btn.href = `https://github.com/${REPO}`;
  else btn.href = `https://github.com/${REPO}/tree/main/${path}`;
}

export function init() {
  render(readPath().join('/'));
  window.addEventListener('popstate', () => render(readPath().join('/')));
}
