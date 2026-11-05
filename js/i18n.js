// 日本語 / 英語。ブラウザの言語で自動で選び、タイトル画面の切り替えで変えられる (localStorage の kokyo.lang に保存)
const saved = (() => { try { return JSON.parse(localStorage.getItem('kokyo.lang')); } catch (e) { return null; } })();
const fromUrl = (location.search.match(/[?&]lang=(ja|en)/) || [])[1];
export let LANG = fromUrl || saved || ((navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en');
export function setLang(l) {
  LANG = l;
  try { localStorage.setItem('kokyo.lang', JSON.stringify(l)); } catch (e) { /* 保存できなくても遊べる */ }
}

const D = {
  ja: {
    loading: '読み込んでいます…', loadCourse: 'コースを作っています…', loadCity: '街を組み立てています…',
    title: '皇居ランナー', sub: 'ロードバイクで皇居を一周（約6km）。<br>ランナーや歩行者、車やバイクをよけながら、二重橋前のゴールをめざせ！',
    stage: 'ステージ', start: 'スタート', howto: '遊び方', lang: '言語 / Language',
    credit: '建物: 国土交通省 PLATEAU ／ 標高・水面: 国土地理院 ／ 道路: © OpenStreetMap contributors ／ 街の3Dデータ: <a href="https://github.com/techgymjp/tarzan" target="_blank">ターザン大東京</a>',
    pause: '一時停止', resume: 'つづける', toTitle: 'タイトルへ', next: '次のステージへ', retry: 'もう一度', share: 'シェアする',
    brake: 'ブレーキ', dash: 'ダッシュ', stamina: '体力', passed: '抜いた人', behindCam: 'うしろ',
    tod_morning: '朝', tod_day: '昼', tod_dusk: '夕方', tod_night: '夜',
    locked: '🔒 前のステージをゴールすると開きます',
    best: 'ベスト（{s}）: {t}　スコア {n}', bestNone: 'ベスト（{s}）: まだ記録なし',
    go: '二重橋前 スタート！ 大手門へ', goal: '🏁 皇居一周 ゴール！', goalFlash: '🎆 ゴール！',
    resWhere: '{km} km 地点（{p}のあたり）',
    resStats: 'スコア <b>{score}</b><br>抜いた人 {passed} 人 ／ ヒヤリ {near} 回 ／ かすった {graze} 回 ／ 最高 時速{max}km',
    newBest: '🎉 ベストタイム更新！', bestShort: 'ベスト {t}', unlocked: '　🔓 次のステージ「{s}」が開きました！', allClear: '　🏆 全ステージ制覇！',
    shareOk: '#皇居ランナー でロードバイク皇居一周 {t}（{s}のステージ）{stars} スコア{score}',
    shareNg: '#皇居ランナー で{km}km 地点で{why}…（{s}のステージ）',
    graze: 'かすった！', slip: 'すり抜け +50', near: 'ヒヤリ！ +300', carBehind: '後ろから車！', motoBehind: '後ろからバイク！',
    noStamina: '体力ぎれ！ ダッシュを離して回復', chidori: '千鳥ヶ淵へ：狭い道は対向車、歩道は石畳。どっちを行く？',
    oniNear: '👹 鬼が近い！ ダッシュ！', event: '⚠ 桜田門外の変！ 井伊直弼の行列が横断中',
    hitOni: '鬼に捕まった！', hitHikyaku: '飛脚と衝突！', hitRunner: 'ランナーと衝突！', hitWalker: '歩行者と衝突！',
    hitCar: '車にはねられた！', hitCarBehind: '後ろから来た車にはねられた！', hitMoto: 'バイクと衝突！',
    hitProcession: '井伊直弼の行列に突っこんだ！', hitCarriage: '井伊直弼の馬車に突っこんだ！',
    next_: '次: {p} {m}m', goalNext: 'ゴール 二重橋前',
    zoneWalk: '歩道', zoneCobble: '歩道（石畳）', zoneRunner: 'ランナー車線', zoneOneway: '車線（後ろから車）⚠', zoneOncoming: '対向車線 ⚠',
    oniDist: '👹 鬼まで {m}m', up: '上り坂 {g}%', down: '下り坂 {g}%',
    howtoTitle: '遊び方', back: 'タイトルへ', privacy: 'プライバシーポリシー', getAndroid: 'Android アプリ（Google Play）', adSettings: '広告の設定',
    privacyUrl: 'https://techgym.jp/privacy-policy/',
    redoWatch: '▶ 広告を見て、続きから走る', redoNote: 'ぶつかる少し前から再開（残り {n} 回）', redoNext: '結果へ（{s}）', redoLoading: '広告を読み込んでいます…', redoFail: '広告を読み込めませんでした',
    redoCount: '　やり直し {n} 回', redoShare: '（やり直し {n} 回）',
  },
  en: {
    loading: 'Loading…', loadCourse: 'Building the course…', loadCity: 'Building the city…',
    title: 'Kokyo Runner', sub: 'Ride a road bike around the Imperial Palace in Tokyo (about 6 km).<br>Dodge runners, pedestrians, cars and motorbikes, and finish at Nijubashi-mae!',
    stage: 'Stage', start: 'Start', howto: 'How to play', lang: '言語 / Language',
    credit: 'Buildings: MLIT Project PLATEAU / Elevation & water: GSI Japan / Roads: © OpenStreetMap contributors / City data: <a href="https://github.com/techgymjp/tarzan" target="_blank">Tarzan Dai-Tokyo</a>',
    pause: 'Paused', resume: 'Resume', toTitle: 'Title', next: 'Next stage', retry: 'Retry', share: 'Share',
    brake: 'Brake', dash: 'Dash', stamina: 'Stamina', passed: 'Passed', behindCam: 'Behind',
    tod_morning: 'Morning', tod_day: 'Day', tod_dusk: 'Dusk', tod_night: 'Night',
    locked: '🔒 Finish the previous stage to unlock',
    best: 'Best ({s}): {t}  Score {n}', bestNone: 'Best ({s}): no record yet',
    go: 'Start at Nijubashi-mae! Head to Otemon', goal: '🏁 You rode around the Palace!', goalFlash: '🎆 Goal!',
    resWhere: '{km} km (near {p})',
    resStats: 'Score <b>{score}</b><br>Passed {passed} / Close calls {near} / Grazes {graze} / Top speed {max} km/h',
    newBest: '🎉 New best time!', bestShort: 'Best {t}', unlocked: '  🔓 Stage "{s}" unlocked!', allClear: '  🏆 All stages cleared!',
    shareOk: 'I rode around the Imperial Palace in {t} on #KokyoRunner ({s} stage) {stars} Score {score}',
    shareNg: 'On #KokyoRunner I got {km} km: {why} ({s} stage)',
    graze: 'Grazed!', slip: 'Squeeze +50', near: 'Close call! +300', carBehind: 'Car behind!', motoBehind: 'Motorbike behind!',
    noStamina: 'Out of stamina! Release Dash to recover', chidori: 'Chidorigafuchi: oncoming cars on the narrow road, cobbles on the sidewalk. Which way?',
    oniNear: '👹 The oni is close! Dash!', event: '⚠ Sakuradamon Incident! Ii Naosuke\'s procession is crossing',
    hitOni: 'Caught by the oni!', hitHikyaku: 'Hit a hikyaku messenger!', hitRunner: 'Hit a runner!', hitWalker: 'Hit a pedestrian!',
    hitCar: 'Hit by a car!', hitCarBehind: 'Hit by a car from behind!', hitMoto: 'Hit a motorbike!',
    hitProcession: 'Crashed into Ii Naosuke\'s procession!', hitCarriage: 'Crashed into Ii Naosuke\'s carriage!',
    next_: 'Next: {p} {m}m', goalNext: 'Goal: Nijubashi-mae',
    zoneWalk: 'Sidewalk', zoneCobble: 'Sidewalk (cobbles)', zoneRunner: 'Runner lane', zoneOneway: 'Car lane (cars behind) ⚠', zoneOncoming: 'Oncoming lane ⚠',
    oniDist: '👹 Oni {m}m behind', up: 'Uphill {g}%', down: 'Downhill {g}%',
    howtoTitle: 'How to play', back: 'Title', privacy: 'Privacy policy', getAndroid: 'Android app (Google Play)', adSettings: 'Ad settings',
    privacyUrl: 'https://techgym.jp/privacy-policy-en/',
    redoWatch: '▶ Watch an ad to keep riding', redoNote: 'Resume just before the crash ({n} left)', redoNext: 'Results ({s})', redoLoading: 'Loading ad…', redoFail: 'Could not load an ad',
    redoCount: '  Retries: {n}', redoShare: ' (retries: {n})',
  },
};
export function t(k, v = {}) {
  let s = (D[LANG] && D[LANG][k]) ?? D.ja[k] ?? k;
  for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(b);
  return s;
}

// 地名・名所
const NAMES = {
  '二重橋前': 'Nijubashi-mae', '和田倉門': 'Wadakura-mon', '大手門': 'Otemon Gate', '竹橋': 'Takebashi', '清水門': 'Shimizu-mon Gate',
  '九段下': 'Kudanshita', '田安門': 'Tayasu-mon Gate', '九段坂上': 'Top of Kudan-zaka', '千鳥ヶ淵': 'Chidorigafuchi', '千鳥ヶ淵交差点': 'Chidorigafuchi Crossing',
  '半蔵門': 'Hanzomon Gate', '国立劇場': 'National Theatre', '三宅坂': 'Miyakezaka', '桜田門': 'Sakuradamon Gate', '祝田橋': 'Iwaidabashi',
  '東京駅 丸の内駅舎': 'Tokyo Station Marunouchi Building', '和気清麻呂像': 'Statue of Wake no Kiyomaro', '平川門': 'Hirakawa-mon Gate',
  '日本武道館': 'Nippon Budokan', '国会議事堂': 'National Diet Building', 'テックジム東京本校': 'TECH GYM Tokyo', '二重橋': 'Nijubashi Bridge', '和田倉噴水公園': 'Wadakura Fountain Park',
};
export const nm = (n) => (LANG === 'en' && NAMES[n]) || n;

// data-i18n (textContent) と data-i18n-html (innerHTML) の文字を入れる
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = t(e.dataset.i18nHtml); });
  document.documentElement.lang = LANG;
}
