/* 세종월드교회 카페 — 공통 모듈
   고객앱(index.html) · 키오스크(kiosk.html) · 사장님(admin.html) 이 함께 씁니다. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  initializeFirestore, getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp
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
  onSnapshot, query, where, orderBy, limit, writeBatch, serverTimestamp };

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
  { id: 'tea-yuja',              cat: 'tea',      name: '유자차',              youth: 2500, college: 2000, temp: 'hot',  tags: ['ONLY HOT'] },
  { id: 'tea-hallabong',         cat: 'tea',      name: '제주 한라봉티',       youth: 2500, college: 2000, temp: 'both' },
  { id: 'tea-jasmine',           cat: 'tea',      name: '자스민',              youth: 2500, college: 2000, temp: 'both' },
  { id: 'tea-peppermint',        cat: 'tea',      name: '페퍼 민트',           youth: 2500, college: 2000, temp: 'both' },
  // DESSERT
  { id: 'dessert-egg-tart',      cat: 'dessert',  name: '에그타르트',          youth: 2000, college: 2000, temp: 'none' },
  { id: 'dessert-choco-tart',    cat: 'dessert',  name: '초코 타르트',         youth: 2300, college: 2300, temp: 'none' },
  { id: 'dessert-salt-bread',    cat: 'dessert',  name: '소금빵',              youth: 3000, college: 3000, temp: 'none' }
];

export const HANDDRIP_NOTE = '5분 정도 소요되고, 상황에 따라 주문이 어려울 수 있어요.';

/* ---------------- 공통 설정(계좌·PIN) ---------------- */
export const DEFAULT_CONFIG = {
  pin: '0000',
  bank: '카카오뱅크',
  holder: '김정훈',
  account: '3333-27425-7330',
  toss: '김정훈',
  note: '결제 단말기가 없어 계좌이체 또는 현장 현금으로 결제합니다.'
};

/* ---------------- 도우미 ---------------- */
export const won = n => Number(n || 0).toLocaleString('ko-KR') + '원';

/** 14기 이상 + 만 37세 미만 = 대학부 / 그 외(13기 이하 또는 만 37세 이상) = 청년처 */
export function tierOf(gi, senior) {
  const g = Number(gi) || 0;
  return (!senior && g >= 14) ? 'college' : 'youth';
}
export const tierLabel = t => t === 'college' ? '대학부 가격' : '청년처 가격';
export const tierShort = t => t === 'college' ? '대학부' : '청년처';

export function priceOf(menu, tier) {
  return Number(tier === 'college' ? menu.college : menu.youth) || 0;
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
    return DEFAULT_CONFIG;
  }
  return { ...DEFAULT_CONFIG, ...snap.data() };
}

export function watchConfig(cb) {
  return onSnapshot(doc(db, 'config', 'app'), snap => {
    cb({ ...DEFAULT_CONFIG, ...(snap.exists() ? snap.data() : {}) });
  }, err => { console.warn('config', err); cb({ ...DEFAULT_CONFIG }); });
}

/* ---------------- 회원(이름·기수) 기억 ---------------- */
export async function saveMember(profile) {
  const uid = deviceUid();
  const data = {
    uid, name: profile.name, gi: Number(profile.gi) || 0,
    senior: !!profile.senior, tier: tierOf(profile.gi, profile.senior),
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

export function notify(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: './icon.png', badge: './icon.png' });
    }
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
