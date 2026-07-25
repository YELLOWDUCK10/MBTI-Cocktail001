/**
 * engine.js - MBTI 推荐引擎 v2.0
 *
 * 升级：
 * 1. 连续值维度强度驱动评分（替代二分匹配）
 * 2. AI 鸡尾酒生成模块
 */
import COCKTAILS from './cocktails.js';
import { MBTI_QUESTIONS } from './mbti-questions.js';
import { MBTI_PROFILES } from './mbti-profiles.js';
import {
  BASE_SPIRITS, ACIDIFIERS, SWEETENERS, MODIFIERS,
  MIXERS, BITTERS_SPICES, GARNISHES, FLAVOR_KEYWORDS,
  FLAVOR_CONFLICTS, METHODS, GLASSES, inferColor
} from './flavor-library.js';

// ==================== 维度偏好映射（不变） ====================
const DIMENSION_PREFERENCE = {
  E: { structure: ['highball','tiki','punch','fizz','collins'], baseSpirit: [], flavor: ['气泡','清爽','热带水果','派对感'], strength: [2,3], scene: ['派对','社交','户外'] },
  I: { structure: ['martini','old-fashioned','manhattan','sour'], baseSpirit: [], flavor: ['草本','烟熏','苦味','复杂'], strength: [4,5], scene: ['独饮','商务','餐后'] },
  S: { structure: [], baseSpirit: ['rum','tequila'], flavor: ['柑橘','莓果','青柠','热带水果','薄荷'], strength: [2,3,4], scene: ['户外','夏日','派对'] },
  N: { structure: [], baseSpirit: ['gin','whiskey'], flavor: ['草本','香料','烟熏','茴香','复杂'], strength: [3,4,5], scene: ['独饮','正式场合','冬日'] },
  T: { structure: ['old-fashioned','martini','manhattan'], baseSpirit: ['whiskey','gin'], flavor: ['苦味','草本','辛辣','干型'], strength: [4,5], sweetness: [0,1,2] },
  F: { structure: ['sour','tiki','fizz','cream'], baseSpirit: ['rum','vodka','tequila'], flavor: ['果味','花香','甜品','丝滑','奶香'], strength: [1,2,3], sweetness: [3,4,5] },
  J: { structure: ['old-fashioned','martini','manhattan','sour'], baseSpirit: [], flavor: ['经典','极简'], difficulty: [1,2] },
  P: { structure: ['tiki','fizz','punch'], baseSpirit: [], flavor: ['创意','复杂','热带'], difficulty: [2,3] }
};

// ==================== 结构模板（供 AI 生成用） ====================
const STRUCTURE_TEMPLATES = {
  'highball': { required: ['base','mixer'], optional: ['acid'], method: 'build', glass: 'highball' },
  'sour': { required: ['base','acid','sweetener'], optional: ['modifier'], method: 'shake', glass: 'coupe' },
  'martini': { required: ['base','modifier'], optional: [], method: 'stir', glass: 'coupe' },
  'old-fashioned': { required: ['base','sweetener','bitters'], optional: ['mixer'], method: 'build', glass: 'rocks' },
  'fizz': { required: ['base','acid','sweetener','mixer'], optional: ['modifier'], method: 'shake', glass: 'fizz' },
  'collins': { required: ['base','acid','sweetener','mixer'], optional: [], method: 'build', glass: 'collins' },
  'manhattan': { required: ['base','modifier','bitters'], optional: [], method: 'stir', glass: 'coupe' },
  'margarita': { required: ['base','modifier','acid'], optional: [], method: 'shake', glass: 'margarita' },
  'tiki': { required: ['base','acid','sweetener'], optional: ['modifier','mixer'], method: 'shake', glass: 'hurricane' },
  'cream': { required: ['base','modifier'], optional: ['sweetener'], method: 'build', glass: 'rocks' }
};

// ==================== 工具函数 ====================
function parseType(t) { return t.split(''); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickWeighted(items, weights) {
  const total = weights.reduce((a,b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// ==================== 核心：连续值加权评分 ====================

/**
 * 计算单款鸡尾酒与 MBTI 类型 + 维度强度的匹配分数
 * @param {Object} cocktail
 * @param {string} mbtiType - "INTJ"
 * @param {Object} intensities - { E:70, I:30, S:60, N:40, ... } 每个维度的百分比强度
 * @returns {number} 0-100
 */
export function calculateMatchScore(cocktail, mbtiType, intensities = null) {
  const dims = parseType(mbtiType);

  // 如果没有强度数据，回退到旧二分法
  if (!intensities) {
    return calculateMatchScoreBinary(cocktail, dims);
  }

  let score = 0;

  // 1. 基酒 (30%)
  score += dimensionWeightedScore(dims, intensities, 'baseSpirit', (d, v) => {
    const prefs = DIMENSION_PREFERENCE[d].baseSpirit || [];
    if (prefs.length === 0) return 0.5;
    return prefs.includes(cocktail.baseSpirit) ? 1 : 0;
  }) * 30;

  // 2. 结构 (25%)
  score += dimensionWeightedScore(dims, intensities, 'structure', (d, v) => {
    const prefs = DIMENSION_PREFERENCE[d].structure || [];
    if (prefs.length === 0) return 0.5;
    return prefs.includes(cocktail.structure) ? 1 : 0;
  }) * 25;

  // 3. 风味 (25%)
  const cf = cocktail.flavorNotes || [];
  score += dimensionWeightedScore(dims, intensities, 'flavor', (d, v) => {
    const prefs = DIMENSION_PREFERENCE[d].flavor || [];
    if (prefs.length === 0) return 0.5;
    const matches = prefs.filter(f => cf.some(c => c.includes(f) || f.includes(c))).length;
    return Math.min(matches / Math.max(prefs.length, 1), 1);
  }) * 25;

  // 4. 口感/甜度 (10%)
  score += dimensionWeightedScore(dims, intensities, 'strength', (d, v) => {
    const prefs = DIMENSION_PREFERENCE[d].strength;
    const sweetPrefs = DIMENSION_PREFERENCE[d].sweetness;
    let dimScore = 0, count = 0;
    if (prefs && prefs.length > 0) { count++; if (prefs.includes(cocktail.strength)) dimScore++; }
    if (sweetPrefs && sweetPrefs.length > 0) { count++; if (sweetPrefs.includes(cocktail.sweetness)) dimScore++; }
    return count > 0 ? dimScore / count : 0.5;
  }) * 10;

  // 5. 场景 (10%)
  const cs = cocktail.scene || [];
  score += dimensionWeightedScore(dims, intensities, 'scene', (d, v) => {
    const prefs = DIMENSION_PREFERENCE[d].scene || [];
    if (prefs.length === 0) return 0.5;
    const matches = prefs.filter(s => cs.includes(s)).length;
    return Math.min(matches / prefs.length, 1);
  }) * 10;

  return Math.round(score);
}

/**
 * 维度加权混合评分
 * 根据强度百分比混合两个极性的得分
 */
function dimensionWeightedScore(dims, intensities, field, scorer) {
  // 四个维度对的极性
  const pairs = [['E','I'], ['S','N'], ['T','F'], ['J','P']];
  let total = 0;

  for (const [a, b] of pairs) {
    const dim = dims.includes(a) ? a : b;
    const opposite = dim === a ? b : a;
    const strength = (intensities[dim] || 50) / 100;        // 主导极性权重
    const oppStrength = 1 - strength;                        // 对极权重

    const dimScore = scorer(dim, strength);
    const oppScore = scorer(opposite, oppStrength);

    total += dimScore * strength + oppScore * oppStrength;
  }

  return total / 4;
}

// 旧版二分法（回退用）
function calculateMatchScoreBinary(cocktail, dims) {
  let score = 0;
  const pairs = [
    { field: 'baseSpirit', weight: 30, match: (d) => {
      const p = DIMENSION_PREFERENCE[d].baseSpirit || [];
      return p.length === 0 ? 0.5 : (p.includes(cocktail.baseSpirit) ? 1 : 0);
    }},
    { field: 'structure', weight: 25, match: (d) => {
      const p = DIMENSION_PREFERENCE[d].structure || [];
      return p.length === 0 ? 0.5 : (p.includes(cocktail.structure) ? 1 : 0);
    }},
    { field: 'flavor', weight: 25, match: (d) => {
      const p = DIMENSION_PREFERENCE[d].flavor || [];
      if (p.length === 0) return 0.5;
      const cf = cocktail.flavorNotes || [];
      return Math.min(p.filter(f => cf.some(c => c.includes(f) || f.includes(c))).length / p.length, 1);
    }},
    { field: 'body', weight: 10, match: (d) => {
      const ps = DIMENSION_PREFERENCE[d].strength, sp = DIMENSION_PREFERENCE[d].sweetness;
      let ds = 0, c = 0;
      if (ps?.length) { c++; if (ps.includes(cocktail.strength)) ds++; }
      if (sp?.length) { c++; if (sp.includes(cocktail.sweetness)) ds++; }
      return c > 0 ? ds / c : 0.5;
    }},
    { field: 'scene', weight: 10, match: (d) => {
      const p = DIMENSION_PREFERENCE[d].scene || [];
      if (p.length === 0) return 0.5;
      const cs = cocktail.scene || [];
      return Math.min(p.filter(s => cs.includes(s)).length / p.length, 1);
    }}
  ];
  for (const { field, weight, match } of pairs) {
    let dimScore = 0;
    for (const d of dims) dimScore += match(d);
    score += (dimScore / dims.length) * weight;
  }
  return Math.round(score);
}

// ==================== AI 鸡尾酒生成 ====================

/**
 * 生成一款符合 MBTI 偏好的 AI 鸡尾酒
 * @param {string} mbtiType
 * @param {Object} intensities - 维度强度
 * @param {string[]} history - 已生成的名称列表（去重用）
 * @returns {Object} 完整的鸡尾酒对象
 */
export function generateCocktail(mbtiType, intensities, history = []) {
  const dims = parseType(mbtiType);
  let attempts = 0;

  while (attempts < 20) {
    attempts++;
    const cocktail = tryGenerate(dims, intensities, mbtiType);
    if (!history.includes(cocktail.id) && !history.includes(cocktail.name)) {
      return cocktail;
    }
  }
  // 如果20次都重复（极小概率），强制加后缀
  const c = tryGenerate(dims, intensities, mbtiType);
  c.id += '-' + Date.now();
  c.name += ' ' + (history.length + 1);
  return c;
}

function tryGenerate(dims, intensities, mbtiType) {
  // 1. 选结构（根据维度偏好加权）
  const structureScores = {};
  for (const [sname] of Object.entries(STRUCTURE_TEMPLATES)) {
    structureScores[sname] = dims.reduce((sum, d) => {
      const prefs = DIMENSION_PREFERENCE[d].structure || [];
      return sum + (prefs.includes(sname) ? 1 : 0.3);
    }, 0);
  }
  const structureNames = Object.keys(structureScores);
  const structureWeights = structureNames.map(s => structureScores[s] + Math.random() * 2);
  const structure = pickWeighted(structureNames, structureWeights);
  const template = STRUCTURE_TEMPLATES[structure];

  // 2. 选基酒
  const spiritKeys = Object.keys(BASE_SPIRITS);
  const spiritWeights = spiritKeys.map(k => {
    const s = BASE_SPIRITS[k];
    return dims.reduce((sum, d) => {
      const prefs = DIMENSION_PREFERENCE[d].baseSpirit || [];
      const match = prefs.some(p => k.includes(p)) ? 2 : 0.5;
      return sum + match;
    }, 0) + Math.random() * 3;
  });
  const baseKey = pickWeighted(spiritKeys, spiritWeights);
  const baseSpirit = BASE_SPIRITS[baseKey];

  // 3. 搭配料
  const ingredients = [{ name: baseSpirit.name, amount: '45', unit: 'ml', category: 'base' }];
  const usedFlavors = [...baseSpirit.flavors];

  // 酸
  if (template.required.includes('acid') || (template.optional && template.optional.includes('acid') && Math.random() > 0.4)) {
    const acid = pickRandom(ACIDIFIERS);
    ingredients.push({ name: acid.name, amount: acid.amount, unit: acid.unit, category: 'acid' });
    usedFlavors.push(...acid.flavors);
  }

  // 甜
  if (template.required.includes('sweetener') || (template.optional && template.optional.includes('sweetener') && Math.random() > 0.5)) {
    const sweet = pickRandom(SWEETENERS);
    ingredients.push({ name: sweet.name, amount: sweet.amount, unit: sweet.unit, category: 'sweetener' });
    usedFlavors.push(...sweet.flavors);
  }

  // 风味剂
  if (template.required.includes('modifier') || (template.optional && template.optional.includes('modifier') && Math.random() > 0.4)) {
    const mod = pickRandom(MODIFIERS);
    // 风味冲突检测
    const conflict = FLAVOR_CONFLICTS.some(([a,b]) =>
      mod.flavors.some(f => f.includes(a) || a.includes(f)) &&
      usedFlavors.some(uf => uf.includes(b) || b.includes(uf))
    );
    if (!conflict || Math.random() > 0.7) {
      ingredients.push({ name: mod.name, amount: mod.amount, unit: mod.unit, category: 'modifier' });
      usedFlavors.push(...mod.flavors);
    }
  }

  // 苦精
  if (template.required.includes('bitters')) {
    const bitter = pickRandom(BITTERS_SPICES);
    ingredients.push({ name: bitter.name, amount: bitter.amount, unit: bitter.unit, category: 'modifier' });
    usedFlavors.push(...bitter.flavors);
  }

  // 碳酸/混合剂
  if (template.required.includes('mixer') || (template.optional && template.optional.includes('mixer') && Math.random() > 0.5)) {
    const mixer = pickRandom(MIXERS);
    ingredients.push({ name: mixer.name, amount: mixer.amount, unit: mixer.unit, category: 'mixer' });
    usedFlavors.push(...mixer.flavors);
  }

  // 4. 装饰
  const garnish = pickRandom(GARNISHES);

  // 5. 技法
  const method = template.method;
  const methodInfo = METHODS[method] || METHODS['build'];

  // 6. 推断属性
  const abv = Math.round(baseSpirit.abv * 0.35);
  const sweetness = usedFlavors.filter(f => ['甜','甜美','焦糖','蜂蜜','花香','果味','奶香'].some(k => f.includes(k))).length > 2 ? rand(3,4) : rand(1,3);
  const strength = abv > 25 ? rand(4,5) : abv > 15 ? rand(2,4) : rand(1,3);
  const color = inferColor(ingredients);

  // 7. 风味标签（去重）
  const flavorNotes = [...new Set(usedFlavors)].slice(0, 5);

  // 8. 命名
  const name = generateName(mbtiType, flavorNotes, structure);

  // 9. 难度
  const difficulty = ingredients.length <= 3 ? 1 : ingredients.length <= 5 ? 2 : 3;

  return {
    id: 'ai-' + structure + '-' + baseKey + '-' + Date.now(),
    name: name,
    nameEn: 'AI Signature: ' + structure.charAt(0).toUpperCase() + structure.slice(1),
    category: 'ai-generated',
    image: '',
    glass: GLASSES[template.glass] || '古典杯',
    structure: structure,
    baseSpirit: baseKey.includes('whiskey') ? 'whiskey' : baseKey.includes('rum') ? 'rum' : baseKey.includes('tequila') ? 'tequila' : baseKey.includes('vodka') ? 'vodka' : 'gin',
    strength: strength,
    sweetness: sweetness,
    abv: abv,
    color: color,
    difficulty: difficulty,
    rating: 4.0,
    mbtiMatch: [mbtiType],
    description: `由AI根据${mbtiType}的个性特征特调而成，${structure}结构带来${flavorNotes.slice(0,2).join('与')}的独特体验。`,
    story: `这是一款由风味引擎为${mbtiType}（${MBTI_PROFILES[mbtiType]?.title || ''}）专属生成的创意特调，每一次生成都是独一无二的配方。`,
    method: method,
    methodLabel: methodInfo.label,
    ingredients: ingredients,
    garnish: garnish,
    flavorNotes: flavorNotes,
    scene: ['独饮', '社交', '探索'],
    tags: ['AI特调', '创意', '独家', structure],
    _isGenerated: true
  };
}

// ==================== 命名生成 ====================
function generateName(mbtiType, flavorNotes, structure) {
  const profile = MBTI_PROFILES[mbtiType];
  const title = profile?.title || mbtiType;

  // 随机选一个风味类别和关键词
  const categories = Object.keys(FLAVOR_KEYWORDS);
  const cat = pickRandom(categories);
  const flavorWord = pickRandom(FLAVOR_KEYWORDS[cat]);

  const suffixes = ['变奏', '特调', '协奏曲', '迷雾', '暗涌', '狂想', '回响', '序曲'];
  const suffix = pickRandom(suffixes);

  return title + flavorWord + suffix;
}

// ==================== 对外 API（保持兼容） ====================

export function calculateMBTI(scores) {
  return [
    (scores.E||0) >= (scores.I||0) ? 'E' : 'I',
    (scores.S||0) >= (scores.N||0) ? 'S' : 'N',
    (scores.T||0) >= (scores.F||0) ? 'T' : 'F',
    (scores.J||0) >= (scores.P||0) ? 'J' : 'P'
  ].join('');
}

export function calculateScoresFromAnswers(answers) {
  const scores = { E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0 };
  answers.forEach(a => { if (a.value && scores.hasOwnProperty(a.value)) scores[a.value]++; });
  return scores;
}

export function getRecommendations(mbtiType, options = {}) {
  const intensities = options.intensities || null;
  const scored = COCKTAILS.map(cocktail => {
    const algorithmScore = calculateMatchScore(cocktail, mbtiType, intensities);
    const exactMatch = cocktail.mbtiMatch && cocktail.mbtiMatch.includes(mbtiType);
    return { ...cocktail, _score: Math.round(algorithmScore * (exactMatch ? 1.2 : 1.0)), _exact: exactMatch };
  });

  const valid = scored.filter(c => c._score > 0).sort((a,b) => b._score - a._score);
  const top = valid.slice(0, 5);

  return top.map(({ _score, _exact, ...c }) => c);
}

export function getProfile(mbtiType) { return MBTI_PROFILES[mbtiType] || null; }
export function getQuestions() { return MBTI_QUESTIONS; }
export function getAllMBTITypes() { return Object.keys(MBTI_PROFILES); }

export function getCocktailsByMethod() {
  const g = {};
  COCKTAILS.forEach(c => { const m = c.method||'build'; if (!g[m]) g[m]=[]; g[m].push(c); });
  return g;
}

export function getAllMethods() {
  return Object.entries(METHODS).map(([method, info]) => ({ method, label: `${info.emoji} ${info.label}` }));
}

export default {
  calculateMBTI, calculateScoresFromAnswers, calculateMatchScore,
  getRecommendations, generateCocktail,
  getProfile, getQuestions, getAllMBTITypes,
  getCocktailsByMethod, getAllMethods
};
