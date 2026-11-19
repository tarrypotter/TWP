/* 세종월드교회 카페 — 공통 모듈
   고객앱(index.html) · 키오스크(kiosk.html) · 사장님(admin.html) 이 함께 씁니다. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  initializeFirestore, getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp, arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: "AIzaSyDOmpkiGbll7JB4u2ZTDM7-BDB_TB5SiX4",
  authDomain: "grace-cafe-twp.firebaseapp.com",
  projectId: "grace-cafe-twp",
  storageBucket: "grace-cafe-twp.firebasestorage.app",
  messagingSenderId: "855759093812",
  appId: "1:855759093812:web:7ea14b05b41679decfca61"
};

export const app = initializeApp(firebaseConfig);
export let db;
try {
  // 실시간 리스너가 오프라인 캐시에 묶여 늦게 뜨지 않도록 (지원되는 브라우저에서만)
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch (e) {
  db = getFirestore(app);
}

export { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp, arrayUnion };

/* ---------------- 브랜드 ---------------- */
export const BRAND = {
  name: '세종월드교회 카페',
  nameEn: 'SEJONG WORLD CAFE',
  mark: '☕'
};

/* ---------------- 메뉴 시드 (실제 메뉴판) ---------------- */
// youth = 청년처, college = 대학부
export const CATS = [
  { key: 'coffee',   name: 'COFFEE' },
  { key: 'beverage', name: 'BEVERAGE' },
  { key: 'ade',      name: 'ADE' },
  { key: 'handdrip', name: 'HAND DRIP' },
  { key: 'tea',      name: 'TEA' },
  { key: 'dessert',  name: 'DESSERT' }
];
export const CAT_NAME = Object.fromEntries(CATS.map(c => [c.key, c.name]));

export const SEED = [
  // COFFEE
  { id: 'coffee-americano',      cat: 'coffee',   name: '아메리카노',          youth: 3000, college: 2000, temp: 'both' },
  { id: 'coffee-latte',          cat: 'coffee',   name: '카페라떼',            youth: 3500, college: 3000, temp: 'both' },
  { id: 'coffee-vanilla-latte',  cat: 'coffee',   name: '바닐라빈라떼',        youth: 4000, college: 3500, temp: 'both' },
  { id: 'coffee-banana-latte',   cat: 'coffee',   name: '바나나 카페라떼',     youth: 4000, college: 3500, temp: 'both' },
  { id: 'coffee-black-cacao',    cat: 'coffee',   name: '블랙 카카오 카페라떼', youth: 4500, college: 4000, temp: 'both', tags: ['BEST'] },
  { id: 'coffee-oat-latte',      cat: 'coffee',   name: '꼬소한 오트라떼',     youth: 4500, college: 4000, temp: 'both' },
  { id: 'coffee-coldbrew',       cat: 'coffee',   name: '콜드브루',            youth: 3500, college: 2500, temp: 'iced', tags: ['ONLY ICED'] },
  { id: 'coffee-coldbrew-latte', cat: 'coffee',   name: '콜드브루 라떼',       youth: 4000, college: 3500, temp: 'iced', tags: ['ONLY ICED'] },
  { id: 'coffee-dolce-coldbrew', cat: 'coffee',   name: '돌체 콜드브루 라떼',  youth: 4500, college: 4000, temp: 'iced', tags: ['ONLY ICED'] },
  // BEVERAGE
  { id: 'bev-choco-latte',       cat: 'beverage', name: '추억의 초코 라떼',    youth: 3500, college: 3000, temp: 'both' },
  { id: 'bev-goguma-latte',      cat: 'beverage', name: '고구마 라떼',         youth: 3500, college: 3000, temp: 'both' },
  { id: 'bev-misutgaru-latte',   cat: 'beverage', name: '미숫가루 라떼',       youth: 3500, college: 3000, temp: 'both' },
  { id: 'bev-vinchaud',          cat: 'beverage', name: '뱅쇼',                youth: 4500, college: 4000, temp: 'hot',  tags: ['ONLY HOT'] },
  { id: 'bev-earl-grey-tea',     cat: 'beverage', name: '얼그레이 밀크티',     youth: 4000, college: 3500, temp: 'both' },
  { id: 'bev-yogurt-plain',      cat: 'beverage', name: '플레인 요거트 스무디', youth: 3500, college: 3000, temp: 'iced' },
  { id: 'bev-yogurt-strawberry', cat: 'beverage', name: '딸기 요거트 스무디',  youth: 4000, college: 3500, temp: 'iced' },
  { id: 'bev-yogurt-hallabong',  cat: 'beverage', name: '한라봉 요거트 스무디', youth: 4000, college: 3500, temp: 'iced' },
  // ADE
  { id: 'ade-lemon',             cat: 'ade',      name: '수제청 레몬에이드',   youth: 4000, college: 3000, temp: 'iced', tags: ['ONLY ICED'] },
  { id: 'ade-grapefruit',        cat: 'ade',      name: '수제청 자몽에이드',   youth: 4000, college: 3000, temp: 'iced', tags: ['ONLY ICED'] },
  // HAND DRIP
  { id: 'drip-ethiopia',         cat: 'handdrip', name: '에티오피아 내추럴',   youth: 5000, college: 5000, temp: 'hot', desc: '딸기 · 블랙티 · 브라운슈가' },
  { id: 'drip-geisha',           cat: 'handdrip', name: '게이샤 블랜딩',       youth: 6000, college: 6000, temp: 'hot', desc: '자스민 · 블루베리 · 피치' },
  // TEA
  { id: 'tea-peach-iced',        cat: 'tea',      name: '복숭아 아이스티',     youth: 3000, college: 2000, temp: 'iced', tags: ['ONLY ICED'] },
  { id: 'tea-ashotchu',          cat: 'tea',      name: '아샷추',              youth: 3500, college: 3000, temp: 'iced', tags: ['ONLY ICED'] },
  { id: 'tea-omija-zero',        cat: 'tea',      name: '제로 슈가 오미자 아이스티', youth: 3000, college: 2500, temp: 'iced', tags: ['0% SUGAR', 'ONLY ICED'] },
  { id: 'tea-fruit-tea',         cat: 'tea',      name: '수제청 과일차',       youth: 3500, college: 3000, temp: 'hot',  tags: ['NEW', 'ONLY HOT'], flavors: ['레몬', '자몽'] },
  { id: 'tea-yuja',              cat: 'tea',      name: '유자차',              youth: 3500, college: 3000, temp: 'hot',  tags: ['ONLY HOT'] },
  { id: 'tea-hallabong',         cat: 'tea',      name: '제주 한라봉티',       youth: 2500, college: 2000, temp: 'both' },
  { id: 'tea-jasmine',           cat: 'tea',      name: '자스민',              youth: 2500, college: 2000, temp: 'both' },
  { id: 'tea-peppermint',        cat: 'tea',      name: '페퍼 민트',           youth: 2500, college: 2000, temp: 'both' },
  // DESSERT
  { id: 'dessert-egg-tart',      cat: 'dessert',  name: '에그타르트',          youth: 2000, college: 2000, temp: 'none' },
  { id: 'dessert-choco-tart',    cat: 'dessert',  name: '초코 타르트',         youth: 2300, college: 2300, temp: 'none' },
  { id: 'dessert-salt-bread',    cat: 'dessert',  name: '소금빵',              youth: 3000, college: 3000, temp: 'none' }
];

export const HANDDRIP_NOTE = '5분 정도 소요되고, 상황에 따라 주문이 어려울 수 있어요.';

/* ---------------- 가격 그룹(티어) ---------------- */
/* 기본은 대학부·청년처 2그룹. 사장님이 config/app.tiers 에 그룹을 더하면 그 구간이 먼저 적용됩니다. */
export const DEFAULT_TIERS = [
  { id: 'college', name: '대학부', minAge: 15, maxAge: 26, fallback: 'youth' },
  { id: 'youth', name: '청년처', minAge: 27, maxAge: 99, fallback: '' }
];
let TIERS = DEFAULT_TIERS.slice();

/** config/app.tiers 를 읽거나 저장할 때마다 현재 그룹표를 맞춰 둡니다 */
export function setTiers(list) {
  TIERS = (Array.isArray(list) && list.length ? list : DEFAULT_TIERS)
    .filter(t => t && t.id && t.name)
    .map(t => ({ id: String(t.id), name: String(t.name), minAge: Number(t.minAge) || 0, maxAge: Number(t.maxAge) || 99, fallback: t.fallback || '' }));
  if (!TIERS.some(t => t.id === 'youth')) TIERS.push({ id: 'youth', name: '청년처', minAge: 27, maxAge: 99, fallback: '' });
  if (!TIERS.some(t => t.id === 'college')) TIERS.unshift({ id: 'college', name: '대학부', minAge: 15, maxAge: 26, fallback: 'youth' });
}
export const getTiers = () => TIERS;
/** 기본 2그룹(대학부·청년처) 외에 사장님이 추가한 그룹 */
export const customTiers = () => TIERS.filter(t => t.id !== 'college' && t.id !== 'youth');
export const tierName = (id) => (TIERS.find(t => t.id === id) || {}).name || (id === 'college' ? '대학부' : '청년처');

/* ---------------- 공통 설정(계좌·PIN) ---------------- */
export const DEFAULT_CONFIG = {
  pin: '0000',
  bank: '카카오뱅크',
  holder: '김정훈',
  account: '3333-27425-7330',
  toss: '김정훈',
  note: '결제 단말기가 없어 계좌이체 또는 현장 현금으로 결제합니다.',
  tiers: DEFAULT_TIERS
};

/* ---------------- 도우미 ---------------- */
export const won = n => Number(n || 0).toLocaleString('ko-KR') + '원';

/** 14기 이상 = 대학부 / 13기 이하(27세 이상) = 청년처 */
export function tierOf(gi) {
  const g = Number(gi) || 0;
  return g >= 14 ? 'college' : 'youth';
}
export const tierLabel = t => `${tierName(t)} 가격`;
export const tierShort = t => tierName(t);

/** 나이 → 가격 그룹: 사장님이 추가한 그룹 구간이 먼저, 아니면 대학부(~26세) / 청년처(27세~) */
export function tierForAge(age) {
  const a = Number(age) || 0;
  if (!a) return 'youth';
  const hit = customTiers().find(t => a >= t.minAge && a <= t.maxAge);
  if (hit) return hit.id;
  return a <= 26 ? 'college' : 'youth';
}

/* ---------------- 나이 → 기수 · 부서 ---------------- */
// 세종월드교회 카페 기준: 29세(98년생) = 11기, 30세(97년생) = 10기 → 기수 = 40 − 나이
export const AGE_BASE = 40;
export const giFromAge = age => { const a = Number(age) || 0; return a > 0 ? AGE_BASE - a : 0; };

// 나이 구간별 부서 · 가격대 (위에서부터 처음 맞는 구간)
const AGE_BANDS = [
  { maxAge: 23, dept: '대학2부', tier: 'college' },   // 17~20기
  { maxAge: 26, dept: '대학1부', tier: 'college' },   // 14~16기
  { maxAge: 30, dept: '청년3부', tier: 'youth' },     // 10~13기
  { maxAge: 33, dept: '청년2부', tier: 'youth' },     // 7~9기
  { maxAge: 36, dept: '청년1부', tier: 'youth' },     // 4~6기
  { maxAge: 999, dept: '', tier: 'youth' }            // 37세 이상 · 부서 없이 청년처
];

/** 나이만으로 부서 구간을 찾습니다. 37세 이상은 부서가 없고 청년처 가격입니다. 나이가 없으면 null */
export function bandOf(age) {
  const a = Number(age) || 0;
  if (a >= 37) return AGE_BANDS[AGE_BANDS.length - 1];
  if (a <= 0) return null;
  return AGE_BANDS.find(b => a <= b.maxAge) || AGE_BANDS[AGE_BANDS.length - 1];
}
export const deptOf = age => { const b = bandOf(age); return b ? b.dept : ''; };
export const tierOfAge = age => tierForAge(age);

/** 이름·나이 → 저장/표시용 프로필 (기수 = 40 − 나이, 37세 이상은 부서 없이 청년처) */
export function profileFrom(p) {
  const age = Number(p && p.age) || 0;
  return {
    name: String((p && p.name) || '').trim(),
    age,
    gi: giFromAge(age),
    dept: deptOf(age),
    senior: age >= 37,
    tier: tierOfAge(age)
  };
}

/** 예전(기수만 저장된) 프로필도 나이·부서가 채워지도록 */
export function hydrateProfile(p) {
  if (!p) return null;
  const age = Number(p.age) || (Number(p.gi) > 0 ? AGE_BASE - Number(p.gi) : 0);
  return { ...p, ...profileFrom({ name: p.name, age }) };
}

/** 나이 표기: 29세(11기) / 37세 이상은 37세 */
export function ageTag(o) {
  if (!o) return '';
  const age = Number(o.age) || (Number(o.gi) > 0 ? AGE_BASE - Number(o.gi) : 0);
  if (!age) return Number(o.gi) > 0 ? `${o.gi}기` : '';
  const gi = Number(o.gi) || giFromAge(age);
  return (age < 37 && gi > 0) ? `${age}세(${gi}기)` : `${age}세`;
}

/** 주문 카드용 한 줄: 29세(11기) · 청년3부 · 청년처 / 37세 이상은 37세 · 청년처 */
export function whoTag(o) {
  if (!o) return '';
  const age = Number(o.age) || (Number(o.gi) > 0 ? AGE_BASE - Number(o.gi) : 0);
  const p = profileFrom({ name: o.name, age });
  const tier = o.tier || p.tier;
  const dept = p.age >= 37 ? '' : (o.dept || p.dept);
  return [ageTag({ age, gi: o.gi }), dept, tierShort(tier)].filter(Boolean).join(' · ');
}

export function priceOf(menu, tier) {
  if (!menu) return 0;
  const id = tier || 'youth';
  const own = menu.prices && menu.prices[id];
  if (own != null && own !== '') return Number(own) || 0;
  if (id === 'college') return Number(menu.college) || 0;
  if (id === 'youth') return Number(menu.youth) || 0;
  // 커스텀 그룹 가격이 없는 메뉴는 폴백(기본 청년처) 가격으로
  const fb = (TIERS.find(t => t.id === id) || {}).fallback || 'youth';
  return fb === id ? Number(menu.youth) || 0 : priceOf(menu, fb);
}

export function deviceUid() {
  let uid = localStorage.getItem('cafe.uid');
  if (!uid) {
    uid = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    localStorage.setItem('cafe.uid', uid);
  }
  return uid;
}

export function shortId(id) {
  return String(id || '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
}

export function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
  if (s < 60) return s + '초 전';
  const m = Math.floor(s / 60);
  if (m < 60) return m + '분 전';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '시간 전';
  return Math.floor(h / 24) + '일 전';
}

export function hhmm(ts) {
  const d = new Date(Number(ts) || Date.now());
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ---------------- 메뉴 검색 ---------------- */
/** 이름·설명·태그로 메뉴를 찾습니다. 띄어 쓴 낱말은 모두 들어 있어야 하고, 빈 검색어는 전부 통과 */
export function menuMatches(menu, q) {
  const tokens = String(q == null ? '' : q).toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const hay = [menu && menu.name, menu && menu.desc, ...((menu && menu.tags) || [])]
    .filter(Boolean).join(' ').toLowerCase();
  return tokens.every(t => hay.includes(t));
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 확대(더블탭·핀치) 차단 — 모든 페이지 공통 */
export function lockZoom() {
  const stop = e => { if (e.cancelable) e.preventDefault(); };
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('gestureend', stop, { passive: false });
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch <= 320 && e.cancelable) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  // 트리플터치 선택 확대 방지
  document.addEventListener('touchstart', e => { if (e.touches.length > 1 && e.cancelable) e.preventDefault(); }, { passive: false });
}

/* ---------------- 메뉴 시드 ---------------- */
export async function ensureMenus(force = false) {
  const snap = await getDocs(collection(db, 'menus'));
  if (!force && !snap.empty) return { seeded: 0, total: snap.size };
  const batch = writeBatch(db);
  SEED.forEach((m, i) => {
    const data = {
      name: m.name, cat: m.cat, youth: m.youth, college: m.college,
      temp: m.temp || 'none', tags: m.tags || [], desc: m.desc || '',
      flavors: m.flavors || [], soldout: false, sort: (i + 1) * 10,
      updatedAt: Date.now()
    };
    batch.set(doc(db, 'menus', m.id), data, { merge: true });
  });
  await batch.commit();
  return { seeded: SEED.length, total: SEED.length };
}

/** config/app 문서가 없으면 기본값으로 만들어 둡니다 */
export async function ensureConfig() {
  const ref = doc(db, 'config', 'app');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...DEFAULT_CONFIG, updatedAt: Date.now() }, { merge: true });
    setTiers(DEFAULT_TIERS);
    return DEFAULT_CONFIG;
  }
  const cfg = { ...DEFAULT_CONFIG, ...snap.data() };
  const tiers = Array.isArray(snap.data().tiers) ? snap.data().tiers : DEFAULT_TIERS;
  setTiers(tiers);
  return { ...cfg, tiers };
}

export function watchConfig(cb) {
  return onSnapshot(doc(db, 'config', 'app'), snap => {
    const c = { ...DEFAULT_CONFIG, ...(snap.exists() ? snap.data() : {}) };
    setTiers(c.tiers);
    cb(c);
  }, err => { console.warn('config', err); cb({ ...DEFAULT_CONFIG }); });
}

/* ---------------- 회원 식별 키 (이름_나이) ---------------- */
/** 키오스크·손님 폰을 같은 사람으로 이어 주는 열쇠: "이름_나이" (공복 정리) */
export function memberKeyOf(p) {
  const name = String((p && p.name) || '').trim().replace(/\s+/g, ' ');
  const age = Number(p && p.age) || 0;
  if (!name) return '';
  return age ? `${name}_${age}` : name;
}

/* ---------------- 회원(이름·나이 → 기수·부서) 기억 ---------------- */
export async function saveMember(profile) {
  const uid = deviceUid();
  const p = profileFrom(profile);
  const data = {
    uid, name: p.name, age: p.age, gi: p.gi, dept: p.dept,
    senior: p.senior, tier: p.tier, memberKey: memberKeyOf(p),
    updatedAt: Date.now()
  };
  localStorage.setItem('cafe.profile', JSON.stringify(data));
  try { await setDoc(doc(db, 'members', uid), data, { merge: true }); } catch (e) { console.warn('member', e); }
  return data;
}

export function localProfile() {
  try { return JSON.parse(localStorage.getItem('cafe.profile') || 'null'); } catch (e) { return null; }
}

/* ---------------- 주문 ---------------- */
export const ORDER_STATUS = { new: '접수', made: '제조 완료', done: '완료' };

export function channelLabel(o) {
  if (o.channel === 'kiosk') return '키오스크 현장주문';
  return o.mode === 'pre' ? '폰 미리주문' : '폰 현장주문';
}

export function itemsSummary(items) {
  return (items || []).map(i => `${i.name}${i.option ? ' (' + i.option + ')' : ''} ×${i.qty}`).join(', ');
}

export const ACCOUNT_TEXT = c => `${c.bank} ${c.account} (예금주 ${c.holder})`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { }
    document.body.removeChild(ta);
    return ok;
  }
}

/* ---------------- 알림(진동·브라우저 알림) ---------------- */
export function beep(kind = 'ready') {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = kind === 'pay' ? [660, 880] : [880, 1180];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.16, now + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.17);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.2);
    });
    setTimeout(() => ctx.close(), 900);
  } catch (e) { }
}

export function buzz(pattern = [180, 90, 180]) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { }
}

const NOTI_ICON = './icon-192.png';
/** OS 알림: 서비스워커가 있으면 showNotification, 없으면 new Notification (아이폰 홈화면앱·안드로이드 크롬 공통) */
export async function notify(title, body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body, icon: NOTI_ICON, badge: NOTI_ICON, tag: 'sejong-cafe', renotify: true };
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) { await reg.showNotification(title, opts); return; }
    }
    new Notification(title, opts);
  } catch (e) { }
}

export async function askNotifyPermission() {
  try {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  } catch (e) { return 'error'; }
}

/* 앱 셸이 실제로 잘리지 않는지 확인용 */
export function fitCheck(root) {
  const el = root || document.documentElement;
  return { scrollW: el.scrollWidth, clientW: el.clientWidth, overflowX: el.scrollWidth - el.clientWidth };
}
