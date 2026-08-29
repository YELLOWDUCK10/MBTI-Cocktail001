/**
 * build.js - 单文件打包脚本（零第三方依赖）
 *
 * 将 src/ 模块化源码打包为 dist/index.html 单文件：
 * - CSS 内联为 <style>
 * - JS 按依赖序拼接内联为 <script>，剥离 ES import/export
 * - 产物双击即开，完全离线，规避 file:// 协议的 ES 模块跨域限制
 *
 * 用法：node build.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

// JS 拼接顺序（被依赖者在前）
const JS_ORDER = [
  'flavor-library.js',
  'cocktails.js',
  'mbti-profiles.js',
  'engine.js',
  'app.js'
];

// default 导出的重命名映射：`export default X` → `const NAME = X`
// NAME 与下游 import 的绑定名一致
const DEFAULT_EXPORT_NAMES = {
  'cocktails.js': 'COCKTAILS',
  'engine.js': 'engine'
};

function transformJs(fileName, code) {
  let out = code;

  // 1. 剥离 import 语句（兼容单行与多行花括号形式）
  out = out.replace(/^import\s+[\w$\s{},*]*\s*from\s*['"][^'"]*['"];?[ \t]*$/gm, '');

  // 2. default 导出
  const rename = DEFAULT_EXPORT_NAMES[fileName];
  if (rename) {
    out = out.replace(/export\s+default\s*/, `const ${rename} = `);
  } else {
    // `export default NAME;` 形式的别名再导出：直接删除
    out = out.replace(/^export\s+default\s+[\w$]+\s*;[ \t]*$/gm, '');
    // 兜底：剥离残留的 default 导出关键字
    out = out.replace(/^export\s+default\s*/gm, '');
  }

  // 3. 命名导出 → 普通声明
  out = out.replace(/^export\s+(const|let|var|function|class)\b/gm, '$1');

  return out;
}

// ==================== 酒款数据库 schema 校验（v1.1 酒库扩充配套） ====================
const STRUCTURE_ENUM = ['highball', 'sour', 'martini', 'old-fashioned', 'fizz', 'collins', 'manhattan', 'margarita', 'tiki', 'cream'];
const BASE_SPIRIT_ENUM = ['gin', 'vodka', 'rum', 'whiskey', 'tequila'];
const METHOD_ENUM = ['shake', 'stir', 'build', 'muddle', 'dry-shake', 'blend'];
const CATEGORY_ENUM = ['classic', 'tropical', 'modern', 'spirit-forward', 'creamy'];
const MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const REQUIRED_FIELDS = ['id','name','nameEn','category','glass','structure','baseSpirit','strength','sweetness','abv','color','difficulty','rating','mbtiMatch','description','story','method','methodLabel','ingredients','garnish','flavorNotes','scene','tags'];

function inRange(v, min, max) { return Number.isFinite(v) && v >= min && v <= max; }

function validateCocktails() {
  // cocktails.js 无 import，转换后可直接执行取到 COCKTAILS 数组
  const code = transformJs('cocktails.js', fs.readFileSync(path.join(SRC, 'cocktails.js'), 'utf8'));
  const cocktails = new Function(code + '\nreturn COCKTAILS;')();
  const errors = [];
  const ids = new Set();

  for (const c of cocktails) {
    const tag = c.id || '(无id)';
    for (const f of REQUIRED_FIELDS) {
      if (c[f] === undefined || c[f] === null || c[f] === '') errors.push(`[${tag}] 缺少字段 ${f}`);
    }
    if (!c.id) continue;
    if (ids.has(c.id)) errors.push(`[${c.id}] id 重复`);
    ids.add(c.id);

    for (const [f, allowed] of Object.entries({ structure: STRUCTURE_ENUM, baseSpirit: BASE_SPIRIT_ENUM, method: METHOD_ENUM, category: CATEGORY_ENUM })) {
      if (c[f] !== undefined && !allowed.includes(c[f])) errors.push(`[${c.id}] ${f} 非法值 "${c[f]}"（允许：${allowed.join('/')}）`);
    }
    if (!inRange(c.strength, 1, 5)) errors.push(`[${c.id}] strength 超出 1-5`);
    if (!inRange(c.sweetness, 1, 5)) errors.push(`[${c.id}] sweetness 超出 1-5`);
    if (!inRange(c.difficulty, 1, 3)) errors.push(`[${c.id}] difficulty 超出 1-3`);
    if (!inRange(c.rating, 1, 5)) errors.push(`[${c.id}] rating 超出 1-5`);
    if (!Number.isFinite(c.abv) || c.abv < 0) errors.push(`[${c.id}] abv 非法`);
    if (Array.isArray(c.mbtiMatch)) {
      for (const t of c.mbtiMatch) {
        if (!MBTI_TYPES.includes(t)) errors.push(`[${c.id}] mbtiMatch 含非法类型 "${t}"`);
      }
    }
    if (!Array.isArray(c.ingredients) || c.ingredients.length === 0) {
      errors.push(`[${c.id}] ingredients 为空`);
    } else {
      c.ingredients.forEach((ing, i) => {
        for (const f of ['name', 'amount', 'unit', 'category']) {
          if (ing[f] === undefined) errors.push(`[${c.id}] ingredients[${i}] 缺少 ${f}`);
        }
      });
    }
    for (const f of ['mbtiMatch', 'flavorNotes', 'scene', 'tags']) {
      if (!Array.isArray(c[f])) errors.push(`[${c.id}] ${f} 应为数组`);
    }
  }

  if (cocktails.length !== 50) errors.push(`酒款总数 ${cocktails.length} ≠ 50`);
  if (errors.length) throw new Error('酒款数据库校验失败：\n  - ' + errors.join('\n  - '));
  console.log(`✔ 数据校验通过: ${cocktails.length} 款酒`);
}

function build() {
  const t0 = Date.now();
  validateCocktails();

  // 读取 HTML 骨架
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

  // 内联 CSS（用函数替换，避免内容中的 $ 序列被误解释）
  const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
  html = html.replace(/<link[^>]*href="style\.css"[^>]*>/,
    () => `<style>\n${css}\n</style>`);

  // 移除开发态模块入口
  html = html.replace(/[ \t]*<script[^>]*src="app\.js"[^>]*><\/script>\r?\n?/, '');

  // 拼接 JS
  const js = JS_ORDER.map(f => {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    return `// ==================== ${f} ====================\n${transformJs(f, code)}`;
  }).join('\n');

  // 注入内联脚本
  html = html.replace('</body>',
    () => `<script>\n${js}\n</script>\n</body>`);

  // 校验：产物中不应再出现 ES 模块语法
  if (/^\s*import[\s ]/m.test(js) || /\bexport\s+(default|const|function)\b/.test(js)) {
    throw new Error('打包失败：残留 import/export 语句，请检查 transform 规则');
  }

  // 写出产物
  fs.mkdirSync(DIST, { recursive: true });
  const outPath = path.join(DIST, 'index.html');
  fs.writeFileSync(outPath, html);

  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`✔ 构建完成: dist/index.html (${sizeKB} KB, ${Date.now() - t0}ms)`);
  if (fs.statSync(outPath).size > 300 * 1024) {
    console.warn('⚠ 超出 PRD 体积预算 300KB');
  }
}

build();
