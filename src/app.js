/**
 * app.js - MBTI Cocktail 桌面版 v2.0
 * 升级：维度滑块输入 + AI 生成鸡尾酒
 */
import engine from './engine.js';

// ==================== 全局状态 ====================
const State = {
  route: 'home',
  history: [],
  mbtiType: null,
  intensities: { E: 50, I: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 },
  detailId: null,
  favorites: [],
  wikiCategory: 'all',
  wikiMethod: 'all',
  wikiSearch: '',
  generatedHistory: [] // AI 生成酒名称历史（去重）
};

// ==================== 收藏管理 ====================
const FAV_KEY = 'mbti-cocktail-favorites';
const GEN_HISTORY_KEY = 'mbti-cocktail-gen-history';

async function loadFavs() {
  try {
    if (window.electronAPI?.isElectron) {
      const d = await window.electronAPI.loadFavorites();
      State.favorites = d || [];
    } else {
      State.favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    }
  } catch { State.favorites = []; }
}

function saveFavs() {
  try {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.saveFavorites(State.favorites).catch(() => {});
    } else {
      localStorage.setItem(FAV_KEY, JSON.stringify(State.favorites));
    }
  } catch { /* ignore */ }
}

function loadGenHistory() {
  try { State.generatedHistory = JSON.parse(localStorage.getItem(GEN_HISTORY_KEY) || '[]'); }
  catch { State.generatedHistory = []; }
}

function saveGenHistory() {
  try { localStorage.setItem(GEN_HISTORY_KEY, JSON.stringify(State.generatedHistory)); }
  catch { /* ignore */ }
}

function isFav(id) { return State.favorites.includes(id); }

function toggleFav(id) {
  const i = State.favorites.indexOf(id);
  if (i > -1) State.favorites.splice(i, 1);
  else State.favorites.push(id);
  saveFavs();
}

// ==================== 路由 ====================
window.navigate = function(route, data) {
  State.history.push({ route: State.route, data: State._routeData });
  State.route = route;
  State._routeData = data;
  render();
};

window.goBack = function() {
  if (State.history.length > 0) {
    const prev = State.history.pop();
    State.route = prev.route;
    State._routeData = prev.data;
  } else {
    State.route = 'home';
  }
  render();
};

function render() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  let pageId;
  const r = State.route;
  if (r === 'home') pageId = 'page-home';
  else if (r === 'result') { pageId = 'page-result'; renderResult(); }
  else if (r === 'detail') { pageId = 'page-detail'; renderDetail(); }
  else if (r === 'wiki') { pageId = 'page-wiki'; renderWiki(); }
  else if (r === 'favorites') { pageId = 'page-favorites'; renderFavorites(); }
  else if (r === 'profile') { pageId = 'page-profile'; renderProfile(); }
  else { pageId = 'page-home'; }
  document.getElementById(pageId)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    const nr = n.dataset.route;
    n.classList.toggle('active', nr === r || (r === 'result' && nr === 'home') || (r === 'detail' && nr === 'wiki'));
  });
}

// ==================== 首页滑块 ====================
const sliderPairs = [
  { id: 'EI', left: 'E', right: 'I' },
  { id: 'SN', left: 'S', right: 'N' },
  { id: 'TF', left: 'T', right: 'F' },
  { id: 'JP', left: 'J', right: 'P' }
];

window.onSliderChange = function() {
  for (const pair of sliderPairs) {
    const val = parseInt(document.getElementById('slider-' + pair.id).value);
    State.intensities[pair.left] = 100 - val;
    State.intensities[pair.right] = val;
    document.getElementById('val-' + pair.left).textContent = (100 - val) + '%';
    document.getElementById('val-' + pair.right).textContent = val + '%';
    document.getElementById('slider-fill-' + pair.id).style.width = val + '%';
  }

  // 更新 MBTI 预览
  State.mbtiType = [
    State.intensities.E >= State.intensities.I ? 'E' : 'I',
    State.intensities.S >= State.intensities.N ? 'S' : 'N',
    State.intensities.T >= State.intensities.F ? 'T' : 'F',
    State.intensities.J >= State.intensities.P ? 'J' : 'P'
  ].join('');
  document.getElementById('mbti-preview').textContent = State.mbtiType;
};

window.startRecommend = function() {
  onSliderChange();
  navigate('result');
};

// ==================== 类型选择器 ====================
window.toggleTypePicker = function() {
  document.getElementById('type-picker').classList.toggle('hidden');
  const types = engine.getAllMBTITypes();
  document.getElementById('type-grid').innerHTML = types.map(t => {
    const p = engine.getProfile(t);
    return `<div class="type-cell" onclick="selectType('${t}')" title="${p?.title || ''}">${t}</div>`;
  }).join('');
};

window.selectType = function(type) {
  // 根据类型设置默认滑块
  const dims = type.split('');
  const pairs = { 'E':'EI','I':'EI','S':'SN','N':'SN','T':'TF','F':'TF','J':'JP','P':'JP' };
  const lefts = { 'EI':'E','SN':'S','TF':'T','JP':'J' };

  for (const pair of sliderPairs) {
    const left = lefts[pair.id];
    const right = pair.right;
    const val = dims.includes(right) ? 75 : 25; // 偏向75%
    document.getElementById('slider-' + pair.id).value = val;
    State.intensities[left] = 100 - val;
    State.intensities[right] = val;
    document.getElementById('val-' + left).textContent = (100 - val) + '%';
    document.getElementById('val-' + right).textContent = val + '%';
    document.getElementById('slider-fill-' + pair.id).style.width = val + '%';
  }
  State.mbtiType = type;
  document.getElementById('mbti-preview').textContent = type;
  document.getElementById('type-picker').classList.add('hidden');
  navigate('result');
};

// ==================== 结果页 ====================
function renderResult() {
  const type = State.mbtiType;
  const profile = engine.getProfile(type);
  const recs = engine.getRecommendations(type, { intensities: State.intensities });

  document.getElementById('result-hero').innerHTML = `
    <div class="result-type">${type}</div>
    <div class="result-title">${profile?.title || ''}</div>
    <div class="result-desc">${profile?.description || ''}</div>
  `;

  // 维度强度条
  document.getElementById('intensity-bars').innerHTML = sliderPairs.map(pair => {
    const left = pair.left;
    const right = pair.right;
    const lpct = State.intensities[left];
    const rpct = State.intensities[right];
    return `
      <div class="intensity-row">
        <span class="intensity-label">${left}</span>
        <div class="intensity-track">
          <div class="intensity-fill-left" style="width:${lpct}%"></div>
          <div class="intensity-fill-right" style="width:${rpct}%"></div>
        </div>
        <span class="intensity-label">${right}</span>
      </div>`;
  }).join('');

  document.getElementById('result-list').innerHTML = recs.map(c => cocktailCard(c)).join('');

  // AI 生成
  generateAndShowAI();
}

function generateAndShowAI() {
  const cocktail = engine.generateCocktail(State.mbtiType, State.intensities, State.generatedHistory);
  State.generatedHistory.push(cocktail.name);
  State.aiCocktail = cocktail;  // 保存到全局状态
  saveGenHistory();
  document.getElementById('ai-result').innerHTML = cocktailCard(cocktail, true);
}

window.regenerateAI = function() {
  generateAndShowAI();
  showToast('已生成全新配方 ✨');
};

// ==================== 详情页 ====================
function renderDetail() {
  const id = State._routeData?.id || State.detailId;
  State.detailId = id;

  // 如果是 AI 生成的酒，直接渲染
  if (State._routeData?.aiCocktail) {
    renderCocktailDetail(State._routeData.aiCocktail);
    return;
  }
  // 检查全局 aiCocktail
  if (State.aiCocktail && State.aiCocktail.id === id) {
    renderCocktailDetail(State.aiCocktail);
    return;
  }

  import('./cocktails.js').then(mod => {
    const cocktails = mod.default;
    const cocktail = cocktails.find(x => x.id === id);
    if (!cocktail) return;
    renderCocktailDetail(cocktail);
  });
}

function renderCocktailDetail(cocktail) {
  const id = cocktail.id;
  document.getElementById('detail-fav-btn').classList.toggle('active', isFav(id));
  document.getElementById('detail-fav-btn').textContent = isFav(id) ? '♥' : '♡';
  const isAI = cocktail._isGenerated;

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-name">${cocktail.name}</div>
      <div class="detail-name-en">${cocktail.nameEn}</div>
      ${isAI ? '<div class="ai-badge-inline">✨ AI 特调</div>' : ''}
      <div class="detail-info-row">
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.strength}/5</div><div class="detail-info-label">烈度</div></div>
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.sweetness}/5</div><div class="detail-info-label">甜度</div></div>
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.abv}%</div><div class="detail-info-label">酒精度</div></div>
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.glass}</div><div class="detail-info-label">杯型</div></div>
      </div>
    </div>
    ${!isAI ? `<div class="detail-section"><div class="detail-section-title">关于这款酒</div><div class="detail-text">${cocktail.description}</div></div>` : ''}
    ${!isAI ? `<div class="detail-section"><div class="detail-section-title">背景故事</div><div class="detail-text">${cocktail.story}</div></div>` : ''}
    <div class="detail-section"><div class="detail-section-title">配方材料</div>
      ${cocktail.ingredients.map(i => `<div class="ingredient-row"><span class="ingredient-name">${i.name}</span><span class="ingredient-dots"></span><span class="ingredient-amount">${i.amount} ${i.unit}</span></div>`).join('')}
    </div>
    <div class="detail-section"><div class="detail-section-title">调制技法</div>
      <div class="method-display">
        <div class="method-icon-large">${getMethodEmoji(cocktail.method)}</div>
        <div><div class="method-name">${cocktail.methodLabel || cocktail.method}</div><div class="method-desc">${getMethodDesc(cocktail.method)}</div></div>
      </div>
    </div>
    ${cocktail.garnish ? `<div class="detail-section"><div class="detail-section-title">装饰</div><div class="detail-text">${cocktail.garnish}</div></div>` : ''}
    ${cocktail.tags?.length ? `<div class="detail-section"><div class="detail-section-title">标签</div><div class="card-tags">${cocktail.tags.map(t => `<span class="card-tag">#${t}</span>`).join(' ')}</div></div>` : ''}
    ${cocktail.mbtiMatch?.length ? `<div class="detail-section"><div class="detail-section-title">适合这些 MBTI 类型</div><div class="mbti-badges">${cocktail.mbtiMatch.map(t => `<span class="mbti-badge" onclick="selectType('${t}')">${t}</span>`).join('')}</div></div>` : ''}
  `;
}

window.toggleDetailFav = function() {
  const id = State.detailId;
  if (!id) return;
  toggleFav(id);
  const btn = document.getElementById('detail-fav-btn');
  btn.classList.toggle('active', isFav(id));
  btn.textContent = isFav(id) ? '♥' : '♡';
  showToast(isFav(id) ? '已收藏' : '已取消收藏');
};

// ==================== 百科 ====================
function renderWiki() {
  const categories = [{key:'all',label:'全部'},{key:'classic',label:'经典'},{key:'tropical',label:'热带'},{key:'modern',label:'现代'},{key:'spirit-forward',label:'烈酒'},{key:'creamy',label:'奶油'}];
  document.getElementById('wiki-category-filters').innerHTML = categories.map(c => `<span class="filter-tab ${State.wikiCategory===c.key?'active':''}" onclick="setWikiCategory('${c.key}')">${c.label}</span>`).join('');
  const methods = engine.getAllMethods();
  const allMethods = [{method:'all',label:'全部技法'}, ...methods];
  document.getElementById('wiki-method-filters').innerHTML = allMethods.map(m => `<span class="filter-tab ${State.wikiMethod===m.method?'active':''}" onclick="setWikiMethod('${m.method}')">${m.label}</span>`).join('');
  document.getElementById('wiki-search').value = State.wikiSearch;
  renderWikiList();
}

window.setWikiCategory = function(c) { State.wikiCategory = c; renderWiki(); };
window.setWikiMethod = function(m) { State.wikiMethod = m; renderWiki(); };

function renderWikiList() {
  import('./cocktails.js').then(mod => {
    let list = mod.default;
    if (State.wikiCategory !== 'all') list = list.filter(c => c.category === State.wikiCategory);
    if (State.wikiMethod !== 'all') list = list.filter(c => c.method === State.wikiMethod);
    const s = (document.getElementById('wiki-search')?.value || '').toLowerCase();
    if (s) list = list.filter(c => c.name.includes(s) || c.nameEn.toLowerCase().includes(s) || c.tags?.some(t => t.includes(s)) || c.flavorNotes?.some(f => f.includes(s)));
    document.getElementById('wiki-list').innerHTML = list.length > 0 ? list.map(c => cocktailCard(c)).join('') : '<div class="empty-state"><p>没有找到匹配的鸡尾酒</p></div>';
  });
}

// ==================== 收藏页 ====================
function renderFavorites() {
  import('./cocktails.js').then(mod => {
    const favs = mod.default.filter(c => State.favorites.includes(c.id));
    document.getElementById('favorites-list').innerHTML = favs.map(c => cocktailCard(c)).join('');
    document.getElementById('favorites-empty').classList.toggle('hidden', favs.length > 0);
  });
}

// ==================== 个人页 ====================
function renderProfile() {
  const el = document.getElementById('profile-mbti');
  if (State.mbtiType) {
    const p = engine.getProfile(State.mbtiType);
    el.innerHTML = `<div style="text-align:center"><div style="font-size:28px;font-weight:700;color:var(--gold);letter-spacing:4px;margin-bottom:4px">${State.mbtiType}</div><div style="font-size:14px;color:var(--text-secondary)">${p?.title||''}</div></div>`;
  } else {
    el.innerHTML = `<div style="text-align:center"><p style="color:var(--text-secondary);margin-bottom:12px">尚未设置 MBTI</p><button class="btn btn-outline" onclick="navigate('home')">去设置</button></div>`;
  }
}

// ==================== 鸡尾酒卡片 ====================
function cocktailCard(c, isAI = false) {
  return `
    <div class="cocktail-card ${isAI ? 'ai-card' : ''}" onclick="openDetail('${c.id}')">
      ${isAI ? '<div class="ai-badge">✨ AI 特调</div>' : ''}
      <div class="card-header">
        <div><span class="card-name">${c.name}</span><span class="card-name-en">${c.nameEn}</span></div>
        <span style="color:${isFav(c.id)?'var(--accent)':'var(--text-muted)'};font-size:18px">${isFav(c.id)?'♥':'♡'}</span>
      </div>
      <div class="card-desc">${c.description}</div>
      <div class="card-meta">
        <div class="meta-item"><span class="meta-label">烈度</span><div class="meta-bar"><div class="meta-bar-fill strength" style="width:${c.strength*20}%"></div></div></div>
        <div class="meta-item"><span class="meta-label">甜度</span><div class="meta-bar"><div class="meta-bar-fill sweetness" style="width:${c.sweetness*20}%"></div></div></div>
        <span class="meta-tag">${c.methodLabel||c.method}</span>
        <span class="meta-tag">${c.abv}%</span>
      </div>
      ${c.flavorNotes?.length ? `<div class="card-tags">${c.flavorNotes.slice(0,4).map(f=>`<span class="card-tag">#${f}</span>`).join(' ')}</div>` : ''}
    </div>`;
}

window.openDetail = function(id) {
  State.detailId = id;
  // 检查是否是 AI 生成的酒
  if (State.aiCocktail && State.aiCocktail.id === id) {
    navigate('detail', { id, aiCocktail: State.aiCocktail });
  } else {
    navigate('detail', { id });
  }
};

// ==================== 工具函数 ====================
function getMethodEmoji(m) { return ({shake:'🫗',stir:'🥄',build:'🥃',blend:'🌀','muddle-build':'🔨'})[m]||'🍸'; }
function getMethodDesc(m) {
  return ({shake:'所有材料加冰放入摇酒壶，摇和至充分冷却后过滤倒入杯中',stir:'所有材料加冰放入调酒杯，用吧勺搅拌至充分冷却后过滤倒入杯中',build:'直接在饮用杯中按顺序加入材料，加冰完成',blend:'所有材料加冰放入搅拌机打碎混合，倒入杯中','muddle-build':'先捣压草本/水果释放风味，再按直调法加入其余材料'})[m]||'按配方顺序调制';
}

function showToast(msg) {
  const t = document.querySelector('.toast'); if (t) t.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2000);
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadFavs();
  loadGenHistory();
  // 初始化滑块填充
  for (const pair of sliderPairs) {
    document.getElementById('slider-fill-' + pair.id).style.width = '50%';
  }
  render();
  document.getElementById('wiki-search')?.addEventListener('input', () => {
    State.wikiSearch = document.getElementById('wiki-search').value;
    renderWikiList();
  });
});

window.renderWiki = renderWiki;
window.renderWikiList = renderWikiList;
