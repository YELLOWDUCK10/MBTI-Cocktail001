/**
 * app.js - MBTI Cocktail 桌面版 v2.0
 * 升级：维度滑块输入 + AI 生成鸡尾酒
 */
import engine from './engine.js';
import COCKTAILS from './cocktails.js';
import { METHODS } from './flavor-library.js';

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
  generatedHistory: [], // AI 生成酒名称历史（去重）
  mythEnabled: true,    // 神话命名开关（v1.1，默认开）
  taste: { baseSpirit: {}, structure: {}, flavor: {}, verdicts: {} }, // 味觉档案（v1.1）
  // 碰杯模式（v1.1）：双人输入态（仅内存，不做持久化）
  cheersA: { intensities: { E: 50, I: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 }, type: null },
  cheersB: { intensities: { E: 50, I: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 }, type: null },
  duoCocktail: null,    // 当前会话的合体特调
  recList: [],          // 当前类型的全量已排序推荐（带 _score）
  recShownIds: [],      // 本轮已展示过的推荐酒款 id
  recCurrent: []        // 当前展示的一组推荐
};

// ==================== 收藏管理 ====================
// 格式：[{type:'ref', id}（经典酒引用）| {type:'ai', cocktail}（AI 酒完整对象）]
const FAV_KEY = 'mbti-cocktail-favorites';
const GEN_HISTORY_KEY = 'mbti-cocktail-gen-history';
const LAST_STATE_KEY = 'mbti-cocktail-last-state';
const MYTH_KEY = 'mbti-cocktail-myth-switch';
const TASTE_KEY = 'mbti-cocktail-taste';

function favId(f) { return f.type === 'ai' ? f.cocktail.id : f.id; }

function normalizeFav(f) {
  if (typeof f === 'string') return { type: 'ref', id: f };                 // 旧格式：纯 id
  if (f && f.type === 'ref' && f.id) return f;
  if (f && f.type === 'ai' && f.cocktail && f.cocktail.id) return f;
  return null;
}

async function loadFavs() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    State.favorites = raw.map(normalizeFav).filter(Boolean);
    // 检测到旧格式（纯 id）则迁移后立即写回
    if (raw.some(f => typeof f === 'string')) saveFavs();
  } catch { State.favorites = []; }
}

function saveFavs() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(State.favorites)); }
  catch { /* ignore */ }
}

// AI 生成历史（v1.1 存储升级）：[{ name, cocktail, ts }]，兼容旧版纯名称字符串数组
function loadGenHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(GEN_HISTORY_KEY) || '[]');
    State.generatedHistory = raw
      .map(h => typeof h === 'string' ? { name: h, cocktail: null, ts: 0 } : h) // 旧格式迁移（无完整对象，仅保留去重名）
      .filter(h => h && h.name);
  } catch { State.generatedHistory = []; }
}

function saveGenHistory() {
  try { localStorage.setItem(GEN_HISTORY_KEY, JSON.stringify(State.generatedHistory)); }
  catch { /* ignore */ }
}

// engine 去重只认名称数组
function genHistoryNames() { return State.generatedHistory.map(h => h.name); }

// 神话命名开关（v1.1）：仅影响 AI 命名层，不影响推荐算法
function loadMythSwitch() {
  try { State.mythEnabled = localStorage.getItem(MYTH_KEY) !== 'off'; }
  catch { State.mythEnabled = true; }
}

function saveMythSwitch() {
  try { localStorage.setItem(MYTH_KEY, State.mythEnabled ? 'on' : 'off'); }
  catch { /* ignore */ }
}

// ==================== 味觉档案（v1.1 反向微调，PRD 7.2） ====================
// 👍/👎 反馈聚合为属性偏好向量（基酒/结构/风味标签净计数），推荐分据此做 ±5 小幅修正。
// verdicts 记录单酒反馈（1=👍 / -1=👎）用于界面回显。全部仅存 localStorage。
function loadTaste() {
  try {
    const t = JSON.parse(localStorage.getItem(TASTE_KEY) || 'null');
    if (t && typeof t === 'object') {
      State.taste = {
        baseSpirit: t.baseSpirit || {},
        structure: t.structure || {},
        flavor: t.flavor || {},
        verdicts: t.verdicts || {}
      };
    }
  } catch { /* ignore */ }
}

function saveTaste() {
  try { localStorage.setItem(TASTE_KEY, JSON.stringify(State.taste)); }
  catch { /* ignore */ }
}

function addTasteCount(obj, key, delta) {
  obj[key] = (obj[key] || 0) + delta;
  if (obj[key] === 0) delete obj[key]; // 归零清理，控制体积
}

/** 应用/切换/取消一次反馈：verdict ∈ {1: 👍, -1: 👎, 0: 取消} */
function applyTasteVerdict(cocktail, verdict) {
  const t = State.taste;
  const prev = t.verdicts[cocktail.id] || 0;
  const delta = verdict - prev;
  if (delta !== 0) {
    addTasteCount(t.baseSpirit, cocktail.baseSpirit, delta);
    addTasteCount(t.structure, cocktail.structure, delta);
    for (const f of (cocktail.flavorNotes || [])) addTasteCount(t.flavor, f, delta);
  }
  if (verdict === 0) delete t.verdicts[cocktail.id];
  else t.verdicts[cocktail.id] = verdict;
  saveTaste();
}

function isFav(id) { return State.favorites.some(f => favId(f) === id); }

function toggleFav(id, cocktail) {
  const i = State.favorites.findIndex(f => favId(f) === id);
  if (i > -1) State.favorites.splice(i, 1);
  else if (cocktail && cocktail._isGenerated) State.favorites.push({ type: 'ai', cocktail });
  else State.favorites.push({ type: 'ref', id });
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
  else if (r === 'cheers') { pageId = 'page-cheers'; renderCheers(); }
  else if (r === 'detail') { pageId = 'page-detail'; renderDetail(); }
  else if (r === 'wiki') { pageId = 'page-wiki'; renderWiki(); }
  else if (r === 'favorites') { pageId = 'page-favorites'; renderFavorites(); }
  else if (r === 'profile') { pageId = 'page-profile'; renderProfile(); }
  else { pageId = 'page-home'; }
  document.getElementById(pageId)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    const nr = n.dataset.route;
    n.classList.toggle('active', nr === r || (r === 'result' && nr === 'home') || (r === 'cheers' && nr === 'home') || (r === 'detail' && nr === 'wiki'));
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
    State.intensities[pair.left] = val;
    State.intensities[pair.right] = 100 - val;
    document.getElementById('val-' + pair.left).textContent = val + '%';
    document.getElementById('val-' + pair.right).textContent = (100 - val) + '%';
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
  saveLastState();
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
    const val = dims.includes(right) ? 25 : 75; // 左侧值：选右侧字母→25，选左侧字母→75
    document.getElementById('slider-' + pair.id).value = val;
    State.intensities[left] = val;
    State.intensities[right] = 100 - val;
    document.getElementById('val-' + left).textContent = val + '%';
    document.getElementById('val-' + right).textContent = (100 - val) + '%';
    document.getElementById('slider-fill-' + pair.id).style.width = val + '%';
  }
  State.mbtiType = type;
  document.getElementById('mbti-preview').textContent = type;
  document.getElementById('type-picker').classList.add('hidden');
  saveLastState();
  navigate('result');
};

// ==================== last-state（滑块位置 + 类型，重开自动恢复） ====================
function saveLastState() {
  try { localStorage.setItem(LAST_STATE_KEY, JSON.stringify({ intensities: State.intensities, mbtiType: State.mbtiType })); }
  catch { /* ignore */ }
}

function restoreLastState() {
  try {
    const s = JSON.parse(localStorage.getItem(LAST_STATE_KEY) || 'null');
    if (!s || !s.intensities || !s.mbtiType) return;
    State.intensities = s.intensities;
    State.mbtiType = s.mbtiType;
    const leftVal = { EI: s.intensities.E, SN: s.intensities.S, TF: s.intensities.T, JP: s.intensities.J };
    for (const pair of sliderPairs) {
      const val = leftVal[pair.id];
      document.getElementById('slider-' + pair.id).value = val;
      document.getElementById('val-' + pair.left).textContent = val + '%';
      document.getElementById('val-' + pair.right).textContent = (100 - val) + '%';
      document.getElementById('slider-fill-' + pair.id).style.width = val + '%';
    }
    document.getElementById('mbti-preview').textContent = s.mbtiType;
  } catch { /* ignore */ }
}

// ==================== 结果页 ====================
function renderResult() {
  const type = State.mbtiType;
  const profile = engine.getProfile(type);
  State.recList = engine.getRecommendations(type, { intensities: State.intensities, taste: State.taste });
  State.recShownIds = State.recList.slice(0, 5).map(c => c.id);
  State.recCurrent = State.recList.slice(0, 5);

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

  renderResultList();

  // AI 生成
  generateAndShowAI();
}

function renderResultList() {
  const container = document.getElementById('result-list');
  if (!State.recCurrent.length) {
    container.innerHTML = '<div class="empty-state"><p>没有匹配的鸡尾酒，试试调整维度</p></div>';
    return;
  }
  container.innerHTML = State.recCurrent.map(c => cocktailCard(c, { match: c._score, exact: c._exact })).join('');
}

window.shuffleRecs = function() {
  const list = State.recList;
  if (!list.length) return;
  // 排除已展示酒款，取下一组 Top-5；池耗尽则从头循环
  let remaining = list.filter(c => !State.recShownIds.includes(c.id));
  if (remaining.length === 0) {
    State.recShownIds = [];
    remaining = list;
  }
  const next = remaining.slice(0, 5);
  State.recShownIds.push(...next.map(c => c.id));
  State.recCurrent = next;
  renderResultList();
  showToast('已换一批 🍹');
};

function generateAndShowAI() {
  const cocktail = engine.generateCocktail(State.mbtiType, State.intensities, genHistoryNames(), { mythMode: State.mythEnabled });
  State.generatedHistory.push({ name: cocktail.name, cocktail, ts: Date.now() });
  State.aiCocktail = cocktail;  // 保存到全局状态
  saveGenHistory();
  document.getElementById('ai-result').innerHTML = cocktailCard(cocktail, { ai: true });
}

window.regenerateAI = function() {
  generateAndShowAI();
  showToast('已生成全新配方 ✨');
};

// ==================== 碰杯模式（v1.1 双人合体特调） ====================
const DIM_LABELS = { E: 'E 外向', I: 'I 内向', S: 'S 实感', N: 'N 直觉', T: 'T 思维', F: 'F 情感', J: 'J 判断', P: 'P 感知' };

function cheersSliderHTML(side) {
  return sliderPairs.map(pair => `
    <div class="slider-group">
      <div class="slider-labels">
        <span class="slider-label-left">${DIM_LABELS[pair.left]}</span>
        <span class="slider-label-right">${DIM_LABELS[pair.right]}</span>
      </div>
      <div class="slider-track">
        <input type="range" min="0" max="100" value="${State['cheers' + side].intensities[pair.left]}" class="slider-input" id="cheer-${side}-${pair.id}" oninput="onCheersSliderChange('${side}')">
        <div class="slider-fill" id="cheer-fill-${side}-${pair.id}"></div>
      </div>
      <div class="slider-values">
        <span id="cheer-val-${side}-${pair.left}">${State['cheers' + side].intensities[pair.left]}%</span>
        <span id="cheer-val-${side}-${pair.right}">${State['cheers' + side].intensities[pair.right]}%</span>
      </div>
    </div>`).join('');
}

function renderCheers() {
  document.getElementById('cheers-columns').innerHTML = `
    <div class="cheer-column">
      <div class="cheer-col-title">🥂 人格 A</div>
      <div class="cheer-type-preview" id="cheer-preview-A">${State.cheersA.type || '----'}</div>
      ${cheersSliderHTML('A')}
      <button class="btn btn-outline cheer-picker-btn" onclick="toggleCheersPicker('A')">🎯 直选类型</button>
      <div id="cheer-picker-A" class="type-picker hidden">
        <p class="picker-label">选择人格 A 的类型</p>
        <div class="type-grid" id="cheer-grid-A"></div>
      </div>
    </div>
    <div class="cheers-vs">×</div>
    <div class="cheer-column">
      <div class="cheer-col-title">🍸 人格 B</div>
      <div class="cheer-type-preview" id="cheer-preview-B">${State.cheersB.type || '----'}</div>
      ${cheersSliderHTML('B')}
      <button class="btn btn-outline cheer-picker-btn" onclick="toggleCheersPicker('B')">🎯 直选类型</button>
      <div id="cheer-picker-B" class="type-picker hidden">
        <p class="picker-label">选择人格 B 的类型</p>
        <div class="type-grid" id="cheer-grid-B"></div>
      </div>
    </div>`;
  const rs = document.getElementById('cheers-result-section');
  rs.hidden = true;
  document.getElementById('cheers-result').innerHTML = '';
}

window.onCheersSliderChange = function(side) {
  const state = State['cheers' + side];
  for (const pair of sliderPairs) {
    const val = parseInt(document.getElementById(`cheer-${side}-${pair.id}`).value);
    state.intensities[pair.left] = val;
    state.intensities[pair.right] = 100 - val;
    document.getElementById(`cheer-val-${side}-${pair.left}`).textContent = val + '%';
    document.getElementById(`cheer-val-${side}-${pair.right}`).textContent = (100 - val) + '%';
    document.getElementById(`cheer-fill-${side}-${pair.id}`).style.width = val + '%';
  }
  state.type = [
    state.intensities.E >= state.intensities.I ? 'E' : 'I',
    state.intensities.S >= state.intensities.N ? 'S' : 'N',
    state.intensities.T >= state.intensities.F ? 'T' : 'F',
    state.intensities.J >= state.intensities.P ? 'J' : 'P'
  ].join('');
  document.getElementById(`cheer-preview-${side}`).textContent = state.type;
};

window.toggleCheersPicker = function(side) {
  const picker = document.getElementById(`cheer-picker-${side}`);
  picker.classList.toggle('hidden');
  if (picker.classList.contains('hidden')) return;
  document.getElementById(`cheer-grid-${side}`).innerHTML = engine.getAllMBTITypes().map(t => {
    const p = engine.getProfile(t);
    return `<div class="type-cell" onclick="selectCheersType('${side}','${t}')" title="${p?.title || ''}">${t}</div>`;
  }).join('');
};

window.selectCheersType = function(side, type) {
  const state = State['cheers' + side];
  const dims = type.split('');
  const lefts = { EI: 'E', SN: 'S', TF: 'T', JP: 'J' };
  for (const pair of sliderPairs) {
    const left = lefts[pair.id];
    const val = dims.includes(pair.right) ? 25 : 75; // 左侧值：选右侧字母→25，选左侧字母→75
    state.intensities[left] = val;
    state.intensities[pair.right] = 100 - val;
    document.getElementById(`cheer-${side}-${pair.id}`).value = val;
    document.getElementById(`cheer-val-${side}-${pair.left}`).textContent = val + '%';
    document.getElementById(`cheer-val-${side}-${pair.right}`).textContent = (100 - val) + '%';
    document.getElementById(`cheer-fill-${side}-${pair.id}`).style.width = val + '%';
  }
  state.type = type;
  document.getElementById(`cheer-preview-${side}`).textContent = type;
  document.getElementById(`cheer-picker-${side}`).classList.add('hidden');
};

function generateAndShowDuo() {
  const a = State.cheersA, b = State.cheersB;
  // 未操作过滑块/直选时，按当前默认 50/50 推导类型
  if (!a.type) onCheersSliderChange('A');
  if (!b.type) onCheersSliderChange('B');
  const cocktail = engine.generateDuoCocktail(a.type, a.intensities, b.type, b.intensities, genHistoryNames(), { mythMode: State.mythEnabled });
  State.generatedHistory.push({ name: cocktail.name, cocktail, ts: Date.now() });
  State.duoCocktail = cocktail;
  saveGenHistory();
  document.getElementById('cheers-result').innerHTML = cocktailCard(cocktail, { ai: true });
  document.getElementById('cheers-result-section').hidden = false;
}

window.generateDuo = function() {
  generateAndShowDuo();
  showToast('合体特调已就绪 🥂');
};

window.regenerateDuo = function() {
  generateAndShowDuo();
  showToast('已生成全新配方 ✨');
};

// ==================== 详情页 ====================
function renderDetail() {
  const id = State._routeData?.id || State.detailId;
  State.detailId = id;

  // 路由数据里带 AI 酒（当前会话或收藏）直接渲染
  if (State._routeData?.aiCocktail) {
    renderCocktailDetail(State._routeData.aiCocktail);
    return;
  }
  // 当前会话的 AI 酒
  if (State.aiCocktail && State.aiCocktail.id === id) {
    renderCocktailDetail(State.aiCocktail);
    return;
  }
  // 当前会话的合体特调（v1.1 碰杯模式）
  if (State.duoCocktail && State.duoCocktail.id === id) {
    renderCocktailDetail(State.duoCocktail);
    return;
  }
  // 收藏里的 AI 酒（跨会话恢复）
  const favAI = State.favorites.find(f => f.type === 'ai' && f.cocktail.id === id);
  if (favAI) {
    renderCocktailDetail(favAI.cocktail);
    return;
  }

  const cocktail = COCKTAILS.find(x => x.id === id);
  if (cocktail) renderCocktailDetail(cocktail);
}

function renderCocktailDetail(cocktail) {
  const id = cocktail.id;
  State._detailCocktail = cocktail;
  document.getElementById('detail-fav-btn').classList.toggle('active', isFav(id));
  document.getElementById('detail-fav-btn').textContent = isFav(id) ? '♥' : '♡';
  const isAI = cocktail._isGenerated;
  const verdict = State.taste.verdicts[id] || 0;

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-name">${cocktail.name}</div>
      <div class="detail-name-en">${cocktail.nameEn}</div>
      ${isAI ? `<div class="ai-badge-inline">${cocktail._isDuo ? '🥂 合体特调' : '✨ AI 特调'}</div>` : ''}
      <div class="detail-info-row">
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.strength}/5</div><div class="detail-info-label">烈度</div></div>
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.sweetness}/5</div><div class="detail-info-label">甜度</div></div>
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.abv}%</div><div class="detail-info-label">酒精度</div></div>
        <div class="detail-info-item"><div class="detail-info-value">${cocktail.glass}</div><div class="detail-info-label">杯型</div></div>
      </div>
    </div>
    ${!isAI ? `<div class="detail-section"><div class="detail-section-title">关于这款酒</div><div class="detail-text">${cocktail.description}</div></div>` : ''}
    ${!isAI ? `<div class="detail-section"><div class="detail-section-title">背景故事</div><div class="detail-text">${cocktail.story}</div></div>` : ''}
    <div class="detail-section"><div class="detail-section-title-row">
      <div class="detail-section-title">配方材料</div>
      <button class="copy-recipe-btn" onclick="copyRecipe()">📋 复制配方</button>
    </div>
      ${cocktail.ingredients.map(i => `<div class="ingredient-row"><span class="ingredient-name">${i.name}</span><span class="ingredient-dots"></span><span class="ingredient-amount">${i.amount} ${i.unit}</span></div>`).join('')}
    </div>
    <div class="detail-section"><div class="detail-section-title">味觉档案</div>
      <div class="taste-rate">
        <button class="taste-btn up ${verdict === 1 ? 'active' : ''}" onclick="rateCocktail('${id}', 1)">👍 好喝</button>
        <button class="taste-btn down ${verdict === -1 ? 'active' : ''}" onclick="rateCocktail('${id}', -1)">👎 不合口味</button>
      </div>
      <div class="taste-hint">你的反馈会小幅微调推荐排序（±5），越用越懂你；数据仅保存在本机</div>
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
  const cocktail = State._detailCocktail;
  const id = State.detailId;
  if (!id) return;
  toggleFav(id, cocktail);
  const btn = document.getElementById('detail-fav-btn');
  btn.classList.toggle('active', isFav(id));
  btn.textContent = isFav(id) ? '♥' : '♡';
  showToast(isFav(id) ? '已收藏' : '已取消收藏');
};

// 味觉档案打分（v1.1）：👍/👎 单选可取消，实时更新按钮态并累积偏好向量
window.rateCocktail = function(id, verdict) {
  const cocktail = State._detailCocktail;
  if (!cocktail || cocktail.id !== id) return;
  const prev = State.taste.verdicts[id] || 0;
  const next = prev === verdict ? 0 : verdict;
  applyTasteVerdict(cocktail, next);
  document.querySelector('.taste-btn.up')?.classList.toggle('active', next === 1);
  document.querySelector('.taste-btn.down')?.classList.toggle('active', next === -1);
  showToast(next === 1 ? '记下了：喜欢这口 🍸' : next === -1 ? '记下了：这口不合口味' : '已取消反馈');
};

// 一键复制配方文案（v1.1，PRD 7.2）：clipboard API 优先，file:// 等非安全上下文降级 execCommand
function buildRecipeText(c) {
  const lines = [
    `🍸 ${c.name} ${c.nameEn || ''}`.trim(),
    '─────────────',
    ...(c.ingredients || []).map(i => `· ${i.name} ${i.amount}${i.unit}`),
    '─────────────'
  ];
  if (c.garnish) lines.push(`装饰：${c.garnish}`);
  if (c.methodLabel || c.method) lines.push(`技法：${c.methodLabel || c.method}`);
  lines.push('—— 来自 MBTI Cocktail');
  return lines.join('\n');
}

function writeClipboard(text) {
  // 首选异步 Clipboard API（http:// 等安全上下文可用）
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
  }
  return Promise.resolve(execCommandCopy(text));
}

function execCommandCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

window.copyRecipe = function() {
  const c = State._detailCocktail;
  if (!c) return;
  writeClipboard(buildRecipeText(c)).then(ok => {
    showToast(ok !== false ? '配方已复制 📋' : '复制失败，请手动记录');
  });
};

// 卡片心形一键收藏（PRD 4.6）
window.toggleCardFav = function(id) {
  let cocktail = null;
  if (State.aiCocktail && State.aiCocktail.id === id) cocktail = State.aiCocktail;
  else if (State.duoCocktail && State.duoCocktail.id === id) cocktail = State.duoCocktail;
  else {
    const f = State.favorites.find(x => x.type === 'ai' && x.cocktail.id === id);
    if (f) cocktail = f.cocktail;
    else cocktail = COCKTAILS.find(c => c.id === id) || null;
  }
  toggleFav(id, cocktail);
  showToast(isFav(id) ? '已收藏' : '已取消收藏');
  refreshCurrentList();
};

// 收藏状态变更后局部刷新当前列表
function refreshCurrentList() {
  if (State.route === 'result') renderResultList();
  else if (State.route === 'wiki') renderWikiList();
  else if (State.route === 'favorites') renderFavorites();
}

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
  let list = COCKTAILS;
  if (State.wikiCategory !== 'all') list = list.filter(c => c.category === State.wikiCategory);
  if (State.wikiMethod !== 'all') list = list.filter(c => c.method === State.wikiMethod);
  const s = (document.getElementById('wiki-search')?.value || '').toLowerCase();
  if (s) list = list.filter(c => c.name.includes(s) || c.nameEn.toLowerCase().includes(s) || c.tags?.some(t => t.includes(s)) || c.flavorNotes?.some(f => f.includes(s)));
  // 默认编辑评分降序（PRD 4.4）
  list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  document.getElementById('wiki-list').innerHTML = list.length > 0 ? list.map(c => cocktailCard(c)).join('') : '<div class="empty-state"><p>没有找到匹配的鸡尾酒</p></div>';
}

// ==================== 收藏页 ====================
function renderFavorites() {
  // 按收藏时间倒序：最新收藏排最前（PRD 4.6）
  const entries = State.favorites.map(f => f.type === 'ai' ? f.cocktail : COCKTAILS.find(c => c.id === f.id)).filter(Boolean).reverse();
  document.getElementById('favorites-list').innerHTML = entries.map(c => cocktailCard(c, c._isGenerated ? { ai: true } : {})).join('');
  document.getElementById('favorites-empty').classList.toggle('hidden', entries.length > 0);
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

  renderProfileStats();
  renderProfileCocktailBook();

  // 设置区块：神话命名开关（v1.1）
  const settingsEl = document.getElementById('profile-settings');
  if (settingsEl) {
    settingsEl.innerHTML = `
      <div class="section-label">设置</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-title">✨ 神话命名</div>
          <div class="setting-desc">AI 特调以神话原型命名（如"哈迪斯之谋"），仅影响命名，不影响推荐结果</div>
        </div>
        <div class="toggle ${State.mythEnabled ? 'on' : ''}" onclick="toggleMythNaming()">
          <div class="toggle-knob"></div>
        </div>
      </div>`;
  }
}

// 收藏统计 + 味觉档案反馈统计（v1.1，PRD 7.2 增强个人页）
function renderProfileStats() {
  const el = document.getElementById('profile-stats');
  if (!el) return;
  const favTotal = State.favorites.length;
  const favAI = State.favorites.filter(f => f.type === 'ai').length;
  const favClassic = favTotal - favAI;
  let likeCount = 0, dislikeCount = 0;
  for (const v of Object.values(State.taste.verdicts || {})) {
    if (v === 1) likeCount++;
    else if (v === -1) dislikeCount++;
  }
  const hasAny = favTotal > 0 || likeCount > 0 || dislikeCount > 0;
  el.innerHTML = `
    <div class="section-label">我的吧台</div>
    <div class="stats-row">
      <div class="stats-item"><div class="stats-num">${favTotal}</div><div class="stats-label">收藏</div></div>
      <div class="stats-item"><div class="stats-num">${favClassic}</div><div class="stats-label">经典</div></div>
      <div class="stats-item"><div class="stats-num">${favAI}</div><div class="stats-label">AI 特调</div></div>
      <div class="stats-item"><div class="stats-num">${likeCount}<span class="stats-sub">👍</span></div><div class="stats-label">好喝</div></div>
      <div class="stats-item"><div class="stats-num">${dislikeCount}<span class="stats-sub">👎</span></div><div class="stats-label">不合口味</div></div>
    </div>
    ${!hasAny ? '<p class="stats-empty">收藏和反馈会出现在这里，越用越懂你 🍸</p>' : ''}`;
}

// 人格酒单：AI 生成历史（含碰杯合体特调），最近 10 杯（v1.1，PRD 7.2）
function renderProfileCocktailBook() {
  const el = document.getElementById('profile-cocktailbook');
  if (!el) return;
  const history = State.generatedHistory.filter(h => h.cocktail).slice(-10).reverse(); // 最新在前
  if (!history.length) {
    el.innerHTML = `
      <div class="section-label">🍸 人格酒单</div>
      <div class="cocktailbook-empty">
        <p>还没有专属特调。</p>
        <button class="btn btn-outline" onclick="navigate('home')">去生成第一杯 AI 特调</button>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="section-label">🍸 人格酒单 <span class="section-label-sub">最近 ${history.length} 杯</span></div>
    ${history.map(h => cocktailCard(h.cocktail, h.cocktail._isGenerated ? { ai: true } : {})).join('')}`;
}

window.toggleMythNaming = function() {
  State.mythEnabled = !State.mythEnabled;
  saveMythSwitch();
  if (State.route === 'profile') renderProfile();
  showToast(State.mythEnabled ? '神话命名已开启 ✨' : '神话命名已关闭');
};

// ==================== 鸡尾酒卡片 ====================
function cocktailCard(c, opts = {}) {
  const isAI = !!opts.ai;
  const match = opts.match;
  return `
    <div class="cocktail-card ${isAI ? 'ai-card' : ''}" onclick="openDetail('${c.id}')">
      ${isAI ? `<div class="ai-badge">${c._isDuo ? '🥂 合体特调' : '✨ AI 特调'}</div>` : ''}
      <div class="card-header">
        <div><span class="card-name">${c.name}</span><span class="card-name-en">${c.nameEn}</span></div>
        <span class="card-fav ${isFav(c.id) ? 'active' : ''}" onclick="event.stopPropagation(); toggleCardFav('${c.id}')">${isFav(c.id) ? '♥' : '♡'}</span>
      </div>
      <div class="card-desc">${c.description}</div>
      ${match != null ? `
      <div class="match-row">
        <span class="match-label">${opts.exact ? '🎯 匹配度' : '匹配度'}</span>
        <div class="match-bar"><div class="match-fill" style="width:${match}%"></div></div>
        <span class="match-pct">${match}%</span>
      </div>` : ''}
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
  // AI 酒：当前会话的，或收藏里的（跨会话）
  let aiCocktail = null;
  if (State.aiCocktail && State.aiCocktail.id === id) aiCocktail = State.aiCocktail;
  else if (State.duoCocktail && State.duoCocktail.id === id) aiCocktail = State.duoCocktail;
  else {
    const fav = State.favorites.find(f => f.type === 'ai' && f.cocktail.id === id);
    if (fav) aiCocktail = fav.cocktail;
  }
  navigate('detail', aiCocktail ? { id, aiCocktail } : { id });
};

// ==================== 工具函数 ====================
function getMethodEmoji(m) { return (METHODS[m] && METHODS[m].emoji) || '🍸'; }

function getMethodDesc(m) {
  return (METHODS[m] && METHODS[m].desc) || '按配方顺序调制';
}

// 随机来一杯：从库内酒款随机跳转详情页
window.randomCocktail = function() {
  if (COCKTAILS.length === 0) return;
  const c = COCKTAILS[Math.floor(Math.random() * COCKTAILS.length)];
  window.openDetail(c.id);
};

function showToast(msg) {
  const t = document.querySelector('.toast'); if (t) t.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2000);
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadFavs();
  loadGenHistory();
  loadMythSwitch();
  loadTaste();
  // 恢复上次滑块位置与类型（打开仍落在首页，仅恢复输入态）
  restoreLastState();
  if (State.intensities.E === 50) {
    // 无历史状态时初始化滑块填充为 50%
    for (const pair of sliderPairs) {
      document.getElementById('slider-fill-' + pair.id).style.width = '50%';
    }
  }
  render();
  document.getElementById('wiki-search')?.addEventListener('input', () => {
    State.wikiSearch = document.getElementById('wiki-search').value;
    renderWikiList();
  });
});

window.renderWiki = renderWiki;
window.renderWikiList = renderWikiList;
