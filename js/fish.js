// 魚種データ（本州太平洋側の一般的な目安。地域・年により前後します）
// peak: 最盛期の月, good: 釣れる月, temp: 適水温[℃]

export const SPOT_TYPES = {
  pier:    { label: '堤防・漁港', sea: true },
  rock:    { label: '磯', sea: true },
  beach:   { label: '砂浜（サーフ）', sea: true },
  estuary: { label: '河口・汽水域', sea: true },
  boat:    { label: '船・ボート', sea: true },
  river:   { label: '川（中・下流）', sea: false },
  stream:  { label: '渓流', sea: false },
  lake:    { label: '湖・池・管理釣り場', sea: false },
};

// 月の範囲（年をまたぐ指定も可: R(11, 3) → 11,12,1,2,3）
const R = (a, b) => { const o = []; let m = a; for (;;) { o.push(m); if (m === b) return o; m = m % 12 + 1; } };

export const FISH = [
  { id: 'aji', name: 'アジ', icon: '🐟', spots: ['pier', 'boat'], peak: R(6, 10), good: R(4, 12), temp: [15, 26], time: ['mazume', 'night'],
    methods: ['サビキ釣り', 'アジング', 'ウキ釣り'], tide: '潮が動く時間帯。常夜灯周りは夜の上げ潮が◎', tip: '群れが回ってくると連発。コマセを切らさず足元に寄せる。', level: 1 },
  { id: 'saba', name: 'サバ', icon: '🐟', spots: ['pier', 'boat'], peak: R(7, 10), good: R(5, 11), temp: [14, 26], time: ['mazume'],
    methods: ['サビキ釣り', 'ジグサビキ', 'ライトショアジギング'], tide: '潮通しのよい堤防先端・上げ潮', tip: '回遊次第。朝マズメに勝負が決まることが多い。', level: 1 },
  { id: 'iwashi', name: 'イワシ', icon: '🐟', spots: ['pier'], peak: R(6, 9), good: R(5, 11), temp: [14, 25], time: ['mazume', 'day'],
    methods: ['サビキ釣り'], tide: '潮が動き始めのタイミング', tip: '小さめのサビキ針（3〜4号）が有効。ファミリー向け。', level: 1 },
  { id: 'mebaru', name: 'メバル', icon: '🐠', spots: ['pier', 'rock'], peak: R(2, 4), good: R(11, 5), temp: [10, 18], time: ['night', 'mazume'],
    methods: ['メバリング', 'ウキ釣り（エビ）'], tide: '満潮前後・潮が緩む時間。風のない夜が◎', tip: '「凪を釣れ」と言われる魚。常夜灯の明暗部を表層から探る。', level: 2 },
  { id: 'kasago', name: 'カサゴ', icon: '🐠', spots: ['pier', 'rock'], peak: R(11, 3), good: R(1, 12), temp: [10, 24], time: ['night', 'day'],
    methods: ['穴釣り', 'ブラクリ', 'ロックフィッシュゲーム'], tide: '潮位は問わない。干潮時は穴が狙いやすい', tip: 'テトラや岩の隙間に落とし込む。根掛かりに注意し予備の仕掛けを。', level: 1 },
  { id: 'seabass', name: 'シーバス（スズキ）', icon: '🐟', spots: ['estuary', 'pier', 'beach', 'river'], peak: R(9, 12), good: R(3, 12), temp: [12, 26], time: ['night', 'mazume'],
    methods: ['ルアー（ミノー・バイブレーション）', 'ウキ釣り（生き餌）'], tide: '下げ潮で流れが効く時間。河口は下げ3〜7分が王道', tip: '明暗部・流れのヨレ・ベイトの有無を探す。秋の落ちアユ・コノシロパターンは大型の好機。', level: 3 },
  { id: 'kurodai', name: 'クロダイ（チヌ）', icon: '🐟', spots: ['pier', 'estuary', 'rock'], peak: R(4, 6), good: R(3, 12), temp: [13, 27], time: ['mazume', 'day', 'night'],
    methods: ['ヘチ釣り・落とし込み', 'ウキフカセ', 'チニング'], tide: '上げ潮で浅場に入ってくる。満潮前後が◎', tip: '警戒心が強い。濁りが入った日はチャンス。', level: 3 },
  { id: 'mejina', name: 'メジナ（グレ）', icon: '🐟', spots: ['rock', 'pier'], peak: R(12, 2), good: R(10, 5), temp: [13, 22], time: ['day', 'mazume'],
    methods: ['ウキフカセ釣り'], tide: 'サラシと潮目ができる時間。潮が動いている時', tip: 'コマセと刺し餌を同調させるのがコツ。寒グレは良型が狙える。', level: 3 },
  { id: 'aori', name: 'アオリイカ', icon: '🦑', spots: ['pier', 'rock', 'boat'], peak: [4, 5, 9, 10], good: R(3, 11), temp: [16, 26], time: ['mazume', 'night'],
    methods: ['エギング', 'ヤエン釣り'], tide: '潮が動き出すタイミング。満潮前後の潮止まり前', tip: '春は大型の親イカ、秋は数釣りの新子。藻場周りが好ポイント。', level: 2 },
  { id: 'kisu', name: 'シロギス', icon: '🐟', spots: ['beach', 'boat'], peak: R(6, 8), good: R(5, 10), temp: [16, 27], time: ['day'],
    methods: ['ちょい投げ', '投げ釣り'], tide: '上げ潮。波打ち際のカケアガリを狙う', tip: '仕掛けをゆっくりサビいて魚の居場所を探す。日中でも釣れる。', level: 1 },
  { id: 'haze', name: 'ハゼ', icon: '🐟', spots: ['estuary', 'river', 'pier'], peak: R(8, 10), good: R(7, 12), temp: [15, 28], time: ['day'],
    methods: ['ちょい投げ', 'ミャク釣り', 'ウキ釣り'], tide: '上げ潮で浅場に寄る。満潮前後が◎', tip: '初心者・子ども向けの定番。青イソメを小さく付けて。', level: 1 },
  { id: 'karei', name: 'カレイ', icon: '🐟', spots: ['beach', 'pier', 'boat'], peak: R(11, 1), good: R(10, 4), temp: [8, 18], time: ['day', 'mazume'],
    methods: ['投げ釣り（置き竿）'], tide: '潮が動いている時間。潮止まりは反応が落ちる', tip: '複数の竿で置き竿にして待つ。冬の「肩掛け」は大型も。', level: 2 },
  { id: 'hirame', name: 'ヒラメ', icon: '🐟', spots: ['beach', 'boat', 'pier'], peak: R(10, 2), good: R(9, 5), temp: [12, 22], time: ['mazume'],
    methods: ['ルアー（ミノー・ジグヘッド・メタルジグ）', '泳がせ釣り'], tide: '朝マズメ×潮の動き始め。離岸流周りが◎', tip: 'ベイト（イワシ等）が接岸していれば好機。サーフでは足を使って探る。', level: 3 },
  { id: 'tachiuo', name: 'タチウオ', icon: '🐟', spots: ['pier', 'boat'], peak: R(9, 11), good: R(8, 12), temp: [15, 25], time: ['mazume', 'night'],
    methods: ['ウキ釣り（キビナゴ）', 'ワインド', 'テンヤ'], tide: '夕マズメ以降、潮が動く時間', tip: '歯が鋭いのでワイヤーリーダー必須。日没後の短時間勝負が多い。', level: 2 },
  { id: 'aomono', name: '青物（イナダ・ワカシ・サゴシ）', icon: '🐟', spots: ['pier', 'rock', 'beach', 'boat'], peak: R(9, 11), good: R(6, 12), temp: [15, 25], time: ['mazume'],
    methods: ['ショアジギング', 'カゴ釣り', '泳がせ釣り'], tide: '潮通しのよい場所・潮が速い時間', tip: '朝マズメ一発勝負。ナブラ（水面の騒ぎ）を見逃さない。', level: 3 },
  { id: 'kawahagi', name: 'カワハギ', icon: '🐠', spots: ['pier', 'boat', 'rock'], peak: R(9, 11), good: R(7, 12), temp: [15, 25], time: ['day'],
    methods: ['胴突き仕掛け（アサリ）'], tide: '潮が適度に動く時間', tip: 'エサ取り名人。小さなアタリを掛ける釣り。肝パンの秋〜初冬が美味。', level: 2 },
  { id: 'madai', name: 'マダイ', icon: '🐟', spots: ['boat', 'rock'], peak: [4, 5, 10, 11], good: R(3, 12), temp: [14, 25], time: ['mazume', 'day'],
    methods: ['タイラバ', 'ひとつテンヤ', 'コマセ釣り'], tide: '潮が動く大潮〜中潮が◎', tip: '春の乗っ込み、秋の荒食いがチャンス。船釣りが主流。', level: 3 },
  { id: 'ainame', name: 'アイナメ', icon: '🐠', spots: ['pier', 'rock'], peak: R(11, 2), good: R(10, 4), temp: [8, 18], time: ['day', 'mazume'],
    methods: ['ブラクリ', 'ロックフィッシュゲーム', '投げ釣り'], tide: '上げ潮で活性が上がる', tip: '寒い時期の根魚。岸壁際やテトラの際を丁寧に。', level: 2 },
  { id: 'sayori', name: 'サヨリ', icon: '🐟', spots: ['pier'], peak: R(9, 11), good: R(3, 12), temp: [12, 24], time: ['day'],
    methods: ['ウキ釣り（連玉ウキ）'], tide: '潮が動き出すとき。コマセで表層に寄せる', tip: '水面近くを泳ぐ。細身の仕掛けで。', level: 2 },
  { id: 'nijimasu', name: 'ニジマス', icon: '🐟', spots: ['lake', 'stream'], peak: R(11, 3), good: R(10, 5), temp: [8, 18], time: ['mazume', 'day'],
    methods: ['ルアー（スプーン）', 'フライ', 'エサ釣り（イクラ・ブドウ虫）'], tide: '潮の影響なし。放流直後や曇天が◎', tip: '管理釣り場なら冬でも手軽。レンジ（深さ）を探るのがコツ。', level: 1 },
  { id: 'yamame', name: 'ヤマメ・アマゴ', icon: '🐟', spots: ['stream'], peak: [4, 5, 6], good: R(3, 9), temp: [8, 18], time: ['mazume', 'day'],
    methods: ['渓流エサ釣り', 'ルアー（ミノー・スピナー）', 'テンカラ'], tide: '潮の影響なし。雨後の適度な増水・濁りが◎', tip: '解禁期間・遊漁券を必ず確認。足音と影に注意して上流へ。', level: 3 },
  { id: 'bass', name: 'ブラックバス', icon: '🐟', spots: ['lake', 'river'], peak: [5, 6, 9, 10], good: R(3, 11), temp: [12, 28], time: ['mazume', 'day'],
    methods: ['ルアー（ワーム・クランク・トップ）'], tide: '潮の影響なし。気圧低下・曇天・風が当たる岸が◎', tip: '季節ごとの居場所（スポーニング・ウィード・ディープ）を意識。', level: 2 },
  { id: 'wakasagi', name: 'ワカサギ', icon: '🐟', spots: ['lake'], peak: R(12, 2), good: R(10, 3), temp: [2, 14], time: ['day', 'mazume'],
    methods: ['ワカサギ仕掛け（ドーム船・氷上・ボート）'], tide: '潮の影響なし。朝の時合いが◎', tip: '群れの層を魚探や誘いで探す。釣り場の解禁情報を確認。', level: 1 },
  { id: 'ayu', name: 'アユ', icon: '🐟', spots: ['river', 'stream'], peak: [7, 8], good: R(6, 10), temp: [15, 25], time: ['day'],
    methods: ['友釣り', 'ドブ釣り', 'アユルアー'], tide: '潮の影響なし。日中、水温が上がってから', tip: '漁協の解禁日と遊漁券を確認。', level: 3 },
];

const TIME_LABEL = { mazume: 'マズメ', night: '夜', day: '日中' };
export const timeLabel = (t) => TIME_LABEL[t] ?? t;

/** 季節(月)・釣り場タイプ・水温からおすすめ魚種をスコア順に返す */
export function recommendFish({ month, spotType, waterTemp }) {
  const list = [];
  for (const f of FISH) {
    if (spotType && !f.spots.includes(spotType)) continue;
    let score = 0;
    const reasons = [];
    if (f.peak.includes(month)) { score += 60; reasons.push(`${month}月は最盛期`); }
    else if (f.good.includes(month)) { score += 35; reasons.push(`${month}月はシーズン中`); }
    else continue;
    if (spotType && f.spots[0] === spotType) { score += 10; reasons.push(`${SPOT_TYPES[spotType].label}の代表魚`); }
    if (waterTemp != null) {
      const [lo, hi] = f.temp;
      if (waterTemp >= lo && waterTemp <= hi) { score += 20; reasons.push(`水温${waterTemp.toFixed(1)}℃は適水温`); }
      else { score -= 15; reasons.push(`水温${waterTemp.toFixed(1)}℃は適水温(${lo}〜${hi}℃)外`); }
    }
    score += (4 - f.level) * 2;
    list.push({ fish: f, score, reasons });
  }
  return list.sort((a, b) => b.score - a.score);
}

/** 釣り場タイプ別・ポイントの狙い方 */
export const POINT_GUIDE = {
  pier: [
    '堤防の先端・角：潮通しがよく回遊魚（アジ・サバ・青物）が回りやすい。',
    '足元・岸壁際：カサゴ・メバル・クロダイが壁際に付く。落とし込みで探る。',
    'テトラ帯・捨て石周り：根魚の住み家。穴釣り向き（足場に注意）。',
    '常夜灯の明暗部：夜はプランクトン→小魚→フィッシュイーターが集まる。',
    '船道（ミオ筋）：周りより深く、魚の通り道になりやすい。',
  ],
  rock: [
    'サラシ（白泡）の切れ目：メジナ・クロダイ・ヒラスズキの好ポイント。',
    '潮目・潮のヨレ：エサが集まり魚が付く。',
    '海藻帯・沈み根：アオリイカや根魚の付き場。',
    '⚠ 波・うねりの予報を必ず確認。ライフジャケット・スパイクシューズ必須。',
  ],
  beach: [
    '離岸流（波が崩れにくく沖へ流れる筋）：ヒラメ・マゴチの好ポイント。',
    'カケアガリ（急に深くなる場所）：キス・カレイが付きやすい。',
    '河口や流れ込み周辺：ベイトが集まりやすい。',
    '波打ち際から沖まで扇状に投げ分けて魚の居場所を探す。',
  ],
  estuary: [
    '流れのヨレ・反転流：シーバスがベイトを待ち伏せる。',
    '橋脚の明暗部：夜のシーバスの定番ポイント。',
    '下げ潮で流れが強まるタイミングが最大のチャンス。',
    '干潮時は干潟や地形（ミオ筋）を下見しておくと満潮時に役立つ。',
  ],
  boat: [
    '船長・ボート屋の指示（タナ・オモリ号数）に従うのが釣果の近道。',
    '潮が速すぎる/遅すぎる時は仕掛けの重さで調整。',
    '⚠ 風速・波高予報で出船可否を事前確認。',
  ],
  river: [
    '瀬と淵の境目、流れ込み・合流点：魚が溜まりやすい。',
    '堰下・テトラ周り：遡上魚やシーバス、ナマズの付き場。',
    '⚠ 上流の雨による急な増水に注意。',
  ],
  stream: [
    '落ち込み直下・巻き返し・岩陰：渓魚の定位ポイント。',
    '下流から上流へ釣り上がる（魚は上流を向いている）。',
    '⚠ 遊漁券・禁漁期間を確認。単独入渓・増水時は避ける。',
  ],
  lake: [
    '風が当たる岸（風下）：エサが寄せられ魚の活性が上がりやすい。',
    'インレット（流れ込み）・ウィード・立木などの変化を探す。',
    '管理釣り場は放流直後や、魚がいる層（レンジ）を見つけるのがコツ。',
  ],
};
