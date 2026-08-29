/**
 * engine.js - MBTI 推荐引擎 v2.0
 *
 * 升级：
 * 1. 连续值维度强度驱动评分（替代二分匹配）
 * 2. AI 鸡尾酒生成模块
 */
import COCKTAILS from './cocktails.js';
import { MBTI_PROFILES } from './mbti-profiles.js';
import {
  BASE_SPIRITS, ACIDIFIERS, SWEETENERS, MODIFIERS,
  MIXERS, BITTERS_SPICES, GARNISHES, FLAVOR_KEYWORDS,
  FLAVOR_CONFLICTS, MYTH_SUFFIXES, METHODS, GLASSES, inferColor
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
  'cream': { required: ['base','modifier'], optional: ['sweetener'], method: 'dry-shake', glass: 'rocks' }
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

/** 中性强度（未提供维度强度时使用） */
const NEUTRAL_INTENSITIES = { E: 50, I: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 };

/**
 * 计算单款鸡尾酒与 MBTI 类型 + 维度强度的匹配分数
 * @param {Object} cocktail
 * @param {string} mbtiType - "INTJ"
 * @param {Object} intensities - { E:70, I:30, S:60, N:40, ... } 每个维度的百分比强度
 * @returns {number} 0-100
 */
export function calculateMatchScore(cocktail, mbtiType, intensities = null) {
  const dims = parseType(mbtiType);
  if (!intensities) intensities = NEUTRAL_INTENSITIES;

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

// ==================== 风味冲突检测 ====================

/** 判断风味集合与已用风味是否存在冲突对（双向检查） */
function hasFlavorConflict(flavors, usedFlavors) {
  return FLAVOR_CONFLICTS.some(([a, b]) => {
    const newA = flavors.some(f => f.includes(a) || a.includes(f));
    const newB = flavors.some(f => f.includes(b) || b.includes(f));
    const usedA = usedFlavors.some(uf => uf.includes(a) || a.includes(uf));
    const usedB = usedFlavors.some(uf => uf.includes(b) || b.includes(uf));
    return (newA && usedB) || (newB && usedA);
  });
}

/**
 * 从池中挑选一个无冲突配料
 * @param {Array} pool - 候选池
 * @param {string[]} usedFlavors - 已用风味
 * @param {boolean} fallback - 全部冲突时是否退回随机款（必选配料用）
 * @returns {Object|null} 无冲突返回配料；全冲突且 fallback=false 时返回 null（放弃该配料）
 */
function pickNoConflict(pool, usedFlavors, fallback = false) {
  for (let i = 0; i < 5; i++) {
    const item = pickRandom(pool);
    if (!hasFlavorConflict(item.flavors, usedFlavors)) return item;
  }
  return fallback ? pickRandom(pool) : null;
}

// ==================== AI 鸡尾酒生成 ====================

/**
 * 生成一款符合 MBTI 偏好的 AI 鸡尾酒
 * @param {string} mbtiType
 * @param {Object} intensities - 维度强度
 * @param {string[]} history - 已生成的名称列表（去重用）
 * @returns {Object} 完整的鸡尾酒对象
 */
export function generateCocktail(mbtiType, intensities, history = [], options = {}) {
  const mythMode = options.mythMode !== false; // v1.1 神话命名开关，默认开
  const dims = parseType(mbtiType);
  let attempts = 0;

  while (attempts < 20) {
    attempts++;
    const cocktail = tryGenerate(dims, intensities, mbtiType, mythMode);
    if (!history.includes(cocktail.id) && !history.includes(cocktail.name)) {
      return cocktail;
    }
  }
  // 如果20次都重复（极小概率），强制加后缀
  const c = tryGenerate(dims, intensities, mbtiType, mythMode);
  c.id += '-' + Date.now();
  c.name += ' ' + (history.length + 1);
  return c;
}

// ==================== 合体特调生成（v1.1 碰杯模式） ====================

/**
 * 双人合体 AI 特调：两组人格维度混合后复用现有生成管线（PRD 7.2 碰杯模式）
 * 混合策略：逐维取平均；合体类型逐对取占比高侧（平局随机），仅用于结构/基酒偏好加权
 * @param {string} typeA - 人格 A 类型（4 字母）
 * @param {Object} intA - 人格 A 维度强度
 * @param {string} typeB - 人格 B 类型
 * @param {Object} intB - 人格 B 维度强度
 * @param {string[]} history - 已生成名称列表（去重用）
 * @param {Object} options - { mythMode }
 * @returns {Object} 合体鸡尾酒对象（_isDuo + _duoInfo 标记）
 */
export function generateDuoCocktail(typeA, intA, typeB, intB, history = [], options = {}) {
  const mythMode = options.mythMode !== false;

  // 1. 维度混合：逐维取平均
  const mixed = {};
  for (const d of ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']) {
    mixed[d] = Math.round(((intA[d] ?? 50) + (intB[d] ?? 50)) / 2);
  }

  // 2. 合体类型：逐对维度取占比高侧，平局随机（符合 AI 特调"独一无二"）
  const duoDims = [['E','I'], ['S','N'], ['T','F'], ['J','P']].map(([a, b]) => {
    if (mixed[a] > mixed[b]) return a;
    if (mixed[b] > mixed[a]) return b;
    return Math.random() < 0.5 ? a : b;
  });
  const duoType = duoDims.join('');

  const profileA = MBTI_PROFILES[typeA];
  const profileB = MBTI_PROFILES[typeB];
  const mythA = profileA?.myth || typeA;
  const mythB = profileB?.myth || typeB;
  const titleA = profileA?.title || typeA;
  const titleB = profileB?.title || typeB;

  // 3. 命名：体现两人格张力（神话开 → 双原型并列；关 → 双昵称并列）
  const pickFlavorWord = () => pickRandom(FLAVOR_KEYWORDS[pickRandom(Object.keys(FLAVOR_KEYWORDS))]);
  const duoName = () => mythMode
    ? (Math.random() < 0.6
        ? `${mythA} × ${mythB}${pickRandom(MYTH_SUFFIXES)}`
        : `${mythA}与${mythB}的${pickFlavorWord()}`)
    : `${titleA} × ${titleB}${pickRandom(['协奏曲', '变奏', '狂想', '回响', '序曲'])}`;

  // 4. 完全复用单人装配管线（结构/基酒/配料/冲突检测），去重照常
  let cocktail = null;
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    cocktail = tryGenerate(duoDims, mixed, duoType, mythMode);
    cocktail.name = duoName();
    if (!history.includes(cocktail.id) && !history.includes(cocktail.name)) break;
  }
  if (history.includes(cocktail.name) || history.includes(cocktail.id)) {
    cocktail.id += '-duo-' + Date.now();
    cocktail.name += ' ·碰杯 ' + (history.length + 1);
  }

  // 5. 覆写叙事层：双人叙事 + 双类型匹配
  cocktail.nameEn = 'AI Duo: ' + cocktail.structure.charAt(0).toUpperCase() + cocktail.structure.slice(1);
  cocktail.mbtiMatch = [typeA, typeB];
  cocktail.description = `由 ${typeA}（${titleA}）与 ${typeB}（${titleB}）的人格张力共同调就，${cocktail.structure} 结构在两种气质之间寻找平衡。`;
  cocktail.story = `这是一杯为 ${mythA}与${mythB} 碰杯而生的合体特调——两组人格维度混合后由风味引擎即兴演绎，每一次碰杯都是独一无二的配方。`;
  cocktail.tags = [...new Set([...(cocktail.tags || []), '合体特调'])];
  cocktail._isDuo = true;
  cocktail._duoInfo = { typeA, typeB };
  return cocktail;
}

function tryGenerate(dims, intensities, mbtiType, mythMode = true) {
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

  // 酸（强制冲突重抽，池内替代品充足）
  if (template.required.includes('acid') || (template.optional && template.optional.includes('acid') && Math.random() > 0.4)) {
    const acid = pickNoConflict(ACIDIFIERS, usedFlavors, true);
    if (acid) {
      ingredients.push({ name: acid.name, amount: acid.amount, unit: acid.unit, category: 'acid' });
      usedFlavors.push(...acid.flavors);
    }
  }

  // 甜（强制冲突重抽，池内替代品充足）
  if (template.required.includes('sweetener') || (template.optional && template.optional.includes('sweetener') && Math.random() > 0.5)) {
    const sweet = pickNoConflict(SWEETENERS, usedFlavors, true);
    if (sweet) {
      ingredients.push({ name: sweet.name, amount: sweet.amount, unit: sweet.unit, category: 'sweetener' });
      usedFlavors.push(...sweet.flavors);
    }
  }

  // 风味剂（强制冲突重抽，最多试 5 个，仍冲突则放弃该配料）
  if (template.required.includes('modifier') || (template.optional && template.optional.includes('modifier') && Math.random() > 0.4)) {
    const mod = template.required.includes('modifier')
      ? pickNoConflict(MODIFIERS, usedFlavors, true)
      : pickNoConflict(MODIFIERS, usedFlavors, false);
    if (mod) {
      ingredients.push({ name: mod.name, amount: mod.amount, unit: mod.unit, category: 'modifier' });
      usedFlavors.push(...mod.flavors);
    }
  }

  // 苦精（必选配料，全冲突时退回随机款保证结构完整）
  if (template.required.includes('bitters')) {
    const bitter = pickNoConflict(BITTERS_SPICES, usedFlavors, true);
    ingredients.push({ name: bitter.name, amount: bitter.amount, unit: bitter.unit, category: 'modifier' });
    usedFlavors.push(...bitter.flavors);
  }

  // 碳酸/混合剂
  if (template.required.includes('mixer') || (template.optional && template.optional.includes('mixer') && Math.random() > 0.5)) {
    const mixer = template.required.includes('mixer')
      ? pickNoConflict(MIXERS, usedFlavors, true)
      : pickNoConflict(MIXERS, usedFlavors, false);
    if (mixer) {
      ingredients.push({ name: mixer.name, amount: mixer.amount, unit: mixer.unit, category: 'mixer' });
      usedFlavors.push(...mixer.flavors);
    }
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
  const name = generateName(mbtiType, flavorNotes, structure, mythMode);

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
/**
 * 生成酒款名称
 * @param {boolean} mythMode - v1.1 神话命名开关：仅影响命名层，不影响评分与配方（PRD 7.2 设计边界）
 *   双模式混搭：60% 神话式（哈迪斯之谋）+ 40% 混搭式（哈迪斯的暗涌）
 */
function generateName(mbtiType, flavorNotes, structure, mythMode = true) {
  const profile = MBTI_PROFILES[mbtiType];
  const title = profile?.title || mbtiType;

  // 随机选一个风味类别和关键词
  const categories = Object.keys(FLAVOR_KEYWORDS);
  const cat = pickRandom(categories);
  const flavorWord = pickRandom(FLAVOR_KEYWORDS[cat]);

  const suffixes = ['变奏', '特调', '协奏曲', '迷雾', '暗涌', '狂想', '回响', '序曲'];
  const suffix = pickRandom(suffixes);

  if (mythMode && profile?.myth) {
    return Math.random() < 0.6
      ? profile.myth + pickRandom(MYTH_SUFFIXES)
      : profile.myth + '的' + flavorWord;
  }
  return title + flavorWord + suffix;
}

// ==================== 对外 API ====================

// ==================== 味觉档案修正（v1.1 反向微调，PRD 7.2） ====================

/**
 * 根据用户味觉偏好向量计算单款酒的分数修正值（-5 ~ +5）
 * 偏好向量按属性聚合（越用越懂你）：{ baseSpirit:{gin:2}, structure:{sour:1}, flavor:{花香:3} }
 * 权重：基酒命中 ×1.5（|计数|封顶2）、结构命中 ×1.0（封顶2）、风味标签命中 ×0.5（命中数封顶2）
 * @param {Object} cocktail
 * @param {Object|null} taste - 偏好向量
 * @returns {number} -5 ~ +5 的整数修正值
 */
export function applyTasteAdjust(cocktail, taste) {
  if (!taste) return 0;
  let adjust = 0;

  const bs = taste.baseSpirit?.[cocktail.baseSpirit] || 0;
  if (bs) adjust += Math.sign(bs) * Math.min(Math.abs(bs), 2) * 1.5;

  const st = taste.structure?.[cocktail.structure] || 0;
  if (st) adjust += Math.sign(st) * Math.min(Math.abs(st), 2) * 1.0;

  const fl = taste.flavor || {};
  let flavorHits = 0;
  for (const f of (cocktail.flavorNotes || [])) {
    const v = fl[f] || 0;
    if (v) flavorHits += v > 0 ? 1 : -1;
  }
  adjust += Math.max(-2, Math.min(2, flavorHits)) * 0.5;

  return Math.round(Math.max(-5, Math.min(5, adjust)));
}

export function getRecommendations(mbtiType, options = {}) {
  const intensities = options.intensities || null;
  const taste = options.taste || null;   // v1.1 味觉档案
  const scored = COCKTAILS.map(cocktail => {
    const algorithmScore = calculateMatchScore(cocktail, mbtiType, intensities);
    const exactMatch = cocktail.mbtiMatch && cocktail.mbtiMatch.includes(mbtiType);
    const base = Math.min(99, Math.round(algorithmScore * (exactMatch ? 1.2 : 1.0)));
    const adjust = applyTasteAdjust(cocktail, taste);
    return {
      ...cocktail,
      _score: Math.max(0, Math.min(99, base + adjust)),
      _exact: exactMatch,
      _tasteAdjust: adjust
    };
  });

  // 全量已排序列表（分数降序，平分时 rating 高者在前），前端自行分页展示
  return scored
    .filter(c => c._score > 0)
    .sort((a, b) => (b._score - a._score) || ((b.rating || 0) - (a.rating || 0)));
}

export function getProfile(mbtiType) { return MBTI_PROFILES[mbtiType] || null; }
export function getAllMBTITypes() { return Object.keys(MBTI_PROFILES); }

export function getAllMethods() {
  return Object.entries(METHODS).map(([method, info]) => ({ method, label: `${info.emoji} ${info.label}` }));
}

export default {
  calculateMatchScore, getRecommendations, generateCocktail, generateDuoCocktail,
  applyTasteAdjust, getProfile, getAllMBTITypes, getAllMethods
};
