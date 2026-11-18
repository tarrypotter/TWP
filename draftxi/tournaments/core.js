/* ==========================================================================
   DRAFT XI · 대회 공통 엔진 — 레전드 컵 · 26/27 국대전 · 레전드 국대전
   · 대회별 파일은 팀 데이터/메타/리매치만 등록하고, 진행·대진표·경기 후·종료 화면은
     모두 여기서 그린다. 새 대회를 추가해도 모바일 레이아웃 규칙을 그대로 물려받는다.
   · 의존(호출 시점): index.html의 S/U, TACTS, CUP_TACTS, CUP_ROUNDS, CARE 등
   ========================================================================== */
/* ---------- 통합 토너먼트: 레전드 컵 · 26/27 국대전 · 레전드 국대전 ---------- */
/* 대회 레지스트리 — 대회별 파일(tournaments/*.js)이 자기 팀 데이터·메타·리매치 표를 등록한다.
   엔진과 화면은 대회 키(k)만 받아 동작하므로 새 대회를 붙여도 이 파일은 건드리지 않는다. */
const DX = { tours:{} };
function dxRegister(def){
  if(!def || !def.k) return;
  DX.tours[def.k] = def;
  T_LV[def.k] = null;            /* 전력 평준화 캐시 무효화 */
}
function tmeta(k){ const d = DX.tours[k]; return (d && d.meta) || {k:k, ic:'🏆', name:'대회', eye:'CUP', poolN:'팀', hero:''}; }
function tTeams(k){ const d = DX.tours[k]; return (d && d.teams) || []; }
function tTacOf(k, id){ const d = DX.tours[k]; return (d && d.tacOf && d.tacOf[id]) || 'balance'; }
function tById(k, id){ for(const t of tTeams(k)) if(t.id === id) return t; return null; }
function tIdOf(k, id){ return !!tById(k, id); }
function tLabel(k, id, short){ const t = tById(k, id); if(!t) return '—'; return (t.s ? t.s + ' ' : '') + (short ? (t.sn || t.n) : t.n); }
function tEmblem(t){ return t && t.flag ? t.flag : ''; }
function tShuffle(a){ const r = a.slice(); for(let i = r.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const x = r[i]; r[i] = r[j]; r[j] = x; } return r; }
/* 전력 평준화 86~90 — 국대전도 클럽 버프 없이 전술·상성·컨디션으로만 */
const T_LV = {};
function tLv(k, t){
  const list = tTeams(k);
  let c = T_LV[k];
  if(!c || c.n !== list.length){
    const arr = list.map(x => x.ovr), lo = Math.min.apply(null, arr), hi = Math.max.apply(null, arr);
    c = T_LV[k] = {n:list.length, map:{}};
    list.forEach(x => { c.map[x.id] = clamp(Math.round(86 + (x.ovr - lo) / Math.max(1, hi - lo) * 4), 86, 90); });
  }
  return c.map[t.id] || 88;
}
function cupLv(t){ return tLv('cup', t); }
function tAvgOvr(k){ const a = tTeams(k); return a.reduce((s, x) => s + (+x.ovr || 0), 0) / Math.max(1, a.length); }
function tUnderdog(k, t){ return !!t && (+t.ovr || 0) < tAvgOvr(k); }
/* 상태 슬롯 — 종류별로 따로 보관한다 */
function tGet(k){ return k === 'nat' ? S.natTour : k === 'natleg' ? S.ntlTour : S.cup; }
function tSet(k, v){ if(k === 'nat') S.natTour = v; else if(k === 'natleg') S.ntlTour = v; else S.cup = v; }
function tSelGet(k){ return k === 'nat' ? S.natSel : k === 'natleg' ? S.ntlSel : S.cupSel; }
function tSelSet(k, v){ if(k === 'nat') S.natSel = v; else if(k === 'natleg') S.ntlSel = v; else S.cupSel = v; }
function tCareGet(k){ return clamp(Math.round(+((k === 'nat' ? S.natCare : k === 'natleg' ? S.ntlCare : S.cupCare)) || 0), 0, 2); }
function tCareSet(k, v){ if(k === 'nat') S.natCare = v; else if(k === 'natleg') S.ntlCare = v; else S.cupCare = v; }
function tTacKeyOf(k){ return k === 'nat' ? 'natTac' : k === 'natleg' ? 'ntlTac' : 'cupTac'; }
function tCups(k){ const a = k === 'nat' ? S.natCups : k === 'natleg' ? S.ntlCups : S.cups; return Array.isArray(a) ? a : []; }
function tCupsSet(k, v){ if(k === 'nat') S.natCups = v; else if(k === 'natleg') S.ntlCups = v; else S.cups = v; }
function tRecKeyOf(k){ return k === 'nat' ? 'natRec' : k === 'natleg' ? 'ntlRec' : 'cupRec'; }
function tRec(k){ const key = tRecKeyOf(k); if(!S[key] || typeof S[key] !== 'object') S[key] = {n:0, w:0, l:0}; return S[key]; }
function tSplitRecord(k, plus){
  const r = tRec(k); r.n += 1; r[plus] = (r[plus] || 0) + 1; return r;
}
function tRivalry(k, a, b){
  const d = DX.tours[k];
  const list = (d && d.rivalry) || [];
  const g = id => { const t = tById(k, id); return t ? (t.g || CUP_CLUB_G[id]) : null; };
  const ga = g(a), gb = g(b);
  if(!ga || !gb || ga === gb) return null;
  for(const r of list){
    if((r.g[0] === ga && r.g[1] === gb) || (r.g[0] === gb && r.g[1] === ga)) return {n:r.n, s:r.s};
  }
  return null;
}
/* ---------- 로스터 · 전력 ---------- */
function tPlOvr(k, t, i){
  const role = t.xi[i][1];
  const off = {GK:-1, SW:-2, CB:-3, LB:-2, RB:-2, RWB:-2, LWB:-2, DM:-1, CM:1, AM:2, RM:1, LM:1, LW:2, RW:2, RF:2, LF:2, CF:3, ST:3, SS:2}[role];
  const h = (hashOf(t.id + ':' + i) % 5) - 2;
  return clamp(Math.round(tLv(k, t) + (off == null ? 0 : off) + h), 62, 99);
}
function tRoster(k, t){ return t.xi.map((p, i) => ({name:p[0], role:p[1], ovr:tPlOvr(k, t, i)})); }
function cupGrp(role){ return CUP_GRP[role] || grp(role); }
function tGrp(role){ return cupGrp(role); }
function tSide(k, t){
  const e = tRoster(k, t), avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 60;
  const gk = e.filter(x => tGrp(x.role) === 'GK')[0];
  const df = e.filter(x => tGrp(x.role) === 'DF'), mf = e.filter(x => tGrp(x.role) === 'MF'), fw = e.filter(x => tGrp(x.role) === 'FW');
  return {ovr:tLv(k, t), att:avg(fw.map(x => x.ovr)), mid:avg(mf.map(x => x.ovr)),
    def:avg(df.map(x => x.ovr)) * 0.78 + (gk ? gk.ovr : 60) * 0.22, cond:0, entries:e, syn:0, name:(t.s ? t.s + ' ' : '') + t.n};
}
function tOpp(k, t, round){
  const s = tSide(k, t);
  return {club:(t.s ? t.s + ' ' : '') + t.n, league:'LEGEND', base:tLv(k, t), att:s.att + 0.6, mid:s.mid, def:s.def + 0.4,
    xi:t.xi.map(p => [p[0], p[1]]), legend:t.id, cupTac:tTacOf(k, t.id), tk:k, flag:t.flag || '',
    ai:aiProfile(Math.min(9, 2 + (round || 0)))};
}
function tOffer(k, n){ return tShuffle(tTeams(k).map(t => t.id)).slice(0, n || 3); }
/* ---------- 대회 진행 ---------- */
function tourRoundNames(k, size){ return CUP_ROUNDS[size === 16 ? 16 : 32]; }
function tourStart(k, myId, size){
  const t = tById(k, myId); if(!t) return;
  const n = size === 16 ? 16 : 32;
  const rest = tShuffle(tTeams(k).map(x => x.id).filter(id => id !== myId)).slice(0, n - 1);
  const field = tShuffle([myId].concat(rest));
  const ties = [];
  for(let i = 0; i < field.length; i += 2) ties.push({a:field[i], b:field[i + 1], sa:null, sb:null, win:null, pens:null, mine:false, forfeit:false});
  tSet(k, {k:k, size:n, totals:Math.round(Math.log(n) / Math.log(2)), my:myId, round:0,
    rounds:[{name:tourRoundNames(k, n)[0], ties:ties}], done:false, result:null, coins:0, at:Date.now()});
  tSelSet(k, null); tCareSet(k, 0);
  U.tourPick = null; U.cupSel = null; U.cupR = 0;
  save(); U.tab = 'cup'; U.contest = k; render();
  toast(tmeta(k).ic + ' ' + n + '강 시작 · ' + tLabel(k, myId));
}
function tourReroll(k){
  const sel = tSelGet(k);
  if(!sel || U.tourPick !== k){ toast('팀 선택 화면이 아닙니다'); return; }
  if(sel.rerolled){ toast('이번 대회 리롤은 이미 사용했습니다'); return; }
  if(ticketCount() < CUP_REROLL_TICKET){ toast('패스 티켓이 ' + (CUP_REROLL_TICKET - ticketCount()) + '장 부족합니다'); return; }
  spendTickets(CUP_REROLL_TICKET);
  const next = {k:k, size:sel.size, offers:tOffer(k, 3), rerolled:true};
  tSelSet(k, next);
  save(); render();
  toast('🎫' + CUP_REROLL_TICKET + ' · 다른 3팀으로 교체 · 이번 대회 1회 한정');
}
function tourOpen(k, size){
  const n = size === 16 ? 16 : 32;
  const cur = tSelGet(k);
  const ok = cur && cur.size === n && Array.isArray(cur.offers) && cur.offers.length === 3 && cur.offers.every(id => tIdOf(k, id));
  if(!ok) tSelSet(k, {k:k, size:n, offers:tOffer(k, 3), rerolled:false});
  U.match = null; U.tourPick = k; if(k === 'cup') U.cupSel = tSelGet(k);
  U.tab = 'cup'; U.contest = k;
  save(); render();
}
function tourCare(k, kind){
  const c = tGet(k);
  if(!c || c.done){ toast('진행 중인 대회가 없습니다'); return; }
  const care = tCareGet(k);
  const v = kind === 'max' ? 2 : 1;
  if(care >= v){ toast(care >= 2 ? '이미 최상 컨디션입니다' : '이미 컨디션을 올렸습니다'); return; }
  const cost = kind === 'max' ? CARE.max.cost : CARE.lift.cost;
  if(S.coins < cost){ toast('코인이 ' + fmt(cost - S.coins) + ' 부족합니다'); return; }
  S.coins -= cost; tCareSet(k, v); save(); paintHud(); render();
  toast('컨디션 ' + (v >= 2 ? '최상' : '좋음') + ' · 이번 경기 한정');
}
function tourMyTie(k){
  const c = tGet(k); if(!c || c.done) return null;
  const rd = c.rounds[c.round]; if(!rd) return null;
  return rd.ties.filter(t => t.a === c.my || t.b === c.my)[0] || null;
}
function tourMyOpp(k){
  const t = tourMyTie(k), c = tGet(k); if(!t || !c) return null;
  return tById(k, t.a === c.my ? t.b : t.a);
}
function tourOppId(k){ const t = tourMyTie(k), c = tGet(k); if(!t || !c) return null; return t.a === c.my ? t.b : t.a; }
function tourPlay(k){
  const c = tGet(k); if(!c || c.done) return;
  const tie = tourMyTie(k); if(!tie) return;
  const myId = c.my, opId = tie.a === c.my ? tie.b : tie.a;
  const myT = tById(k, myId), opT = tById(k, opId);
  if(!myT || !opT) return;
  const side = tSide(k, myT);
  startMatch(k, tOpp(k, opT, c.round), {team:side, myName:tLabel(k, myId), roster:side.entries, round:tourRoundNames(k, c.size)[c.round],
    rematch:tRivalry(k, myId, opId)});
}
function tourSimTie(k, t){
  if(t.win) return;
  const A = tById(k, t.a), B = tById(k, t.b);
  if(!A && !B) return;
  if(!A || !B){ t.win = A ? t.a : t.b; t.sa = A ? 3 : 0; t.sb = B ? 3 : 0; return; }
  const la = tLv(k, A), lb = tLv(k, B);
  const d = clamp((la - lb) * 0.55, -9, 9);
  const ga = Math.max(0, Math.round(1.15 + d * 0.16 + rnd(-0.9, 0.9)));
  const gb = Math.max(0, Math.round(1.15 - d * 0.16 + rnd(-0.9, 0.9)));
  t.sa = ga; t.sb = gb;
  if(ga === gb){
    const pw = clamp(0.5 + (la - lb) * 0.02, 0.34, 0.66);
    const Awin = Math.random() < pw;
    t.pens = Awin ? '5-4' : '4-5';
    t.win = Awin ? t.a : t.b;
  } else t.win = ga > gb ? t.a : t.b;
}
function tourResolveRound(k, c){
  const rd = c.rounds[c.round]; if(!rd) return;
  rd.ties.forEach(t => { if(!t.win) tourSimTie(k, t); });
  if(c.round < c.totals - 1 && !c.rounds[c.round + 1]){
    const ties = [];
    for(let i = 0; i < rd.ties.length; i += 2) ties.push({a:rd.ties[i].win, b:rd.ties[i + 1] ? rd.ties[i + 1].win : null, sa:null, sb:null, win:null, pens:null});
    c.rounds.push({name:tourRoundNames(k, c.size)[c.round + 1], ties:ties});
  }
}
function tourSimRest(k, c){
  while(c.round < c.totals - 1){ tourResolveRound(k, c); c.round += 1; }
  tourResolveRound(k, c);
}
function tourCoins(remaining, gd){ return (CUP_COINS[clamp(remaining, 1, 5)] || 200) + (gd > 0 ? gd * 30 : 0); }
function tourExitCoins(remaining){ return Math.round((CUP_COINS[clamp(remaining, 1, 5)] || 200) * 0.25); }
/* ---------- 승부차기 원탭 심리전 (모든 토너먼트 공용) ---------- */
const PEN_DIR = ['L', 'C', 'R'];
const PEN_DIR_TXT = {L:'왼쪽', C:'가운데', R:'오른쪽'};
const PEN_DIR_IC = {L:'◀', C:'▲', R:'▶'};
function penKickers(entries){
  const score = x => (tGrp(x.role) === 'FW' ? 3 : tGrp(x.role) === 'MF' ? 2 : tGrp(x.role) === 'DF' ? 1 : 0) * 100 + (+x.ovr || 0);
  const out = (entries || []).map(x => ({name:x.name, role:x.role, ovr:+x.ovr || 70})).sort((a, b) => score(b) - score(a)).slice(0, 7);
  return out.length ? out : [{name:'키커', role:'FW', ovr:75}];
}
function penInit(k, M){
  const c = tGet(k);
  const myT = c ? tById(k, c.my) : null, opT = tourMyOpp(k);
  const mine = M.roster || [], theirs = opT ? tRoster(k, opT) : [];
  const gkOf = e => { const g = (e || []).filter(x => tGrp(x.role) === 'GK')[0]; return g ? g.name : '골키퍼'; };
  return {turn:'me', me:0, op:0, meK:[], opK:[], log:[], done:false,
    meName: myT ? tLabel(k, c.my) : '내 팀', opName: opT ? tLabel(k, opT.id) : '상대',
    meGK: gkOf(mine), opGK: gkOf(theirs),
    meKick: penKickers(mine), opKick: penKickers(theirs)};
}
function penDone(P2){
  const mk = P2.meK.length, ok = P2.opK.length;
  const remMe = Math.max(0, 5 - mk), remOp = Math.max(0, 5 - ok);
  if(P2.me > P2.op + remOp) return true;
  if(P2.op > P2.me + remMe) return true;
  if(mk >= 5 && ok >= 5 && mk === ok && P2.me !== P2.op) return true;
  return false;
}
function penTake(dir, silent){
  const M = U.match, P2 = M && M.pen;
  if(!P2 || P2.done) return;
  if(!silent){
    const now = Date.now();
    if(P2.lock && now - P2.lock < 160) return;
    P2.lock = now;
  }
  const d = PEN_DIR.indexOf(dir) >= 0 ? dir : 'C';
  const cp = clamp((M.t.ovr - M.opp.base) * 0.011, -0.10, 0.08);
  if(P2.turn === 'me'){
    const kp = pick(PEN_DIR);
    const kicker = P2.meKick[P2.meK.length % P2.meKick.length];
    const goal = Math.random() < (d === kp ? clamp(0.24 + cp * 0.5, 0.10, 0.42) : clamp(0.90 + cp, 0.70, 0.97));
    P2.meK.push({dir:d, kp, goal, name:kicker.name});
    if(goal) P2.me += 1;
    P2.log.unshift({side:'me', ok:goal, txt:(goal ? '○ ' : '✕ ') + kicker.name + ' · ' + PEN_DIR_TXT[d] + (goal ? ' 성공' : ' 막힘 (키퍼가 ' + PEN_DIR_TXT[kp] + ')')});
  } else {
    const kd = pick(PEN_DIR);
    const kicker = P2.opKick[P2.opK.length % P2.opKick.length];
    const saved = Math.random() < (kd === d ? 0.70 : 0.30);
    P2.opK.push({dir:kd, kp:d, goal:!saved, name:kicker.name});
    if(!saved) P2.op += 1;
    P2.log.unshift({side:'op', ok:saved, txt:(saved ? '✕ ' : '○ ') + kicker.name + ' · ' + PEN_DIR_TXT[kd] + (saved ? ' 선방!' : ' 실점')});
  }
  P2.turn = P2.turn === 'me' ? 'op' : 'me';
  if(penDone(P2)){
    P2.done = true;
    const pens = {me:P2.me, op:P2.op};
    tourResolveTie(M.tk || 'cup', M, pens);
  }
}
function penAuto(){
  const M = U.match, P2 = M && M.pen;
  if(!P2 || P2.done) return;
  let guard = 0;
  while(!P2.done && guard++ < 40) penTake(pick(PEN_DIR), true);
  if(P2.done) return;
  renderPenalty(M.tk || 'cup');
}
function renderPenalty(k){
  const M = U.match, P2 = M && M.pen;
  if(!P2) return;
  const c = tGet(k), m = tmeta(k);
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
  const dots = arr => Array.from({length: Math.max(5, arr.length)}, (_, i) => {
    const x = arr[i];
    return `<i class="pk ${x ? (x.goal ? 'g' : 'm') : ''}">${x ? (x.goal ? '○' : '✕') : '·'}</i>`;
  }).join('');
  const turnMe = P2.turn === 'me';
  const kicker = turnMe ? P2.meKick[P2.meK.length % P2.meKick.length] : P2.opKick[P2.opK.length % P2.opKick.length];
  const round = (c && !c.done) ? tourRoundNames(k, c.size)[c.round] : '';
  $('#main').innerHTML = `
    <div class="eyebrow">${m.eye} · ${esc(round)} · 승부차기</div>
    <h2 class="title">승부차기</h2>
    <div class="tiny" style="margin-top:3px">90분 ${M.me}:${M.op} 무승부 · 5번씩, 동점이면 서든데스</div>
    <div class="penboard">
      <div class="pt"><span class="nm">${esc(P2.meName)}</span><b>${P2.me}</b><div class="pks">${dots(P2.meK)}</div></div>
      <div class="pdiv">PK</div>
      <div class="pt r"><span class="nm">${esc(P2.opName)}</span><b>${P2.op}</b><div class="pks">${dots(P2.opK)}</div></div>
    </div>
    <div class="pencall">
      <div class="eyebrow g">${turnMe ? '내 킥 · 키커' : '상대 킥 · 내가 골키퍼'}</div>
      <b>${esc(kicker ? kicker.name : '키커')}</b>
      <span>${turnMe ? '슛 방향을 고르세요 · 상대 골키퍼 ' + esc(P2.opGK) : '막을 방향을 고르세요 · 내 골키퍼 ' + esc(P2.meGK)}</span>
    </div>
    <div class="pdirs">
      ${PEN_DIR.map(x => `<button class="pdir" data-act="pen-dir" data-k="${x}"><b>${PEN_DIR_IC[x]}</b><small>${PEN_DIR_TXT[x]}</small></button>`).join('')}
    </div>
    <div class="sect stack">
      <button class="btn dark wide" data-act="pen-auto">⚡ 남은 킥 자동</button>
      <div class="tiny" style="text-align:center">킥마다 방향을 고릅니다 · 남은 킥은 자동으로 돌려도 됩니다</div>
    </div>
    <div class="sect"><div class="card" style="padding:11px 12px"><div class="tiny">내 킥은 슛 방향을, 상대 킥은 막을 방향을 고릅니다. 키커와 골키퍼가 같은 방향을 고르면 막히고, 다르면 거의 들어갑니다. 5번씩 차고 동점이면 서든데스 · 한쪽이 확실히 앞서면 바로 끝납니다.</div></div></div>
    ${P2.log.length ? `<div class="sect"><div class="sect-h"><div class="eyebrow g">킥 기록</div><div class="tiny">${P2.meK.length + P2.opK.length}번째</div></div>
      <div class="plog">${P2.log.map(x => `<div class="pl ${x.ok ? 'ok' : ''}">${esc(x.txt)}</div>`).join('')}</div></div>` : ''}`;
}
/* ---------- 대회 결과 반영 ---------- */
function tourWin(k, M, c, tie){
  const myT = tById(k, c.my), opT = tById(k, tie.a === c.my ? tie.b : tie.a);
  const rec = {at:Date.now(), size:c.size, team:tLabel(k, c.my),
    ovr: myT ? tLv(k, myT) : 0, opp: opT ? tLabel(k, opT.id) : '',
    me:M.me, op:M.op, pens: M.pens ? M.pens.me + '-' + M.pens.op : '',
    mvp: M.mvp ? M.mvp.name : '', coins: c.coins || 0, under: myT ? tUnderdog(k, myT) : false};
  tCupsSet(k, [rec].concat(tCups(k)).slice(0, 30));
  c.done = true; c.result = 'champion';
}
function finishTourMatch(k, M){
  const c = tGet(k);
  if(!c || c.done){ U.match = null; U.tab = 'cup'; U.contest = k; render(); return; }
  const rd = c.rounds[c.round];
  const tie = rd ? rd.ties.filter(t => t.a === c.my || t.b === c.my)[0] : null;
  if(!tie){ U.match = null; U.tab = 'cup'; U.contest = k; render(); return; }
  M.mvp = pickMVP(M);
  M.rematch = tRivalry(k, c.my, tie.a === c.my ? tie.b : tie.a);
  if(M.me === M.op){
    M.over = true;
    M.pen = penInit(k, M);
    save();
    renderPenalty(k);
    return;
  }
  tourResolveTie(k, M, null);
}
function tourResolveTie(k, M, pens){
  const c = tGet(k);
  if(!c || c.done) return;
  const rd = c.rounds[c.round];
  const tie = rd ? rd.ties.filter(t => t.a === c.my || t.b === c.my)[0] : null;
  if(!tie) return;
  const myA = tie.a === c.my;
  const res = pens ? (pens.me > pens.op ? 'w' : 'l') : (M.me > M.op ? 'w' : 'l');
  tie.sa = myA ? M.me : M.op; tie.sb = myA ? M.op : M.me;
  tie.pens = pens ? (myA ? pens.me + '-' + pens.op : pens.op + '-' + pens.me) : null;
  tie.win = res === 'w' ? c.my : (myA ? tie.b : tie.a);
  tie.mine = true;
  M.pens = pens; M.res = res;
  M.mvp = M.mvp || pickMVP(M);
  const remaining = c.totals - c.round;
  let coins = res === 'w' ? tourCoins(remaining, Math.abs(M.me - M.op)) : tourExitCoins(remaining);
  if(res === 'w' && M.rematch){ M.rematchBonus = LG_REMATCH_COIN; coins += LG_REMATCH_COIN; }
  M.coinBase = coins; M.coins = coins;
  if(M.burn){ M.coins = Math.round(coins * BURN_COIN); M.burnBonus = M.coins - M.coinBase; }
  tCareSet(k, 0);
  S.coins += M.coins; c.coins = (c.coins || 0) + M.coins;
  tSplitRecord(k, res);
  ensureQuests(); questAdd('game', 1); questAdd('g11', 1); if(res === 'w') questAdd('win', 1);
  if(res === 'w'){ questAdd('cupwin', 1); if(M.cupChanged) questAdd('cuptac', 1); }
  if(res === 'w' && c.round >= c.totals - 1) tourWin(k, M, c, tie);
  else if(res === 'w'){ tourResolveRound(k, c); c.round += 1; }
  else { tourResolveRound(k, c); tourSimRest(k, c); c.done = true; c.result = 'out'; }
  save(); paintHud(); renderTourResult(k, M);
}
function tourForfeit(k){
  const c = tGet(k), M = U.match;
  if(M && M.timer) clearInterval(M.timer);
  if(!c || c.done){ U.match = null; U.tab = 'cup'; U.contest = k; render(); return; }
  const rd = c.rounds[c.round];
  const tie = rd ? rd.ties.filter(t => t.a === c.my || t.b === c.my)[0] : null;
  if(tie){ tie.win = tie.a === c.my ? tie.b : tie.a; tie.forfeit = true; tie.mine = true; }
  tSplitRecord(k, 'l');
  if(M) M.over = true;
  tourResolveRound(k, c); tourSimRest(k, c); c.done = true; c.result = 'out';
  U.match = null; U.tab = 'cup'; U.contest = k; save(); render(); toast(tmeta(k).name + ' 기권');
}
/* ---------- 대진 UI 조각 ---------- */
function tourTieRow(k, t){
  const c = tGet(k);
  const wA = t.win && t.win === t.a, wB = t.win && t.win === t.b;
  const mine = c && (t.a === c.my || t.b === c.my);
  const live = mine && c && !c.done && c.rounds[c.round] && c.rounds[c.round].ties.indexOf(t) >= 0 && !t.win;
  const A = tById(k, t.a), B = tById(k, t.b);
  const nm = (id, x) => (x && x.flag ? `<span class="fl">${x.flag}</span> ` : '') + esc(tLabel(k, id, true));
  return `<div class="tie ${mine ? 'mine' : ''} ${live ? 'live' : ''}">
    <div class="tr ${wA ? 'w' : ''} ${c && t.a === c.my ? 'me' : ''}"><span class="nm">${nm(t.a, A)}</span><i>${A ? A.ovr : ''}</i><b>${t.sa == null ? '–' : t.sa}</b></div>
    <div class="tr ${wB ? 'w' : ''} ${c && t.b === c.my ? 'me' : ''}"><span class="nm">${nm(t.b, B)}</span><i>${B ? B.ovr : ''}</i><b>${t.sb == null ? '–' : t.sb}</b></div>
    ${t.forfeit ? '<div class="tf">몰수</div>' : t.pens ? `<div class="tf">승부차기 ${esc(t.pens)}</div>` : (!t.win ? '<div class="tf wait">예정</div>' : '')}
  </div>`;
}
function tourPathRows(k, c){
  const rows = [];
  for(let i = 0; i < c.rounds.length; i++){
    const t = c.rounds[i].ties.filter(x => x.a === c.my || x.b === c.my)[0];
    if(!t) continue;
    const myA = t.a === c.my, opId = myA ? t.b : t.a;
    const opT = tById(k, opId);
    const flag = (opT && opT.flag) ? `<span class="fl">${opT.flag}</span> ` : '';
    const opp = esc(tLabel(k, opId, true));
    const won = t.win === c.my, lost = t.win && t.win !== c.my;
    const sc = t.sa == null ? '' : (myA ? t.sa + ':' + t.sb : t.sb + ':' + t.sa);
    const pk = t.pens && !t.forfeit ? 'PK ' + (myA ? t.pens : t.pens.split('-').reverse().join('-')) : '';
    rows.push(`<div class="pr ${won ? 'w' : lost ? 'l' : 'now'}"><span class="rd">${c.rounds[i].name}</span>
      <span class="op">${flag}${opp}</span><span class="sc">${t.forfeit ? '몰수' : sc || 'vs'}${pk ? ' · ' + esc(pk) : ''}</span></div>`);
  }
  return rows.join('');
}
function tourXiHTML(k, t){
  const e = tRoster(k, t);
  return `<div class="xi">${e.map(x => `<div class="xr"><span class="ps">${esc(x.role)}</span><span class="nm">${esc(x.name)}</span><b>${x.ovr}</b></div>`).join('')}</div>`;
}
function kstLabel(ts){
  try{ const d = new Date(+ts + KST_OFF); return d.toISOString().slice(0, 10).replace(/-/g, '.') + ' ' + d.toISOString().slice(11, 16); }
  catch(e){ return ''; }
}
function tourTrophyRow(k, r){
  const m = tmeta(k);
  return `<div class="trop"><div class="ic">${m.ic}</div><div class="tx">
    <b>${esc(r.team || '')}${r.under ? ' 🐴' : ''}</b>
    <span>${r.size}강 우승 · 결승 ${r.me}:${r.op}${r.pens ? ' (PK ' + esc(r.pens) + ')' : ''} vs ${esc(r.opp || '')}</span>
    <small>${kstLabel(r.at)} · MVP ${esc(r.mvp || '—')} · +${fmt(r.coins || 0)}C</small>
  </div></div>`;
}
function openTourHistory(which){
  const kinds = which === 'all' ? ['cup', 'nat', 'natleg'] : [(which === 'nat' || which === 'natleg' || which === 'cup') ? which : 'cup'];
  const body = kinds.map(k => {
    const m = tmeta(k), cups = tCups(k), rec = tRec(k);
    return `<div class="sect-h" style="margin-top:12px"><div class="eyebrow g">${m.ic} ${esc(m.name)}</div><div class="tiny">${rec.n}경기 ${rec.w}승 ${rec.l}패</div></div>
      <div class="stack">${cups.length ? cups.map(c => tourTrophyRow(k, c)).join('') : `<div class="tiny">아직 ${esc(m.name)} 우승 기록이 없습니다.</div>`}</div>`;
  }).join('');
  const total = kinds.reduce((s, k) => s + tCups(k).length, 0);
  $('#sheet').innerHTML = `<div class="grab"></div>
    <div class="eyebrow">TROPHY ROOM · ${kinds.length === 1 ? esc(tmeta(kinds[0]).eye) : 'ALL CONTESTS'}</div>
    <div style="font-size:16px;font-weight:900;letter-spacing:-.03em;margin-top:3px">우승 트로피 ${total}개</div>
    <div class="muted" style="margin-top:5px">90분 무승부는 승부차기로 결판납니다. 국대전은 클럽 버프 없이 고정 OVR로 치릅니다.</div>
    ${body}
    <button class="btn dark wide" style="margin-top:14px" data-act="close-sheet">닫기</button>`;
  $('#sheetHost').classList.add('on');
}
function openCupHistory(){ openTourHistory('cup'); }
function openNationHistory(){ openTourHistory('all'); }
/* ---------- 화면 ---------- */
function tourPickHTML(k){
  const m = tmeta(k);
  const sel = tSelGet(k) || {k:k, size:32, offers:tOffer(k, 3), rerolled:false};
  if(U.tourPick !== k || !tSelGet(k)){ tSelSet(k, sel); U.tourPick = k; }
  if(k === 'cup') U.cupSel = sel;
  const cands = sel.offers.map(id => tById(k, id)).filter(Boolean);
  const noun = k === 'cup' ? '팀' : '국가';
  return `<div class="eyebrow">${m.eye} · ${sel.size}강</div>
    <h2 class="title">출전할 ${k === 'cup' ? '팀을' : '국가를'} 고르세요</h2>
    <div class="tiny" style="margin-top:3px">${esc(m.poolN)} ${tTeams(k).length}${k === 'cup' ? '팀' : '개국'} 중 랜덤 3${k === 'cup' ? '팀' : '개국'}입니다. 전력은 86~90으로 평준화되어 전술·컨디션 승부가 됩니다.</div>
    <div class="pick3" style="margin-top:11px">
      ${cands.map(t => `<div class="cupick">
        <div class="hd">${t.flag ? `<span class="fl">${t.flag}</span>` : ''}${t.s ? `<i>${esc(t.s)}</i>` : ''}<span class="ov">${tLv(k, t)}</span></div>
        <div class="tt">${esc(t.n)}</div>
        <div class="st">${esc(t.story)}</div>
        <div class="stars">${t.star.map(x => `<span class="tag">${esc(x)}</span>`).join('')}<span class="tag amber">${CUP_TACTS[tTacOf(k, t.id) || 'balance'].ic} ${CUP_TACTS[tTacOf(k, t.id) || 'balance'].name}</span>${tUnderdog(k, t) ? '<span class="tag lime">🐴 언더독</span>' : ''}</div>
        <button class="go" data-act="tour-pick" data-id="${t.id}">출전 →</button>
      </div>`).join('')}
    </div>
    <div class="sect stack">
      ${sel.rerolled
        ? `<button class="btn dark wide" disabled>🎫 리롤 사용 완료 · 대회당 1회</button>`
        : `<button class="btn dark wide" data-act="tour-reroll" style="${ticketCount() < CUP_REROLL_TICKET ? 'opacity:.55' : ''}">🎫 ${CUP_REROLL_TICKET}장 · 다른 3${k === 'cup' ? '팀' : '개국'} 보기 (대회당 1회)</button>`}
      <div class="tiny" style="text-align:center">티켓이 없으면 지금 3${k === 'cup' ? '팀' : '개국'} 중 하나를 골라야 합니다 · 무료 리롤 없음</div>
      <button class="btn dark wide" data-act="tour-cancel">돌아가기</button>
    </div>`;
}
function tourIntroHTML(k){
  const m = tmeta(k), list = tTeams(k), cups = tCups(k), rec = tRec(k);
  const under = cups.filter(x => x.under).length;
  const isCup = k === 'cup';
  const sub = isCup
    ? '레전드 시즌 팀으로 16강 또는 32강을 뚫고 결승까지. 드래프트 없이 전술만 바꿔 치릅니다.'
    : k === 'nat'
      ? '26/27 현재 국가대표 32개국으로 16강 또는 32강 토너먼트. 클럽 버프 없이 고정 OVR · 전술 6종·상성·컨디션 케어·상대 전술 예고·승부차기 원탭 심리전.'
      : '역대 전설 국가대표 32개국으로 16강 또는 32강 토너먼트. 2002 한국부터 2022 아르헨티나까지, 고정 OVR로 전술만으로 붙습니다.';
  return `<div class="eyebrow">${m.eye} · 11 VS 11</div>
    <h2 class="title">${m.ic} ${esc(m.name)}</h2>
    <section class="hero" style="margin-top:10px">
      <div class="eyebrow">${isCup ? 'SEASON CLASSICS' : k === 'nat' ? 'WORLD XI 2026' : 'NATIONS OF HISTORY'}</div>
      <h2>${m.hero}<br><em>토너먼트 우승</em></h2>
      <p>${esc(sub)}</p>
      <div class="facts"><span class="fact">${isCup ? '레전드 팀' : '국가'} <b>${list.length}${isCup ? '개' : '개국'}</b></span><span class="fact">최대 <b>5경기</b></span><span class="fact">우승 <b>1,600C+</b></span></div>
    </section>
    <div class="sect stack">
      <button class="btn primary wide" data-act="tour-open" data-k="${k}" data-size="32">32강 대회 · ${isCup ? '레전드' : '랜덤'} 31${isCup ? '팀' : '개국'}</button>
      <button class="btn dark wide" data-act="tour-open" data-k="${k}" data-size="16">16강 대회 · 랜덤 15${isCup ? '팀' : '개국'}</button>
      <div class="tiny" style="text-align:center">고른 ${isCup ? '팀' : '국가'}의 베스트 11로 결승까지 같은 팀으로 뜁니다</div>
    </div>
    <div class="sect"><div class="grid2">
      <div class="gcard"><span>${esc(m.name)} 우승</span><b>${cups.length}</b><small>${cups.length ? '트로피 ' + cups.length + '개' : '도전 기록 없음'}</small></div>
      <div class="gcard"><span>대회 전적</span><b>${rec.w}-${rec.l}</b><small>${rec.n}경기 · 무승부 없음</small></div>
    </div>${under ? `<div class="tiny" style="margin-top:7px">🐴 언더독 우승 ${under}회 · 평균 전력보다 낮은 팀으로 정상</div>` : ''}</div>
    ${cups.length ? `<div class="sect"><div class="sect-h"><div class="eyebrow g">RECENT TROPHY</div><button class="chip" data-act="tour-history" data-k="${k}">전체 기록</button></div>${tourTrophyRow(k, cups[0])}</div>` : ''}`;
}
function tourDoneHTML(k){
  const m = tmeta(k), c = tGet(k);
  const myT = c ? tById(k, c.my) : null;
  if(!c) return tourIntroHTML(k);
  if(!myT){ tSet(k, null); save(); return tourIntroHTML(k); }
  const champ = c.result === 'champion';
  const ft = c.rounds[c.rounds.length - 1];
  const finalTie = ft && ft.ties[0];
  const champT = finalTie ? tById(k, finalTie.win) : null;
  let exitRound = '';
  for(let i = 0; i < c.rounds.length; i++){
    const t = c.rounds[i].ties.filter(x => x.a === c.my || x.b === c.my)[0];
    if(t && t.win && t.win !== c.my) exitRound = c.rounds[i].name;
  }
  const view = clamp(U.cupR == null ? c.rounds.length - 1 : U.cupR, 0, c.rounds.length - 1);
  const myName = tLabel(k, c.my);
  return `<div class="eyebrow">${m.eye} · ${c.size}강</div>
    <h2 class="title">${m.ic} ${esc(m.name)}</h2>
    <div style="margin-top:10px" class="${champ ? 'cuptro' : 'cupcard'}">
      ${champ ? `<div class="ic">🏆</div><div class="tx"><b>${esc(myName)} 우승${tUnderdog(k, myT) ? ' 🐴' : ''}</b>
        <span>${c.size}강 ${c.totals}라운드 전승 · 보상 +${fmt(c.coins || 0)}C</span>
        <small>${esc(m.name)} 우승 트로피 ${tCups(k).length}개</small></div>`
      : `<div class="lc out">💔</div><div class="tx"><b>${esc(myName)} · ${esc(exitRound || c.rounds[c.round].name)} 탈락</b>
        <span>대회 우승 ${esc(champT ? tLabel(k, champT.id) : '—')} · 보상 +${fmt(c.coins || 0)}C</span></div>`}
    </div>
    <div class="sect"><div class="sect-h"><div class="eyebrow g">내 대진</div><div class="tiny">${c.size}강</div></div>
      <div class="path">${tourPathRows(k, c)}</div></div>
    <div class="sect"><div class="sect-h"><div class="eyebrow g">최종 라운드</div><div class="tiny">${ft ? ft.ties.length + '경기' : ''}</div></div>
      <div class="chips" style="margin-bottom:8px">${c.rounds.map((r, i) => `<button class="chip ${view === i ? 'on' : ''}" data-act="tour-round" data-r="${i}">${r.name}</button>`).join('')}</div>
      <div class="ties">${(c.rounds[view] || ft).ties.map(t => tourTieRow(k, t)).join('')}</div></div>
    <div class="sect stack">
      <button class="btn primary wide" data-act="tour-new" data-k="${k}">새 대회 도전</button>
      <div class="row" style="gap:6px">
        <button class="btn dark sm" style="flex:1" data-act="tour-history" data-k="${k}">${m.ic} 트로피 기록</button>
        <button class="btn dark sm" style="flex:1" data-act="go-stadium">경기장으로</button>
      </div>
    </div>`;
}
function tourHTML(k){
  const m = tmeta(k), c = tGet(k);
  if(!c) return (U.tourPick === k && tSelGet(k)) ? tourPickHTML(k) : tourIntroHTML(k);
  if(c.done) return tourDoneHTML(k);
  const myT = tById(k, c.my);
  if(!myT){ tSet(k, null); save(); return tourIntroHTML(k); }
  const opT = tourMyOpp(k), names = tourRoundNames(k, c.size);
  const rem = opT ? tRivalry(k, c.my, opT.id) : null;
  const view = clamp(U.cupR == null ? c.round : U.cupR, 0, c.rounds.length - 1);
  const rd = c.rounds[view] || c.rounds[c.round];
  const care = tCareGet(k), myTac = S[tTacKeyOf(k)] || 'balance';
  const myName = esc(tLabel(k, c.my));
  const opTac = opT ? tTacOf(k, opT.id) : 'balance';
  return `<div class="eyebrow">${m.eye} · ${c.size}강 · ${c.round + 1}/${c.totals} 라운드 <span style="color:var(--dim)">· OVR ${tLv(k, myT)}</span></div>
    <h2 class="title">${m.ic} ${myName}</h2>
    ${opT ? `<div class="cupvs" style="margin-top:10px">
      <div class="between"><span class="eyebrow">${names[c.round]} · 다음 상대</span><span class="tag amber">OVR ${tLv(k, opT)}</span></div>
      <div class="ttl">${opT.flag ? `<span class="fl">${opT.flag}</span> ` : ''}${opT.s ? `<i>${esc(opT.s)}</i>` : ''}${esc(opT.n)}</div>
      <div class="st">${esc(opT.story)}</div>
      <div class="stars">${opT.star.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
      ${rem ? `<div class="rematch">✨ ${esc(rem.n)}<small>${esc(rem.s)} · 승리 시 +${fmt(LG_REMATCH_COIN)}C</small></div>` : ''}
      <div class="between" style="margin-top:9px"><span class="eyebrow g">내 전술</span>
        <span class="tiny">하프타임 변경 가능</span></div>
      ${cupTacLineHTML(opTac)}
      <div class="tacbar" style="margin-top:7px">${tacBarHTML(true)}</div>
      <div class="row" style="gap:6px;margin-top:8px">
        <button class="chip ${care >= 1 ? 'on' : ''}" data-act="tour-care" data-k="${k}" data-c="lift">⚡ 컨디션↑ ${fmt(CARE.lift.cost)}</button>
        <button class="chip ${care >= 2 ? 'on' : ''}" data-act="tour-care" data-k="${k}" data-c="max">🔥 최상 ${fmt(CARE.max.cost)}</button>
      </div>
      <button class="btn primary wide" style="margin-top:8px" data-act="tour-play" data-k="${k}">${names[c.round]} 경기 시작 →</button>
    </div>` : ''}
    <div class="sect">
      <div class="sect-h"><div class="eyebrow g">내 베스트 11</div><div class="tiny">OVR ${myT.ovr}</div></div>
      ${tourXiHTML(k, myT)}
    </div>
    <div class="sect">
      <div class="sect-h"><div class="eyebrow g">대진표</div><div class="tiny">${esc(names[view])} · ${rd.ties.filter(t => t.win).length}/${rd.ties.length}경기 종료</div></div>
      <div class="chips" style="margin-bottom:8px">${names.map((n, i) => `<button class="chip ${view === i ? 'on' : ''}" data-act="tour-round" data-r="${i}" ${i >= c.rounds.length ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      <div class="ties">${rd.ties.map(t => tourTieRow(k, t)).join('')}</div>
    </div>
    <div class="sect">
      <div class="sect-h"><div class="eyebrow g">내 대진</div><div class="tiny">${c.coins ? '+' + fmt(c.coins) + 'C' : '우승까지 ' + c.totals + '경기'}</div></div>
      <div class="path">${tourPathRows(k, c)}</div>
    </div>
    <div class="sect"><button class="btn dark wide" data-act="tour-abandon" data-k="${k}">대회 포기</button></div>`;
}
function cupHTML(){ return tourHTML(U.contest === 'nat' || U.contest === 'natleg' ? U.contest : 'cup'); }
function renderTourResult(k, M){
  const m = tmeta(k), c = tGet(k), names = c ? tourRoundNames(k, c.size) : [];
  const win = (M.res || 'w') === 'w';
  const champ = c && c.result === 'champion';
  const rdName = M.roundName || (c && c.result !== 'champion' && c.round >= 0 ? names[Math.min(c.round, names.length - 1)] : '결승') || '결승';
  const myT = c ? tById(k, c.my) : null;
  const opT = M.opp ? tById(k, M.opp.legend) : null;
  const label = champ ? '우승' : win ? '승리' : '탈락';
  const cls = champ ? 'amber' : win ? 'lime' : 'red';
  const nxt = (win && !champ) ? tourMyOpp(k) : null;
  const title = champ ? m.name + ' 정상' : win ? (rdName + ' 통과') : (rdName + '에서 멈춤');
  $('#main').innerHTML = `
    <div class="result">
      <div class="rb">
        <div class="rbtop"><span class="tag ${cls}">${label}</span><h3>${title}</h3></div>
        <div class="fs">${M.me}<i>:</i>${M.op}</div>
        ${M.pens ? `<div class="rpen">승부차기 <b>${M.pens.me}-${M.pens.op}</b> ${M.pens.me > M.pens.op ? '승' : '패'}</div>` : ''}
        <div class="rteam"><b>${esc(myT ? tLabel(k, c.my) : '내 팀')}</b><span>vs</span><b>${esc(opT ? tLabel(k, opT.id) : (M.opp ? M.opp.club : '—'))}</b></div>
        ${M.rematch ? `<div class="rematch" style="margin-top:8px">✨ ${esc(M.rematch.n)}<small>${esc(M.rematch.s)}${M.rematchBonus ? ' · 승리 보너스 +' + fmt(M.rematchBonus) + 'C' : ''}</small></div>` : ''}
      </div>
      <div class="rewards">
        <div><span>획득 코인</span><b class="up">+${fmt(M.coins)}</b>${M.burn ? `<small>🔥 버닝 1.5배 +${fmt(M.burnBonus || 0)}</small>` : ''}</div>
        <div><span>${champ ? '우승 트로피' : win ? '다음 라운드' : '보유 코인'}</span><b>${champ ? tCups(k).length + '<small>개</small>' : win && nxt ? esc(nxt.sn || nxt.n) : fmt(S.coins)}</b></div>
      </div>
      <div class="rh"><span>득점 타임라인</span><span>점유 ${M.poss}% · 슈팅 ${M.shotsMe}-${M.shotsOp}</span></div>
      ${goalsCard(M)}
      <div class="rh"><span>오늘의 MVP</span><span>${esc(tacTag(M.tac))}</span></div>
      ${mvpCard(M)}
      <div class="racts">
        <button class="btn primary wide" data-act="tour-next">${champ ? '대진표 · 우승 기록 보기' : win ? '다음 라운드' + (nxt ? ' · ' + esc(nxt.sn || nxt.n) : '') + ' →' : '대진표 보기'}</button>
        <div class="row" style="gap:6px">
          <button class="btn dark sm" style="flex:1" data-act="tour-new" data-k="${k}">새 대회 도전</button>
          <button class="btn dark sm" style="flex:1" data-act="go-stadium">경기장으로</button>
        </div>
      </div>
      ${c ? `<div class="rh"><span>${esc(rdName)}</span><span>${c.size}강 · ${c.totals}라운드</span></div>
      <div class="path">${tourPathRows(k, c)}</div>` : ''}
    </div>
    <div class="rfoot">보유 코인 ${fmt(S.coins)} · ${esc(m.name)} ${tCups(k).length}회 우승</div>`;
}
function openMenuSheet(){
  const n = claimCount(), cups = tCups('cup').length, lgc = (S.leagueCups || []).length, L = S.league;
  const natC = tCups('nat').length, nlgC = tCups('natleg').length;
  const natT = tGet('nat'), nlgT = tGet('natleg');
  const lgSub = L ? (L.done ? (LG[L.lg] || '') + ' ' + L.pos + '위 마감 · 새 시즌' : (LG[L.lg] || '') + ' R' + (L.r + 1) + '/' + L.fx.length + ' 진행 중')
    : (lgc ? '리그 우승 ' + lgc + '회' : '5대 리그 실제 순위전');
  const natSub = natT && !natT.done ? natT.size + '강 대회 · ' + tourRoundNames('nat', natT.size)[natT.round] + ' 진행 중' : (natC ? '우승 ' + natC + '회 · 현역 32개국' : '현역 국가대표 32개국');
  const nlgSub = nlgT && !nlgT.done ? nlgT.size + '강 대회 · ' + tourRoundNames('natleg', nlgT.size)[nlgT.round] + ' 진행 중' : (nlgC ? '우승 ' + nlgC + '회 · 전설 32개국' : '역대 전설 국가대표 32개국');
  $('#sheet').innerHTML = `<div class="grab"></div>
    <div class="eyebrow">MENU</div>
    <div style="font-size:16px;font-weight:900;letter-spacing:-.03em;margin-top:3px">전체 메뉴</div>
    <div class="muted" style="margin-top:5px">버프·퀘스트·랭킹·트로피 기록·백업은 여기서 엽니다.</div>
    <div class="mrows">
      <button class="mrow" data-act="menu-upgrade"><span class="mi">⚡</span><span class="mt"><b>버프 강화</b><span>포지션 · 팀컬러 · 선수별 Lv</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="menu-quest"><span class="mi">📋</span><span class="mt"><b>퀘스트</b><span>일일 · 주간 · 도전 과제</span></span>${n ? `<span class="mb">${n > 9 ? '9+' : n}</span>` : '<span class="go">›</span>'}</button>
      <button class="mrow" data-act="menu-ranking"><span class="mi">🏅</span><span class="mt"><b>랭킹 · 전적</b><span>11대11 랭킹 · 1대1 · 공유</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="menu-cup"><span class="mi">🏆</span><span class="mt"><b>레전드 컵</b><span>${cups ? '우승 ' + cups + '회 · ' + CUP_T.length + '팀 토너먼트' : CUP_T.length + '팀 시즌 클래식 토너먼트'}</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="menu-league"><span class="mi">⚽</span><span class="mt"><b>26/27 리그</b><span>${esc(lgSub)}</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="menu-nat"><span class="mi">🌍</span><span class="mt"><b>26/27 국대전</b><span>${esc(natSub)}</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="menu-natleg"><span class="mi">🏅</span><span class="mt"><b>레전드 국대전</b><span>${esc(nlgSub)}</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="tour-history" data-k="all"><span class="mi">🏆</span><span class="mt"><b>트로피 기록</b><span>레전드 컵 · 국대전 2종 ${cups + natC + nlgC}개</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="lg-history"><span class="mi">⚽</span><span class="mt"><b>26/27 리그 트로피</b><span>${lgc ? '리그 우승 ' + lgc + '회 기록' : '아직 리그 우승 기록이 없습니다'}</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="menu-backup"><span class="mi">💾</span><span class="mt"><b>백업 · 불러오기</b><span>JSON으로 저장하거나 복원</span></span><span class="go">›</span></button>
      <button class="mrow" data-act="menu-reset"><span class="mi">🗑</span><span class="mt"><b>전체 초기화</b><span>코인 · 전적 · 트로피까지 삭제</span></span><span class="go">›</span></button>
    </div>
    <button class="btn dark wide" style="margin-top:12px" data-act="close-sheet">닫기</button>`;
  $('#sheetHost').classList.add('on');
}

/* ---------- 국대전 상태 검증 · 백업 병합 (구버전 JSON 안전) ---------- */
function saniTour(c, k){
  if(!c || typeof c !== 'object') return null;
  const sz = c.size === 16 ? 16 : 32;
  const names = tourRoundNames(k, sz);
  const totals = Math.round(Math.log(sz) / Math.log(2));
  const my = tById(k, String(c.my || '')) ? String(c.my) : null;
  if(!my) return null;
  const out = {k:k, size:sz, totals:totals, my:my,
    round:clamp(Math.round(+c.round || 0), 0, totals - 1),
    done:!!c.done,
    result:(c.result === 'champion' || c.result === 'out') ? c.result : null,
    coins:Math.max(0, Math.round(+c.coins || 0)),
    at:Math.round(+c.at || Date.now()), rounds:[]};
  out.rounds = Array.isArray(c.rounds) ? c.rounds.filter(r => r && Array.isArray(r.ties)).map((r, i) => ({
    name: names[i] || String(r.name || ''),
    ties: r.ties.filter(t => t && tById(k, String(t.a || '')) && tById(k, String(t.b || ''))).map(t => ({
      a:String(t.a), b:String(t.b),
      sa:(typeof t.sa === 'number' && isFinite(t.sa)) ? t.sa : null,
      sb:(typeof t.sb === 'number' && isFinite(t.sb)) ? t.sb : null,
      win: (t.win === t.a || t.win === t.b) ? String(t.win) : null,
      pens:(typeof t.pens === 'string') ? t.pens.slice(0, 9) : null,
      mine:!!t.mine, forfeit:!!t.forfeit
    }))
  })).slice(0, totals) : [];
  if(!out.rounds.length || !out.rounds[0].ties.length) return null;
  if(out.round > out.rounds.length - 1) out.round = out.rounds.length - 1;
  if(!out.done && !out.rounds[out.round].ties.some(t => t.a === out.my || t.b === out.my)) return null;
  return out;
}
function saniSel(sel, k){
  if(!sel || typeof sel !== 'object') return null;
  const off = Array.isArray(sel.offers) ? sel.offers.map(String).filter(id => !!tById(k, id)).slice(0, 3) : [];
  if(off.length !== 3) return null;
  return {k:k, size: sel.size === 16 ? 16 : 32, offers:off, rerolled:!!sel.rerolled};
}
function saniCups(a, k){
  return Array.isArray(a) ? a.filter(x => x && typeof x === 'object').slice(0, 30).map(x => ({
    at: Math.round(+x.at || 0), size: x.size === 16 ? 16 : 32, team: String(x.team || ''), ovr: Math.max(0, Math.round(+x.ovr || 0)),
    opp: String(x.opp || ''), me: Math.max(0, Math.round(+x.me || 0)), op: Math.max(0, Math.round(+x.op || 0)),
    pens: String(x.pens || ''), mvp: String(x.mvp || ''), coins: Math.max(0, Math.round(+x.coins || 0)), under: !!x.under
  })) : [];
}
function saniRec(r){
  const o = (r && typeof r === 'object') ? r : {n:0, w:0, l:0};
  const out = {n:0, w:0, l:0};
  ['n', 'w', 'l'].forEach(k => { out[k] = Math.max(0, Math.round(+o[k] || 0)); });
  return out;
}


function tacStateKey(){
  const M = U.match;
  if(M && M.mode === 'league') return 'leagueTac';
  if(M && (M.mode === 'cup' || M.mode === 'nat' || M.mode === 'natleg')) return tTacKeyOf(M.mode);
  const k = U.contest || 'cup';
  return k === 'league' ? 'leagueTac' : tTacKeyOf(k);
}
function tacHintHTML(opTac){
  const my = S[tacStateKey()] || 'balance', e = cupEdge(my, opTac);
  return e > 0 ? '상성 우위 🔥 · ' + CUP_TACTS[my].name + josa(CUP_TACTS[my].name, '이', '가') + ' ' + CUP_TACTS[opTac].name + josa(CUP_TACTS[opTac].name, '을', '를') + ' 흔듭니다'
    : e < 0 ? '상성 열세 ⚠️ · ' + CUP_TACTS[opTac].name + josa(CUP_TACTS[opTac].name, '이', '가') + ' 유리합니다. 전술을 바꿔보세요'
    : '상성 대등 · 하프타임에도 바꿀 수 있습니다';
}
function contestSegHTML(){
  const k = U.contest || 'cup', L = S.league;
  const st = L ? (L.done ? '결산' : 'R' + (L.r + 1) + '/' + L.fx.length) : '';
  const live = c => (c && !c.done) ? tourRoundNames(c.k || 'cup', c.size)[c.round] : '';
  const ct = live(tGet('cup')), nt = live(tGet('nat')), gt = live(tGet('natleg'));
  return `<div class="segwrap"><div class="seg four">
    <button class="${k === 'cup' ? 'on' : ''}" data-act="contest-seg" data-k="cup"><span class="si">🏆</span>레전드 컵${ct ? '<small>' + esc(ct) + '</small>' : ''}</button>
    <button class="${k === 'league' ? 'on' : ''}" data-act="contest-seg" data-k="league"><span class="si">⚽</span>26/27 리그${st ? '<small>' + esc(st) + '</small>' : ''}</button>
    <button class="${k === 'nat' ? 'on' : ''}" data-act="contest-seg" data-k="nat"><span class="si">🌍</span>26/27 국대${nt ? '<small>' + esc(nt) + '</small>' : ''}</button>
    <button class="${k === 'natleg' ? 'on' : ''}" data-act="contest-seg" data-k="natleg"><span class="si">🏅</span>레전드 국대${gt ? '<small>' + esc(gt) + '</small>' : ''}</button>
  </div></div>`;
}

