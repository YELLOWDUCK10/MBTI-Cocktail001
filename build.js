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

function build() {
  const t0 = Date.now();

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
