// Web ファイルを www/ にコピーする。GitHub Pages は npm run build、Android / iOS アプリは npm run build:app (Web 版だけの部分を取り除く)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of ['index.html', 'howto.html', 'css', 'js', 'vendor', 'ads-config.js', 'build-info.js']) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}
// Google Play 用のビルドでは本番の広告を使う
const mode = process.env.ADMOB_MODE === 'production' ? 'production' : 'test';
fs.writeFileSync(path.join(out, 'ads-config.js'), `// ビルド時に生成\nwindow.AD_MODE = '${mode}';\n`);
// タイトル画面に出すバージョン（CI では VERSION_NAME / VERSION_CODE を使う）
const version = process.env.VERSION_CODE
  ? `v${process.env.VERSION_NAME || require('../package.json').version} (build ${process.env.VERSION_CODE})`
  : 'dev';
fs.writeFileSync(path.join(out, 'build-info.js'), `// ビルド時に生成\nwindow.APP_VERSION = '${version}';\n`);
// アプリ用のビルド (APP_BUILD=1、npm run build:app): Web 版だけの部分を取り除く。
// App Store の審査 (Guideline 5.6) で「審査中に隠した機能」に見えないよう、他のストアへのリンクや
// 確認・撮影用の URL パラメータ (?debug ?tour ?nocrash) をアプリのバンドルに入れない。
//   HTML: <!-- web-only --> … <!-- /web-only -->
//   JS:   // web-only:start … // web-only:end (行ごと)。// app-only: <コード> の行はアプリ用のビルドでだけ有効になる
//   CSS:  /* web-only:start */ … /* web-only:end */
const app = process.env.APP_BUILD === '1';
if (app) {
  const files = [];
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const q = path.join(d, f); if (fs.statSync(q).isDirectory()) { if (f !== 'vendor') walk(q); } else if (/\.(html|js|css)$/.test(f)) files.push(q); } };
  walk(out);
  for (const f of files) {
    let s = fs.readFileSync(f, 'utf8');
    const before = s;
    s = s.replace(/[ \t]*<!-- web-only -->[\s\S]*?<!-- \/web-only -->[ \t]*\n?/g, '');
    s = s.replace(/^[ \t]*\/\/ web-only:start[\s\S]*?^[ \t]*\/\/ web-only:end[ \t]*\n/gm, '');
    s = s.replace(/^[ \t]*\/\* web-only:start \*\/[\s\S]*?^[ \t]*\/\* web-only:end \*\/[ \t]*\n/gm, '');
    s = s.replace(/^([ \t]*)\/\/ app-only: (.*)$/gm, '$1$2');
    if (s !== before) fs.writeFileSync(f, s);
  }
  // 取り残しがあればビルドを止める
  const bad = [/play\.google\.com/, /web-only/, /location\.search\.includes\('(debug|tour|nocrash)'\)/, /window\.dbg\b/];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    for (const re of bad) if (re.test(s)) { console.error(`アプリ用のビルドに Web 版だけの部分が残っています: ${path.relative(root, f)} (${re})`); process.exit(1); }
  }
}
console.log(`built web assets into www/ (ads: ${mode}, version: ${version}${app ? ', app build: web-only parts removed' : ''})`);
