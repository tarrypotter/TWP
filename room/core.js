/* 교회 실 예약 — 공통 모듈
   손님 앱(index.html) · 관리자 진입(admin.html) 이 함께 씁니다.
   카페 앱과 같은 Firebase 프로젝트를 쓰되, 컬렉션은 room_* 로 완전히 분리했습니다.
   (카페의 members / orders / menus / config 는 읽지도 쓰지도 않습니다) */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  initializeFirestore, getFirestore, collection, doc, getDoc, getDocs, setDoc,
  addDoc, updateDoc, deleteDoc, onSnapshot, query, where, limit
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
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch (e) {
  db = getFirestore(app);
}

export { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, limit };

/* ---------------- 컬렉션 ---------------- */
export const COLL = {
  members: 'room_members',
  bookings: 'room_bookings',
  config: 'room_config'
};

/* ---------------- 성전 · 실 ---------------- */
/* 교회는 하나(세종월드교회)이고, 성전이 둘입니다. */
export const CHURCH_NAME = '세종월드교회';
export const CHURCHES = {
  sejong: { id: 'sejong', name: '세종 성전', short: '세종 성전', en: 'SEJONG SANCTUARY' },
  jaseong: { id: 'jaseong', name: '대전 자성성전', short: '대전 자성성전', en: 'DAEJEON JASEONG SANCTUARY' }
};
export const CHURCH_ORDER = ['sejong', 'jaseong'];

/* 층별 안내판(IMG_0869) 기준 구성.
   목사관 · 화장실 · 방송실 · 기계실은 예약 대상이 아니라 뺐습니다. */
export const ROOMS = [
  /* 세종 성전 */
  { id: 'sj-4-uyul1', church: 'sejong', floor: '4F', name: '유아실 1' },
  { id: 'sj-4-uyul2', church: 'sejong', floor: '4F', name: '유아실 2' },
  { id: 'sj-3-dae', church: 'sejong', floor: '3F', name: '대예배실' },
  { id: 'sj-2-mont', church: 'sejong', floor: '2F', name: '몽블랑실' },
  { id: 'sj-2-dior', church: 'sejong', floor: '2F', name: '디올실' },
  { id: 'sj-2-gucci', church: 'sejong', floor: '2F', name: '구찌실' },
  { id: 'sj-2-hermes', church: 'sejong', floor: '2F', name: '에르메스실' },
  { id: 'sj-2-chanel', church: 'sejong', floor: '2F', name: '샤넬실' },
  { id: 'sj-2-mokyang', church: 'sejong', floor: '2F', name: '목양실' },
  { id: 'sj-2-saint', church: 'sejong', floor: '2F', name: '입생로랑실' },
  { id: 'sj-1-louis', church: 'sejong', floor: '1F', name: '루이비통(소예배당)' },

  /* 대전 자성성전 */
  { id: 'js-1-edu1', church: 'jaseong', floor: '1층 교육관', name: '교육관 1실' },
  { id: 'js-1-edu2', church: 'jaseong', floor: '1층 교육관', name: '교육관 2실' },
  { id: 'js-2-edu', church: 'jaseong', floor: '2층 교육관', name: '2층 교육관' },
  { id: 'js-etc-bon', church: 'jaseong', floor: '기타', name: '본당' },
  { id: 'js-etc-sa', church: 'jaseong', floor: '기타', name: '사역자실' },
  { id: 'js-etc-uyul', church: 'jaseong', floor: '기타', name: '유아실' }
];

export const roomOf = id => ROOMS.find(r => r.id === id) || null;
export const roomsOf = church => ROOMS.filter(r => r.church === church);
export const floorsOf = church => [...new Set(roomsOf(church).map(r => r.floor))];
export const churchName = id => (CHURCHES[id] || {}).name || '';

/* ---------------- 시간 ---------------- */
export const pad = n => String(n).padStart(2, '0');
export const fmt = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
export const toMin = t => { const [a, b] = String(t).split(':'); return (+a) * 60 + (+b); };
/* 06:00 ~ 23:30 (마지막 예약은 22:30 시작 · 23:30 종료) */
export const DAY_START = 360;
export const DAY_END = 1410;
export const SPAN = DAY_END - DAY_START;
export const LAST_START = 1350;

export const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const todayStr = () => ymd(new Date());
export const addDays = (n, from) => { const d = from ? new Date(from + 'T00:00:00') : new Date(); d.setDate(d.getDate() + n); return ymd(d); };
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const dayName = s => WD[new Date(s + 'T00:00:00').getDay()];
export const dayLabel = s => s === todayStr() ? '오늘' : s === addDays(1) ? '내일' : dayName(s);
export const monthDay = s => (+s.slice(5, 7)) + '월 ' + (+s.slice(8, 10)) + '일';
export const dateLabel = s => s === todayStr() ? '오늘' : s === addDays(1) ? '내일' : monthDay(s) + ' (' + dayName(s) + ')';

/* ---------------- 상태 ---------------- */
export const STATUS = { pending: '요청중', approved: '승인', rejected: '거절', cancelled: '취소' };
export const isLive = b => b.status === 'approved' || b.status === 'pending';
export const spans = (a, b) => toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

/** 그 날 · 그 실에서 지금 쓰이고 있는 예약 (승인 + 요청중) */
export function busyOf(bookings, roomId, date) {
  return bookings
    .filter(b => b.roomId === roomId && b.date === date && isLive(b))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}

/* ---------------- 나이 → 기수 · 부서 (카페 앱과 같은 규칙) ---------------- */
export const AGE_BASE = 40;
export function profileOf(age) {
  const a = Number(age) || 0;
  const senior = a >= 37;
  const gi = (a > 0 && !senior) ? AGE_BASE - a : 0;
  let dept = '';
  if (a > 0 && !senior) {
    if (a >= 34) dept = '청년1부';
    else if (a >= 31) dept = '청년2부';
    else if (a >= 27) dept = '청년3부';
    else if (a >= 24) dept = '대학1부';
    else dept = '대학2부';
  }
  return { age: a, gi, dept, senior };
}
/** 29세(11기) · 청년3부 / 37세 이상은 "41세" */
export function ageTag(p) {
  const a = Number(p && p.age) || 0;
  if (!a) return '';
  if (a >= 37) return a + '세';
  return a + '세(' + (AGE_BASE - a) + '기)';
}
/** 기수 · 부서 한 줄 */
export function giLine(p) {
  const a = Number(p && p.age) || 0;
  if (!a) return '';
  if (a >= 37) return '청년처';
  const pr = profileOf(a);
  return pr.gi + '기 · ' + pr.dept;
}

/* ---------------- 계정 ---------------- */
export const ACCT_RE = /^[a-z0-9가-힣]{2,16}$/;
export const acctOf = v => String(v == null ? '' : v).trim().toLowerCase();
export function acctProblem(id) {
  const a = acctOf(id);
  if (!a) return '아이디를 적어 주세요';
  if (!ACCT_RE.test(a)) return '아이디는 영문·숫자·한글 2~16자로 적어 주세요';
  return '';
}
export const pwProblem = pw => String(pw == null ? '' : pw).length < 4 ? '비밀번호는 4자 이상으로 적어 주세요' : '';

export async function sha256Hex(text) {
  const s = String(text == null ? '' : text);
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { console.warn('sha256', e); }
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
    h2 = (h2 + s.charCodeAt(i) * (i + 7)) >>> 0;
  }
  return 'f' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
export function newSalt() {
  try {
    const a = new Uint8Array(6);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return String(Date.now().toString(16)) + Math.random().toString(16).slice(2, 8); }
}
export const pwHashOf = (acct, salt, pw) => sha256Hex(acctOf(acct) + ':' + (salt || '') + ':' + (pw == null ? '' : pw));

/* ---------------- 관리자 PIN ---------------- */
/* PIN 원문은 저장하지 않고 솔트 + SHA-256 해시만 room_config/settings 에 둡니다. */
const PIN_SALT = 'room-pin';
export async function getPinConfig() {
  const ref = doc(db, COLL.config, 'settings');
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const salt = newSalt();
  const data = { pinSalt: salt, pinHash: await pwHashOf('admin', salt, '0000'), updatedAt: Date.now() };
  try { await setDoc(ref, data, { merge: true }); } catch (e) { console.warn('pin init', e); }
  return data;
}
export async function checkPin(pin) {
  const cfg = await getPinConfig();
  const hash = await pwHashOf('admin', cfg.pinSalt || PIN_SALT, String(pin || '').trim());
  return hash === cfg.pinHash;
}
export async function savePin(pin) {
  const salt = newSalt();
  const ref = doc(db, COLL.config, 'settings');
  await setDoc(ref, { pinSalt: salt, pinHash: await pwHashOf('admin', salt, String(pin).trim()), updatedAt: Date.now() }, { merge: true });
}

/* ---------------- 표시 도우미 ---------------- */
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const peopleText = n => (Number(n) || 1) + '명';
