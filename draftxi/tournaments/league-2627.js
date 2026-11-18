/* 26/27 리그 — 5대 리그 실제 순위전 엔진 + 화면 */
/* ---------- 26/27 리그 · 실제 리그 순위전 ---------- */
const LG_ROUND_COINS = {w:210, d:90, l:45};
const LG_SEASON_COINS = [2600, 900, 400];   /* 1·2·3위 시즌 보상 */
const LG_BIG_COIN = 180;        /* 빅매치 승리 보너스 */
const LG_REMATCH_COIN = 220;    /* 역사적 리매치 승리 보너스 (레전드 컵) */
const LG_TOP_COIN = 500;        /* 리그 득점왕 보너스 */
const LG_RATE_COIN = 400;       /* 리그 평점왕 보너스 */
/* 같은 도시·같은 역사의 라이벌 — 다음 경기가 맞붙으면 빅매치 */
const LG_DERBY = [
  {a:'맨체스터 시티', b:'맨체스터 유나이티드', n:'맨체스터 더비'},
  {a:'리버풀', b:'맨체스터 유나이티드', n:'북서부 더비'},
  {a:'아스널', b:'토트넘', n:'북런던 더비'},
  {a:'리버풀', b:'에버턴', n:'머지사이드 더비'},
  {a:'첼시', b:'아스널', n:'런던 더비'},
  {a:'첼시', b:'토트넘', n:'런던 더비'},
  {a:'뉴캐슬', b:'선덜랜드', n:'타인-웨어 더비'},
  {a:'아스톤 빌라', b:'크리스털 팰리스', n:'프리미어십 라이벌'},
  {a:'브라이턴', b:'크리스털 팰리스', n:'M23 더비'},
  {a:'레알 마드리드', b:'바르셀로나', n:'엘 클라시코'},
  {a:'레알 마드리드', b:'아틀레티코', n:'마드리드 더비'},
  {a:'베티스', b:'세비야', n:'세비야 더비'},
  {a:'아틀레틱', b:'레알 소시에다드', n:'바스크 더비'},
  {a:'바이에른', b:'도르트문트', n:'데어 클라시커'},
  {a:'도르트문트', b:'샬케 04', n:'루르 더비'},
  {a:'함부르크', b:'베르더 브레멘', n:'북부 더비'},
  {a:'쾰른', b:'묀헨글라트바흐', n:'라인 더비'},
  {a:'인터 밀란', b:'AC 밀란', n:'밀라노 더비'},
  {a:'유벤투스', b:'인터 밀란', n:'이탈리아 더비'},
  {a:'로마', b:'라치오', n:'로마 더비'},
  {a:'나폴리', b:'로마', n:'남부 라이벌'},
  {a:'PSG', b:'마르세유', n:'르 클라시크'}
];
function lgDerbyOf(home, away){
  for(const d of LG_DERBY) if((d.a === home && d.b === away) || (d.a === away && d.b === home)) return d;
  return null;
}
/* 다음 경기가 빅매치인가 — 1·2위 / 3위권 맞대결 / 라이벌 다비 */
function lgBigMatch(L, oppClub){
  if(!L || !oppClub || L.done) return null;
  const d = lgDerbyOf(L.my, oppClub);
  let out = null;
  if(lgStarted(L)){
    const rows = lgStandings(L);
    const my = rows.filter(r => r.club === L.my)[0], op = rows.filter(r => r.club === oppClub)[0];
    if(my && op){
      if(my.rank <= 2 && op.rank <= 2) out = {tag:'리그 1·2위 맞대결', why:'1위와 2위가 다음 라운드에 붙습니다'};
      else if(my.rank <= 3 && op.rank <= 3) out = {tag:'3위권 맞대결', why:'상위권이 맞붙어 순위가 바뀝니다'};
    }
  }
  if(!out && d) out = {tag:d.n, why:'라이벌 더비 · 자존심 싸움'};
  if(!out) return null;
  out.derby = d ? d.n : '';
  out.coin = LG_BIG_COIN;
  return out;
}
/* 시즌 후반 우승 매직넘버 — 남은 10경기 이하 + 1위 또는 우승권 */
function lgMagic(L){
  if(!L || L.done || !L.fx) return null;
  const N = L.fx.length, remaining = N - L.r;
  if(remaining <= 0 || remaining > 10 || !lgStarted(L)) return null;
  const rows = lgStandings(L), mine = rows.filter(r => r.club === L.my)[0];
  if(!mine) return null;
  let need = -Infinity;
  rows.forEach(r => {
    if(r.club === L.my) return;
    const max = r.pts + (N - r.p) * 3;
    if(max - mine.pts + 1 > need) need = max - mine.pts + 1;
  });
  if(mine.rank === 1) return need <= 0 ? {kind:'champ', remaining} : {kind:'magic', n:Math.max(1, Math.round(need)), remaining};
  const leader = rows[0], gap = leader.pts - mine.pts;
  if(mine.rank <= 3 && gap <= 6) return {kind:'chase', gap, remaining, leader:leader.club};
  return null;
}
/* ---------- 득점왕·평점왕 레이스 ---------- */
function lgScorerAdd(L, club, name, goals, rating){
  if(!L || !club || !name) return;
  const k = club + '|' + name;
  const m = L.scorers || (L.scorers = {});
  const s = m[k] || (m[k] = {n:String(name), c:String(club), g:0, rs:0, rn:0});
  if(goals > 0) s.g += goals;
  if(rating > 0){ s.rs += rating; s.rn += 1; }
}
function lgScorerList(L){
  const m = (L && L.scorers) || {};
  return Object.keys(m).map(k => {
    const s = m[k];
    return {n:s.n, c:s.c, g: Math.max(0, +s.g || 0), avg: s.rn ? s.rs / s.rn : 0, rn: Math.max(0, +s.rn || 0)};
  });
}
function lgScorerTop(L, n){
  return lgScorerList(L).filter(x => x.g > 0).sort((a, b) => b.g - a.g || b.avg - a.avg).slice(0, n || 5);
}
function lgRateTop(L, n){
  return lgScorerList(L).filter(x => x.rn >= 5).sort((a, b) => b.avg - a.avg || b.g - a.g).slice(0, n || 5);
}
function lgMyScorerTop(L){
  return lgScorerList(L).filter(x => x.c === L.my).sort((a, b) => b.g - a.g || b.avg - a.avg)[0] || null;
}
function lgGoalScorer(club){
  const e = lgRoster(club);
  const pool = [];
  e.forEach(x => {
    const g = cupGrp(x.role);
    const base = g === 'FW' ? 6 : g === 'MF' ? 3 : g === 'DF' ? 1 : 0;
    for(let k = 0; k < base; k++) pool.push(x);
  });
  if(!pool.length) return e.length ? e[0].name : '';
  return pick(pool).name;
}
/* 한 라운드 결과를 득점·평점으로 누적한다 — 내 경기는 실제 득점자 이름을 그대로 쓴다 */
function lgAccrueRound(L, results, myMatch){
  (results || []).forEach(r => {
    [[r.h, r.gh, 0], [r.a, r.ga, 1]].forEach(pair => {
      const club = pair[0], goals = Math.max(0, Math.min(6, Math.round(+pair[1] || 0)));
      let names = null;
      if(r.mine && myMatch && Array.isArray(myMatch.goals)){
        const side = club === L.my ? 'me' : 'op';
        names = myMatch.goals.filter(g => g.side === side).map(g => g.name);
      }
      const tally = {};
      for(let i = 0; i < goals; i++){
        const nm = (names && names[i]) ? names[i] : lgGoalScorer(club);
        if(nm) tally[nm] = (tally[nm] || 0) + 1;
      }
      Object.keys(tally).forEach(nm => lgScorerAdd(L, club, nm, tally[nm], 7.1 + tally[nm] * 0.55 + rnd(0, 0.45)));
      /* 평점 표본 — 경기마다 클럽별 2명, OVR이 높을수록 평점도 높게 */
      const e = lgRoster(club);
      for(let i = 0; i < 2 && e.length; i++){
        const x = pick(e);
        const ovr = +x.ovr || 75;
        const clean = goals === 0 && cupGrp(x.role) === 'GK';
        lgScorerAdd(L, club, x.name, 0, clamp(6.0 + (ovr - 70) * 0.075 + rnd(-0.35, 0.65) + (goals > 0 ? 0.25 : 0) + (clean ? 0.8 : 0), 5.6, 9.0));
      }
    });
  });
}
function lgRaceHTML(L){
  const top = lgScorerTop(L, 5), mine = lgMyScorerTop(L);
  if(!top.length) return '<div class="tiny">리그 경기가 쌓이면 득점·평점 순위가 표시됩니다.</div>';
  const inTop = mine ? top.some(x => x.n === mine.n && x.c === mine.c) : false;
  const row = (x, i) => `<div class="scr ${x.c === L.my ? 'me' : ''}"><span class="rk">${i + 1}</span>
    <span class="nm">${esc(shortNm(x.n))}<i>${esc(x.c)}</i></span><b>${x.g}</b><span class="rt">${x.avg ? x.avg.toFixed(2) : '—'}</span></div>`;
  const rt = lgRateTop(L, 1)[0];
  return `<div class="scrbox"><div class="sch"><span>#</span><span>선수</span><span>골</span><span>평점</span></div>${top.map(row).join('')}</div>
    <div class="tiny" style="margin-top:5px">${mine && !inTop ? '우리 팀 1위 · ' + esc(shortNm(mine.n)) + ' ' + mine.g + '골' + (mine.avg ? ' · 평점 ' + mine.avg.toFixed(2) : '') : '우리 팀 1위 · ' + (mine ? esc(shortNm(mine.n)) + ' ' + mine.g + '골' : '아직 득점 없음')}</div>
    ${rt ? `<div class="tiny" style="margin-top:2px">평점왕 경쟁 1위 · ${esc(shortNm(rt.n))} ${rt.avg.toFixed(2)} (${esc(rt.c)})</div>` : ''}`;
}
function lgAwardHTML(L){
  const t = L.top, b = L.best, out = [];
  if(t) out.push(`<div class="awd ${t.c === L.my ? 'me' : ''}"><span class="ic">👟</span><div class="tx"><b>득점왕 ${esc(t.n)}</b><span>${esc(t.c)} · ${t.g}골${t.c === L.my ? ' · 보너스 +' + fmt(LG_TOP_COIN) + 'C' : ''}</span></div></div>`);
  if(b) out.push(`<div class="awd ${b.c === L.my ? 'me' : ''}"><span class="ic">⭐</span><div class="tx"><b>평점왕 ${esc(b.n)}</b><span>${esc(b.c)} · 평균 ${(+b.v || 0).toFixed(2)}${b.c === L.my ? ' · 보너스 +' + fmt(LG_RATE_COIN) + 'C' : ''}</span></div></div>`);
  return out.length ? out.join('') : '<div class="tiny">이번 시즌 득점·평점 기록이 없습니다.</div>';
}
/* ---------- 반환점 조커 (시즌 중 1회 단기 임대) ---------- */
function lgJokerHalf(L){ return Math.floor(((L && L.fx ? L.fx.length : 38)) / 2); }
function lgJokerReady(L){ return !!(L && !L.done && !L.joker && L.r >= lgJokerHalf(L)); }
function lgJokerOffer(L){
  if(!lgJokerReady(L)) return false;
  const xi = (OPP[L.my] || {}).xi || [];
  const used = new Set(xi.map(p => p[0]));
  P.filter(p => p[1] === L.my).forEach(p => used.add(p[0]));
  /* 그룹별로 가장 약한 슬롯을 확실히 개선하는 선수만 제안한다 */
  const weak = {};
  xi.forEach(p => {
    const g = cupGrp(p[1]), v = lgPlayerOvr(L.my, p[0], p[1]);
    if(weak[g] == null || v < weak[g]) weak[g] = v;
  });
  const pool = P.map((p, i) => i).filter(i => !used.has(P[i][0]));
  const base = lgOvr(L.my);
  const off = [];
  ['FW', 'MF', 'DF'].forEach(g => {
    const floor = (weak[g] != null ? weak[g] : 80) + 1;
    /* 클럽 전력에서 너무 벗어난 선수는 데려오지 않는다 — 고정 전력 감각 유지 */
    const ceil = Math.max(floor + 2, base + 6);
    const above = pool.filter(i => cupGrp(P[i][3]) === g && +P[i][4] >= floor && !off.some(x => x.name === P[i][0]));
    if(!above.length) return;
    const band = above.filter(i => +P[i][4] <= ceil);
    const use = band.length ? band.sort((a, b) => +P[b][4] - +P[a][4]).slice(0, 10)
      : above.sort((a, b) => +P[a][4] - +P[b][4]).slice(0, 10);
    const i = pick(use);
    off.push({name:P[i][0], role:P[i][3], club:P[i][1], ovr:+P[i][4]});
  });
  if(off.length < 3) return false;
  L.joker = {stage:'offer', at:Date.now(), off};
  return true;
}
function lgJokerPick(k){
  const L = S.league;
  if(!L || !L.joker || L.joker.stage !== 'offer') return;
  const c = (L.joker.off || [])[k];
  if(!c) return;
  const roster = lgRoster(L.my), g = cupGrp(c.role);
  let idx = -1, low = 999;
  roster.forEach((x, i) => { if(cupGrp(x.role) === g && x.ovr < low){ low = x.ovr; idx = i; } });
  if(idx < 0 || c.ovr <= low){
    let low2 = 999, idx2 = -1;
    roster.forEach((x, i) => { if(x.ovr < low2){ low2 = x.ovr; idx2 = i; } });
    idx = idx2; low = low2;
  }
  const swap = idx >= 0 && c.ovr > low;
  const out = swap ? roster[idx] : null;
  L.joker = {stage:'picked', at:Date.now(), name:c.name, role:c.role, ovr:c.ovr, club:c.club,
    slot: swap ? idx : -1, outName: out ? out.name : '', outRole: out ? out.role : '', outOvr: out ? out.ovr : 0};
  save(); render();
  toast('🃏 ' + c.name + ' 합류 · ' + (out ? out.name + ' 자리 대체' : '베스트 XI은 그대로'));
}
function lgJokerSkip(){
  const L = S.league;
  if(!L || !L.joker || L.joker.stage !== 'offer') return;
  L.joker = {stage:'skipped', at:Date.now()};
  save(); render(); toast('반환점 조커 없이 시즌을 이어갑니다');
}
function lgJokerHTML(L){
  const j = L && L.joker;
  if(!j) return '';
  if(j.stage === 'offer'){
    return `<div class="sect joker"><div class="sect-h"><div class="eyebrow g">🃏 반환점 조커</div><div class="tiny">시즌 중 1회</div></div>
      <div class="tiny" style="margin-bottom:7px">반환점 도달! 현역 3명 중 한 명을 시즌 종료까지 단기 임대합니다. 고른 선수는 그 포지션에서 가장 약한 베스트 XI 자리를 대신 뜁니다. 클럽 고정 전력·코인 버프 원칙은 그대로입니다.</div>
      <div class="jrow">${(j.off || []).map((c, i) => `<button class="jcand" data-act="lg-joker-pick" data-k="${i}">
        <span class="ps">${esc(c.role)}</span><span class="nm">${esc(c.name)}<i>${esc(c.club)}</i></span><b>${c.ovr}</b><span class="go">영입</span></button>`).join('')}</div>
      <button class="chip" style="margin-top:7px" data-act="lg-joker-skip">이번엔 영입 없이 진행</button>
    </div>`;
  }
  if(j.stage === 'picked'){
    return `<div class="sect"><div class="jkb"><span class="ic">🃏</span><div class="tx"><b>${esc(j.name)} · ${esc(j.role)} OVR ${j.ovr}</b>
      <span>${esc(j.club)}에서 합류 · ${j.outName ? esc(j.outName) + ' 자리 대체' : '베스트 XI은 그대로'}${j.outOvr ? ' (' + j.outOvr + ' → ' + j.ovr + ')' : ''} · 시즌 종료까지</span></div></div></div>`;
  }
  return '';
}

function lgAllClubs(){ return Object.keys(OPP).filter(c => OPP[c] && OPP[c].l && LG[OPP[c].l]); }
function lgClubsOf(lg){ return Object.keys(OPP).filter(c => OPP[c] && OPP[c].l === lg); }
function lgOvr(club){ const o = OPP[club]; return o ? clamp(Math.round(+o.o || 80), 60, 99) : 80; }
let LG_TAC_MAP = null;
function lgTacMap(){
  if(!LG_TAC_MAP){
    LG_TAC_MAP = {};
    lgAllClubs().forEach((c, i) => { LG_TAC_MAP[c] = CUP_TAC_KEYS[(i * 5 + 3) % CUP_TAC_KEYS.length]; });
  }
  return LG_TAC_MAP;
}
function lgTacOf(club){ return lgTacMap()[club] || 'balance'; }
function lgAvgOvr(lg){ const a = lgClubsOf(lg); return a.length ? a.reduce((s, c) => s + lgOvr(c), 0) / a.length : 80; }
function lgIsUnderdog(club){
  const o = OPP[club]; if(!o || !o.l) return false;
  return lgOvr(club) <= lgAvgOvr(o.l) - 2.2;
}
function lgPlayerOvr(club, name, role){
  let i = P.findIndex(p => p[0] === name && p[1] === club);
  if(i < 0) i = P.findIndex(p => p[0] === name);
  if(i >= 0) return clamp(Math.round(+P[i][4] || 70), 55, 99);
  const off = {GK:-1, SW:-2, CB:-3, LB:-2, RB:-2, RWB:-2, LWB:-2, DM:-1, CM:1, AM:2, RM:1, LM:1, LW:2, RW:2, RF:2, LF:2, CF:3, ST:3, SS:2}[role];
  return clamp(lgOvr(club) + (off == null ? 0 : off), 58, 99);
}
/* 클럽 현역 베스트 11 — 모자란 자리는 같은 클럽 → 같은 리그 풀에서 채운다 */
function lgRoster(club){
  const o = OPP[club]; if(!o) return [];
  const out = (o.xi || []).slice(0, 11).map(p => ({name:p[0], role:p[1], ovr:lgPlayerOvr(club, p[0], p[1])}));
  if(out.length >= 11) return lgApplyJoker(club, out);
  const used = new Set(out.map(x => x.name));
  const add = cand => {
    if(out.length >= 11 || used.has(cand[0])) return;
    used.add(cand[0]);
    out.push({name:cand[0], role:cand[3], ovr:clamp(Math.round(+cand[4] || 70), 55, 99)});
  };
  P.filter(p => p[1] === club).sort((a, b) => b[4] - a[4]).forEach(add);
  if(out.length < 11 && o.l) P.filter(p => p[2] === o.l).sort((a, b) => b[4] - a[4]).forEach(add);
  return lgApplyJoker(club, out);
}
/* 반환점 조커가 있으면 그 자리를 시즌 내내 대신 뛴다 */
function lgCurLeague(){ try{ return S.league || null; }catch(e){ return null; } }
function lgApplyJoker(club, out){
  const L = lgCurLeague(), j = L && L.joker;
  if(!j || j.stage !== 'picked' || L.my !== club || !out.length) return out;
  if(j.slot == null || j.slot < 0) return out;
  const k = j.slot < out.length ? j.slot : out.length - 1;
  out[k] = {name:j.name, role:j.role, ovr:j.ovr, joker:true};
  return out;
}
function lgJokerDelta(club){
  const L = lgCurLeague(), j = L && L.joker;
  if(!j || j.stage !== 'picked' || L.my !== club) return 0;
  return Math.max(0, Math.round((+j.ovr || 0) - (+j.outOvr || 0)));
}
function lgSide(club){
  const e = lgRoster(club), avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 60;
  const gk = e.filter(x => cupGrp(x.role) === 'GK')[0];
  const df = e.filter(x => cupGrp(x.role) === 'DF'), mf = e.filter(x => cupGrp(x.role) === 'MF'), fw = e.filter(x => cupGrp(x.role) === 'FW');
  return {ovr:lgOvr(club) + lgJokerDelta(club), att:avg(fw.map(x => x.ovr)), mid:avg(mf.map(x => x.ovr)),
    def:avg(df.map(x => x.ovr)) * 0.78 + (gk ? gk.ovr : 60) * 0.22, cond:0, entries:e, syn:0, name:club};
}
function lgOpp(club, round){
  const s = lgSide(club), o = OPP[club] || {};
  return {club, league:o.l || 'EPL', base:lgOvr(club), att:s.att + 0.6, mid:s.mid, def:s.def + 0.4,
    xi:(o.xi || []).map(p => [p[0], p[1]]), cupTac:lgTacOf(club),
    ai:aiProfile(clamp(Math.round((lgOvr(club) - 78) * 1.15), 0, 9))};
}
/* 같은 리그 클럽들로 라운드로빈 · 8팀 이하는 더블 라운드로빈 */
function lgFixtures(clubs){
  const list = clubs.slice();
  if(list.length % 2) list.push(null);
  const n = list.length, out = [], rot = list.slice(1);
  for(let r = 0; r < n - 1; r++){
    const line = [list[0]].concat(rot), pairs = [];
    for(let i = 0; i < n / 2; i++){
      const a = line[i], b = line[n - 1 - i];
      if(a && b) pairs.push(r % 2 ? [b, a] : [a, b]);
    }
    if(pairs.length) out.push(pairs);
    rot.unshift(rot.pop());
  }
  /* 홈·어웨이 더블 라운드로빈 — 20팀 38라운드 · 18팀 34라운드 */
  return out.concat(out.map(rd => rd.map(t => [t[1], t[0]])));
}
function lgTableInit(clubs){ const t = {}; clubs.forEach(c => { t[c] = {p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0}; }); return t; }
function lgApply(L, h, a, gh, ga){
  const T = L.table || (L.table = lgTableInit(lgClubsOf(L.lg)));
  if(!T[h] || !T[a]) return;
  T[h].p += 1; T[a].p += 1;
  T[h].gf += gh; T[h].ga += ga; T[a].gf += ga; T[a].ga += gh;
  if(gh > ga){ T[h].w += 1; T[a].l += 1; T[h].pts += 3; }
  else if(gh < ga){ T[a].w += 1; T[h].l += 1; T[a].pts += 3; }
  else { T[h].d += 1; T[a].d += 1; T[h].pts += 1; T[a].pts += 1; }
}
function lgStandings(L){
  const T = L.table || {}, rows = lgClubsOf(L.lg).map(c => {
    const s = T[c] || {p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0};
    return {club:c, p:s.p, w:s.w, d:s.d, l:s.l, gf:s.gf, ga:s.ga, gd:s.gf - s.ga, pts:s.pts};
  });
  rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.club.localeCompare(b.club));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
function lgStarted(L){ return lgStandings(L).some(x => x.p > 0); }
function lgPos(L){
  const r = lgStandings(L).filter(x => x.club === L.my)[0];
  return r ? r.rank : 0;
}
function lgMyTie(L){
  const rd = L.fx && L.fx[L.r]; if(!rd) return null;
  return rd.filter(t => t[0] === L.my || t[1] === L.my)[0] || null;
}
function lgRosterTop(club){
  return lgRoster(club).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 3).map(x => shortNm(x.name) + ' ' + x.ovr).join(' · ');
}
function lgSimScore(h, a){
  const d = (lgOvr(h) - lgOvr(a)) * 0.5 + 1.1;
  const gh = Math.max(0, Math.round(1.25 + d * 0.17 + rnd(-0.85, 0.85)));
  const ga = Math.max(0, Math.round(1.25 - d * 0.17 + rnd(-0.85, 0.85)));
  return [gh, ga];
}
function lgOffer(){
  S.leagueSel = {offers:cupShuffle(lgAllClubs()).slice(0, 3), rerolled:false};
  U.lgSel = S.leagueSel; U.match = null; U.tab = 'cup'; U.contest = 'league';
  save(); render();
}
/* 티켓 1장 · 시즌당 1회 팀 리롤 (무료 리롤 없음) */
function lgReroll(){
  const sel = S.leagueSel || U.lgSel;
  if(!sel){ toast('팀 선택 화면이 아닙니다'); return; }
  if(sel.rerolled){ toast('이번 시즌 리롤은 이미 사용했습니다'); return; }
  if(ticketCount() < CUP_REROLL_TICKET){ toast('패스 티켓이 ' + (CUP_REROLL_TICKET - ticketCount()) + '장 부족합니다'); return; }
  spendTickets(CUP_REROLL_TICKET);
  const cur = sel.offers.slice();
  let next = cur;
  for(let i = 0; i < 20 && next.every(c => cur.indexOf(c) >= 0); i++) next = cupShuffle(lgAllClubs()).slice(0, 3);
  sel.offers = next; sel.rerolled = true;
  S.leagueSel = sel; U.lgSel = sel;
  save(); render();
  toast('🎫' + CUP_REROLL_TICKET + ' · 다른 3팀으로 교체 · 시즌당 1회 한정');
}
function lgStart(club){
  if(!OPP[club] || !OPP[club].l) return;
  const lg = OPP[club].l, clubs = lgClubsOf(lg), fx = lgFixtures(clubs);
  S.league = {lg, my:club, fx, res:fx.map(() => []), table:lgTableInit(clubs), r:0,
    done:false, pos:0, champ:'', coins:0, at:Date.now(), scorers:{}, joker:null, top:null, best:null};
  S.leagueSel = null; U.lgSel = null; S.leagueCare = 0;
  U.match = null; U.tab = 'cup'; U.contest = 'league';
  save(); render();
  toast('🏁 ' + (LG[lg] || lg) + ' 개막 · ' + club + ' · ' + fx.length + '라운드');
}
function lgPlay(){
  const L = S.league; if(!L || L.done) return;
  const t = lgMyTie(L); if(!t) return;
  const home = t[0] === L.my, oppClub = home ? t[1] : t[0];
  const side = lgSide(L.my);
  startMatch('league', lgOpp(oppClub, L.r), {team:side, myName:L.my, roster:side.entries,
    round:'R' + (L.r + 1) + ' ' + (home ? '홈' : '원정'), big:lgBigMatch(L, oppClub)});
}
function lgCare(kind){
  const L = S.league;
  if(!L || L.done){ toast('진행 중인 시즌이 없습니다'); return; }
  const care = clamp(Math.round(+S.leagueCare || 0), 0, 2);
  const v = kind === 'max' ? 2 : 1;
  if(care >= v){ toast(care >= 2 ? '이미 최상 컨디션입니다' : '이미 컨디션을 올렸습니다'); return; }
  const cost = kind === 'max' ? CARE.max.cost : CARE.lift.cost;
  if(S.coins < cost){ toast('코인이 ' + fmt(cost - S.coins) + ' 부족합니다'); return; }
  S.coins -= cost; S.leagueCare = v; save(); paintHud(); render();
  toast('컨디션 ' + (v >= 2 ? '최상' : '좋음') + ' · 이번 경기 한정');
}
function lgRestRound(){
  const L = S.league; if(!L || L.done){ render(); return; }
  if(lgMyTie(L)){ toast('이번 라운드에 내 경기가 있습니다'); return; }
  L.res[L.r] = L.res[L.r] || [];
  L.fx[L.r].forEach(f => {
    const [gh, ga] = lgSimScore(f[0], f[1]);
    lgApply(L, f[0], f[1], gh, ga);
    L.res[L.r].push({h:f[0], a:f[1], gh, ga});
  });
  lgAccrueRound(L, L.res[L.r], null);
  L.r += 1;
  lgJokerOffer(L);
  if(L.r >= L.fx.length) lgFinishSeason(L, null);
  save(); render();
}
function lgFinishSeason(L, M){
  L.done = true;
  const rows = lgStandings(L), mine = rows.filter(r => r.club === L.my)[0];
  const pos = mine ? mine.rank : rows.length;
  L.pos = pos; L.champ = rows[0] ? rows[0].club : '';
  L.r = Math.max(0, L.fx.length - 1);
  /* 시즌 결산 — 득점왕·평점왕 */
  const gTop = lgScorerTop(L, 1)[0] || null;
  const rTop = lgRateTop(L, 1)[0] || null;
  L.top = gTop ? {n:gTop.n, c:gTop.c, g:gTop.g} : null;
  L.best = rTop ? {n:rTop.n, c:rTop.c, v:Math.round(rTop.avg * 100) / 100} : null;
  let award = 0;
  const aw = [];
  if(gTop && gTop.c === L.my){ award += LG_TOP_COIN; aw.push({at:Date.now(), k:'g', n:gTop.n, c:gTop.c, v:gTop.g, coins:LG_TOP_COIN, lg:L.lg}); M && (M.awardTop = true); }
  if(rTop && rTop.c === L.my){ award += LG_RATE_COIN; aw.push({at:Date.now(), k:'r', n:rTop.n, c:rTop.c, v:Math.round(rTop.avg * 100) / 100, coins:LG_RATE_COIN, lg:L.lg}); M && (M.awardRate = true); }
  if(award){ S.coins += award; L.coins = (L.coins || 0) + award; if(M) M.awardCoins = award; }
  if(aw.length) S.leagueAwards = aw.concat(S.leagueAwards || []).slice(0, 30);
  const bonus = LG_SEASON_COINS[pos - 1] || 0;
  if(bonus){ S.coins += bonus; L.coins = (L.coins || 0) + bonus; }
  if(M) M.titleBonus = bonus;
  if(pos === 1 && mine){
    const rec = {at:Date.now(), lg:L.lg, lgn:LG[L.lg] || L.lg, club:L.my, ovr:lgOvr(L.my),
      pts:mine.pts, w:mine.w, d:mine.d, l:mine.l, gf:mine.gf, ga:mine.ga, rounds:L.fx.length,
      under:lgIsUnderdog(L.my), coins:L.coins || 0,
      top:L.top, best:L.best};
    S.leagueCups = [rec].concat(S.leagueCups || []).slice(0, 40);
    S.leagueClubs = Object.assign({}, S.leagueClubs || {});
    S.leagueClubs[L.my] = (S.leagueClubs[L.my] || 0) + 1;
    if(M) M.champion = true;
  }
}
function finishLeagueMatch(M){
  const L = S.league;
  if(!L || L.done){ U.match = null; U.tab = 'cup'; U.contest = 'league'; render(); return; }
  const t = lgMyTie(L);
  if(!t){ U.match = null; U.tab = 'cup'; U.contest = 'league'; render(); return; }
  const home = t[0] === L.my, oppClub = home ? t[1] : t[0];
  const big = lgBigMatch(L, oppClub);
  if(big) M.big = big;
  const res = M.me > M.op ? 'w' : M.me === M.op ? 'd' : 'l';
  M.res = res; M.home = home; M.mvp = pickMVP(M); M.roundNo = L.r + 1;
  M.roundName = 'R' + (L.r + 1) + (home ? ' 홈' : ' 원정');
  const gh = home ? M.me : M.op, ga = home ? M.op : M.me;
  L.res[L.r] = [{h:t[0], a:t[1], gh, ga, mine:true}];
  lgApply(L, t[0], t[1], gh, ga);
  L.fx[L.r].forEach(f => {
    if(f[0] === t[0] && f[1] === t[1]) return;
    const [x, y] = lgSimScore(f[0], f[1]);
    lgApply(L, f[0], f[1], x, y);
    L.res[L.r].push({h:f[0], a:f[1], gh:x, ga:y});
  });
  M.roundResults = L.res[L.r].slice();
  lgAccrueRound(L, M.roundResults, M);
  const gd = Math.abs(M.me - M.op);
  let coins = res === 'w' ? LG_ROUND_COINS.w + gd * 20 : res === 'd' ? LG_ROUND_COINS.d : LG_ROUND_COINS.l;
  if(big && res === 'w'){ M.bigBonus = LG_BIG_COIN; coins += LG_BIG_COIN; }
  M.coins = coins;
  S.coins += coins; L.coins = (L.coins || 0) + coins;
  S.leagueCare = 0;
  if(!S.leagueRec) S.leagueRec = {n:0, w:0, d:0, l:0};
  S.leagueRec.n += 1; S.leagueRec[res] = (S.leagueRec[res] || 0) + 1;
  ensureQuests(); questAdd('game', 1); questAdd('g11', 1);
  if(res === 'w') questAdd('win', 1);
  L.r += 1;
  lgJokerOffer(L);
  if(L.r >= L.fx.length) lgFinishSeason(L, M);
  M.pos = lgPos(L);
  save(); paintHud();
  renderLeagueResult(M);
}
function lgTableHTML(L, limit){
  const rows = lgStandings(L), me = rows.filter(r => r.club === L.my)[0];
  let list = rows;
  if(limit && rows.length > limit){
    list = rows.slice(0, limit);
    if(me && me.rank > limit) list = list.concat([me]);
  }
  const row = r => {
    const gd = r.gd > 0 ? '+' + r.gd : String(r.gd);
    return `<div class="str ${r.club === L.my ? 'me' : ''} ${r.rank === 1 ? 'top' : ''}"><span class="rk">${r.rank}</span><span class="nm">${esc(r.club)}</span><span>${r.p}</span><span>${r.w}</span><span>${r.d}</span><span>${r.l}</span><span class="${r.gd > 0 ? 'gdp' : r.gd < 0 ? 'gdn' : ''}">${gd}</span><b>${r.pts}</b></div>`;
  };
  return `<div class="stbl"><div class="sth"><span>#</span><span>팀</span><span>경기</span><span>승</span><span>무</span><span>패</span><span>득실</span><span>승점</span></div>${list.map(row).join('')}</div>`;
}
function lgRoundRows(list){
  return (list || []).map(x => `<div class="opp ${x.mine ? 'mine' : ''}"><div class="cr">${x.gh}:${x.ga}</div><div class="nm">${esc(x.h)}<span class="tiny" style="margin-left:4px">vs</span> ${esc(x.a)}</div>${x.mine ? '<span class="tag lime">내 경기</span>' : ''}</div>`).join('');
}
function lgTrophyRow(r){
  const aw = [];
  if(r.top) aw.push('👟 ' + esc(shortNm(r.top.n)) + ' ' + r.top.g + '골');
  if(r.best) aw.push('⭐ ' + esc(shortNm(r.best.n)) + ' ' + (+r.best.v).toFixed(2));
  return `<div class="trop"><div class="ic">${r.under ? '🐴' : '🏆'}</div><div class="tx">
    <b>${esc(r.club)}${r.under ? ' · 언더독' : ''}</b>
    <span>${esc(r.lgn || LG[r.lg] || '')} 우승 · ${r.pts}점 ${r.w}-${r.d}-${r.l}${r.rounds ? ' · ' + r.rounds + '라운드' : ''}</span>
    <small>${kstLabel(r.at)} · OVR ${r.ovr} · +${fmt(r.coins || 0)}C${aw.length ? ' · ' + aw.join(' · ') : ''}</small>
  </div></div>`;
}
function lgClubRows(){
  const m = S.leagueClubs || {};
  const ks = Object.keys(m).filter(k => OPP[k] && m[k] > 0).sort((a, b) => m[b] - m[a]);
  if(!ks.length) return '<div class="tiny">아직 리그 우승 기록이 없습니다. 26/27 리그에 도전해 보세요.</div>';
  return `<div class="path">${ks.map(k => `<div class="pr now"><span class="rd">${m[k]}회</span><span class="op">${esc(k)}</span><span class="sc">${esc(LG[OPP[k].l] || '')}${lgIsUnderdog(k) ? ' 🐴' : ''}</span></div>`).join('')}</div>`;
}
function openLeagueHistory(){
  const cups = S.leagueCups || [], rec = S.leagueRec || {n:0, w:0, d:0, l:0};
  const under = cups.filter(x => x.under).length, aw = S.leagueAwards || [];
  $('#sheet').innerHTML = `<div class="grab"></div>
    <div class="eyebrow">26/27 LEAGUE · TROPHY</div>
    <div style="font-size:16px;font-weight:900;letter-spacing:-.03em;margin-top:3px">리그 우승 ${cups.length}회${under ? ' · 언더독 ' + under + '회 🐴' : ''}</div>
    <div class="muted" style="margin-top:5px">시즌 ${rec.n}회 · ${rec.w}승 ${rec.d}무 ${rec.l}패. 5대 리그 실제 순위전 기록입니다.</div>
    <div class="stack" style="margin-top:12px">${cups.length ? cups.map(lgTrophyRow).join('') : '<div class="tiny">아직 리그 우승 기록이 없습니다. 26/27 리그에 도전해 보세요.</div>'}</div>
    <div class="sect-h" style="margin-top:14px"><div class="eyebrow g">시즌 어워드</div><div class="tiny">${aw.length}회 수상</div></div>
    <div class="stack">${aw.length ? aw.map(a => `<div class="awd me"><span class="ic">${a.k === 'g' ? '👟' : '⭐'}</span><div class="tx">
      <b>${a.k === 'g' ? '득점왕' : '평점왕'} ${esc(a.n)}</b>
      <span>${esc(a.c)} · ${a.k === 'g' ? a.v + '골' : '평균 ' + (+a.v).toFixed(2)} · +${fmt(a.coins)}C</span>
      <small>${kstLabel(a.at)} · ${esc(LG[a.lg] || a.lg || '')}</small></div></div>`).join('') : '<div class="tiny">아직 득점왕·평점왕 수상 기록이 없습니다.</div>'}</div>
    <div class="sect-h" style="margin-top:14px"><div class="eyebrow g">클럽별 우승</div></div>
    ${lgClubRows()}
    <button class="btn dark wide" style="margin-top:12px" data-act="close-sheet">닫기</button>`;
  $('#sheetHost').classList.add('on');
}
function lgIntroHTML(){
  const cups = S.leagueCups || [], rec = S.leagueRec || {n:0, w:0, d:0, l:0};
  const under = cups.filter(x => x.under).length, total = lgAllClubs().length;
  return `<div class="eyebrow">26/27 LEAGUE · 5대 리그 순위전</div>
    <h2 class="title">⚽ 26/27 리그</h2>
    <section class="hero" style="margin-top:10px">
      <div class="eyebrow">REAL LEAGUE SEASON</div>
      <h2>26/27 클럽으로<br><em>리그 우승</em></h2>
      <p>5대 리그 1부 ${total}팀 중 랜덤 3팀을 제안받아 한 클럽을 고릅니다. 그 클럽의 현역 베스트 11로 실제 리그 일정 그대로 — EPL·라리가·세리에A는 20팀 38라운드, 분데스리가·리그1은 18팀 34라운드 — 홈·어웨이 더블 라운드로빈 순위전을 치릅니다. 같은 라운드의 다른 경기도 같이 돌아가 순위표가 매 라운드 갱신됩니다.</p>
      <div class="facts"><span class="fact">5대 리그 <b>${total}팀</b></span><span class="fact">한 시즌 <b>34~38경기</b></span><span class="fact">리그 우승 <b>2,600C</b></span></div>
    </section>
    <div class="sect stack">
      <button class="btn primary wide" data-act="lg-open">시즌 시작 · 랜덤 3팀 보기</button>
      <div class="tiny" style="text-align:center">고른 클럽은 시즌 내내 그대로 · 코인 버프 없이 전술로만</div>
    </div>
    <div class="sect"><div class="grid2">
      <div class="gcard"><span>리그 우승</span><b>${cups.length}</b><small>${cups.length ? '트로피 ' + cups.length + '개' : '도전 기록 없음'}</small></div>
      <div class="gcard"><span>시즌 전적</span><b>${rec.w}-${rec.d}-${rec.l}</b><small>${rec.n}경기 · 무승부 포함</small></div>
    </div>${under ? `<div class="tiny" style="margin-top:7px">🐴 언더독 우승 ${under}회 · 리그 평균보다 낮은 전력으로 정상</div>` : ''}</div>
    <div class="sect"><div class="sect-h"><div class="eyebrow g">클럽별 우승</div><button class="chip" data-act="lg-history">전체 기록</button></div>${lgClubRows()}</div>
    ${cups.length ? `<div class="sect"><div class="sect-h"><div class="eyebrow g">RECENT TROPHY</div><div class="tiny">${kstLabel(cups[0].at)}</div></div>${lgTrophyRow(cups[0])}</div>` : ''}`;
}
function lgPickHTML(){
  const sel = S.leagueSel || U.lgSel;
  const cands = sel && Array.isArray(sel.offers) ? sel.offers.filter(c => !!OPP[c]) : [];
  if(cands.length !== 3){ S.leagueSel = null; U.lgSel = null; return lgIntroHTML(); }
  U.lgSel = sel;
  return `<div class="eyebrow">26/27 LEAGUE · 팀 선택</div>
    <h2 class="title">시즌을 뛸 클럽을 고르세요</h2>
    <div class="tiny" style="margin-top:3px">5대 리그 1부 클럽 중 랜덤 3팀입니다. 클럽 전력은 고정 — 전술·상성·컨디션으로만 이깁니다.</div>
    <div class="pick3" style="margin-top:11px">
      ${cands.map(c => {
        const tac = CUP_TACTS[lgTacOf(c)];
        return `<div class="cupick">
          <div class="hd"><i>${esc(LG[OPP[c].l] || OPP[c].l)}</i><span class="ov">${lgOvr(c)}</span></div>
          <div class="tt">${esc(c)}</div>
          <div class="st">${esc(lgRosterTop(c))}</div>
          <div class="stars"><span class="tag">${esc(tac.ic + ' ' + tac.name)}</span>${lgIsUnderdog(c) ? '<span class="tag amber">🐴 언더독</span>' : '<span class="tag lime">우승 후보</span>'}</div>
          <button class="go" data-act="lg-pick" data-c="${esc(c)}">시작 →</button>
        </div>`;
      }).join('')}
    </div>
    <div class="sect stack">
      ${sel.rerolled
        ? `<button class="btn dark wide" disabled>🎫 리롤 사용 완료 · 시즌당 1회</button>`
        : `<button class="btn dark wide" data-act="lg-reroll" style="${ticketCount() < CUP_REROLL_TICKET ? 'opacity:.55' : ''}">🎫 ${CUP_REROLL_TICKET}장 · 다른 3팀 보기 (시즌당 1회)</button>`}
      <div class="tiny" style="text-align:center">티켓이 없으면 지금 3팀 중 하나를 골라야 합니다 · 무료 리롤 없음</div>
      <button class="btn dark wide" data-act="lg-cancel">돌아가기</button>
    </div>`;
}
function lgSeasonHTML(){
  const L = S.league, my = L.my, t = lgMyTie(L);
  const pos = lgPos(L), N = L.fx.length;
  const home = t ? t[0] === my : false, oppClub = t ? (home ? t[1] : t[0]) : null;
  const side = lgSide(my);
  const care = clamp(Math.round(+S.leagueCare || 0), 0, 2);
  const last = L.r > 0 ? (L.res[L.r - 1] || []) : [];
  const big = t ? lgBigMatch(L, oppClub) : null;
  const magic = lgMagic(L);
  return `<div class="eyebrow">26/27 ${esc(LG[L.lg] || L.lg)} · R${L.r + 1}/${N}</div>
    <h2 class="title">${esc(my)} <span class="mono" style="font-size:13px;color:var(--dim)">${lgStarted(L) ? pos + '위' : '개막'}</span></h2>
    <div class="tiny" style="margin-top:3px">OVR ${lgOvr(my) + lgJokerDelta(my)} · 고정 전력 · 코인 버프 없음${lgIsUnderdog(my) ? ' · 🐴 언더독 도전' : ''}${L.joker && L.joker.stage === 'picked' ? ' · 🃏 조커 합류' : ''}</div>
    ${magic ? (magic.kind === 'champ'
      ? `<div class="magic champ">🏆 우승 확정! · 남은 경기 결과와 상관없이 정상입니다</div>`
      : magic.kind === 'magic'
        ? `<div class="magic">🏁 우승까지 매직넘버 <b>승점 ${magic.n}</b> · ${magic.remaining}경기 남았습니다</div>`
        : `<div class="magic chase">🏁 1위 ${esc(magic.leader)}${josa(magic.leader, '과', '와')} 승점 <b>${magic.gap}</b> 차 · ${magic.remaining}경기 남았습니다</div>`) : ''}
    ${lgJokerHTML(L)}
    ${t ? `<div class="cupvs" style="margin-top:10px">
      <div class="between"><span class="eyebrow">R${L.r + 1} · ${home ? '홈' : '원정'}</span><span class="tag amber">OVR ${lgOvr(oppClub)}</span></div>
      <div class="ttl"><i>${esc(LG[OPP[oppClub].l] || '')}</i>${esc(oppClub)}</div>
      <div class="st">${esc(lgRosterTop(oppClub))}</div>
      ${big ? `<div class="bigm">🔥 빅매치 · ${esc(big.tag)} · 승리 보너스 +${fmt(LG_BIG_COIN)}C</div>` : ''}
      <div class="between" style="margin-top:10px"><span class="eyebrow g">내 전술</span>
        <span class="tiny">하프타임 변경 가능</span></div>
      ${cupTacLineHTML(lgTacOf(oppClub))}
      <div class="tacbar" style="margin-top:7px">${tacBarHTML(true)}</div>
      <div class="tiny" style="margin-top:6px">${tacHintHTML(lgTacOf(oppClub))}</div>
      <div class="row" style="gap:6px;margin-top:9px">
        <button class="chip ${care >= 1 ? 'on' : ''}" data-act="lg-care" data-k="lift">⚡ 컨디션↑ ${fmt(CARE.lift.cost)}</button>
        <button class="chip ${care >= 2 ? 'on' : ''}" data-act="lg-care" data-k="max">🔥 최상 ${fmt(CARE.max.cost)}</button>
      </div>
      <button class="btn primary wide" style="margin-top:8px" data-act="lg-play">R${L.r + 1} ${home ? '홈' : '원정'} 경기 시작 →</button>
    </div>`
    : `<div class="card" style="padding:12px;margin-top:10px">
        <div class="between"><span class="eyebrow">R${L.r + 1} · 휴식</span><span class="tag">이번 라운드 부전</span></div>
        <div class="tiny" style="margin-top:6px">이번 라운드는 다른 팀 경기만 진행됩니다. 순위표를 확인하고 넘어가세요.</div>
        <button class="btn primary wide" style="margin-top:9px" data-act="lg-rest">라운드 넘기기 →</button>
      </div>`}
    <div class="sect">
      <div class="sect-h"><div class="eyebrow g">리그 순위표</div><div class="tiny">${esc(LG[L.lg] || '')} · ${N}라운드</div></div>
      ${lgTableHTML(L)}
      <div class="tiny" style="margin-top:6px">승점 → 득실 → 다득점 순. 시즌 종료 1위가 리그 우승입니다.</div>
    </div>
    ${last.length ? `<div class="sect"><div class="sect-h"><div class="eyebrow g">지난 라운드 결과</div><div class="tiny">R${L.r}</div></div><div class="opps">${lgRoundRows(last)}</div></div>` : ''}
    <div class="sect"><div class="sect-h"><div class="eyebrow g">득점왕 레이스</div><div class="tiny">리그 전체 TOP 5</div></div>
      ${lgRaceHTML(L)}
    </div>
    <div class="sect"><div class="sect-h"><div class="eyebrow g">내 베스트 11</div><div class="tiny">OVR ${lgOvr(my) + lgJokerDelta(my)}</div></div>
      <div class="xi">${side.entries.map(x => `<div class="xr"><span class="ps">${esc(x.role)}</span><span class="nm">${x.joker ? '<span style="color:var(--amber)">🃏</span> ' : ''}${esc(x.name)}</span><b>${x.ovr}</b></div>`).join('')}</div>
    </div>
    <div class="sect"><button class="btn dark wide" data-act="lg-abandon">시즌 중도 포기</button></div>`;
}
function lgDoneHTML(){
  const L = S.league;
  if(!L || !OPP[L.my]){ S.league = null; save(); return lgIntroHTML(); }
  const rows = lgStandings(L), pos = lgPos(L), champ = rows[0] || null;
  const champMe = pos === 1, under = lgIsUnderdog(L.my), cups = S.leagueCups || [];
  return `<div class="eyebrow">26/27 ${esc(LG[L.lg] || L.lg)} · 시즌 종료</div>
    <h2 class="title">⚽ ${esc(L.my)}</h2>
    <div style="margin-top:10px" class="${champMe ? 'cuptro' : 'cupcard'}">
      ${champMe ? `<div class="ic">🏆</div><div class="tx"><b>${esc(L.my)} 리그 우승${under ? ' 🐴' : ''}</b>
        <span>${esc(LG[L.lg] || '')} ${champ.pts}점 · ${champ.w}승 ${champ.d}무 ${champ.l}패</span>
        <small>리그 우승 ${cups.length}회${under ? ' · 언더독 우승' : ''} · 보상 +${fmt(L.coins || 0)}C</small></div>`
      : `<div class="lc">🏁</div><div class="tx"><b>${esc(L.my)} · ${pos}위 마감</b>
        <span>우승 ${esc(champ ? champ.club : '—')}${champ ? ' (' + champ.pts + '점)' : ''} · 보상 +${fmt(L.coins || 0)}C</span></div>`}
    </div>
    <div class="sect"><div class="sect-h"><div class="eyebrow g">최종 순위표</div><div class="tiny">${esc(LG[L.lg] || '')}</div></div>${lgTableHTML(L)}</div>
    <div class="sect"><div class="sect-h"><div class="eyebrow g">시즌 어워드</div><div class="tiny">득점왕 · 평점왕</div></div>
      <div class="stack">${lgAwardHTML(L)}</div></div>
    <div class="sect"><div class="sect-h"><div class="eyebrow g">득점왕 레이스 최종</div><div class="tiny">TOP 5</div></div>
      ${lgRaceHTML(L)}</div>
    <div class="sect stack">
      <button class="btn primary wide" data-act="lg-new">새 시즌 시작</button>
      <div class="row" style="gap:6px">
        <button class="btn dark sm" style="flex:1" data-act="lg-history">🏆 리그 기록</button>
        <button class="btn dark sm" style="flex:1" data-act="go-stadium">경기장으로</button>
      </div>
    </div>`;
}
function leagueHTML(){
  const L = S.league;
  if(!L) return (U.lgSel || S.leagueSel) ? lgPickHTML() : lgIntroHTML();
  if(L.done) return lgDoneHTML();
  return lgSeasonHTML();
}
function renderLeagueResult(M){
  const L = S.league;
  if(!L){ U.match = null; U.tab = 'cup'; U.contest = 'league'; render(); return; }
  const win = M.res === 'w', draw = M.res === 'd', champMe = !!M.champion;
  const pos = lgPos(L), rows = lgStandings(L);
  const label = champMe ? '우승' : win ? '승리' : draw ? '무승부' : '패배';
  const cls = champMe ? 'amber' : win ? 'lime' : draw ? 'sky' : 'red';
  const title = champMe ? '리그 정상' : (L.done ? L.pos + '위 마감' : 'R' + (M.roundNo || L.r) + ' 종료 · ' + pos + '위');
  $('#main').innerHTML = `
    <div class="result">
      <div class="rb">
        <div class="rbtop"><span class="tag ${cls}">${label}</span><h3>${esc(title)}</h3></div>
        <div class="fs">${M.me}<i>:</i>${M.op}</div>
        <div class="rteam"><b>${esc(L.my)}</b><span>${M.home ? '홈' : '원정'}</span><b>${esc(M.opp.club)}</b></div>
      </div>
      <div class="rewards">
        <div><span>획득 코인</span><b class="up">+${fmt(M.coins || 0)}</b>${M.titleBonus ? `<small>시즌 보상 +${fmt(M.titleBonus)}</small>` : ''}${M.awardCoins ? `<small>시즌 어워드 +${fmt(M.awardCoins)}</small>` : ''}${M.bigBonus ? `<small>🔥 빅매치 +${fmt(M.bigBonus)}</small>` : ''}</div>
        <div><span>${L.done ? '최종 순위' : '현재 순위'}</span><b>${pos}<small>위</small></b></div>
      </div>
      ${(M.titleBonus || M.awardCoins || M.bigBonus) ? `<div class="bnrow">${M.titleBonus ? `<span>시즌 보상 +${fmt(M.titleBonus)}C</span>` : ''}${M.awardCoins ? `<span>시즌 어워드 +${fmt(M.awardCoins)}C</span>` : ''}${M.bigBonus ? `<span>🔥 빅매치 승리 +${fmt(M.bigBonus)}C</span>` : ''}</div>` : ''}
      ${M.big ? `<div class="bigm">🔥 ${esc(M.big.tag)} · ${esc(M.big.why)}${M.bigBonus ? ' · 승리 보너스 +' + fmt(M.bigBonus) + 'C' : ' · 이번엔 승리 보너스 없음'}</div>` : ''}
      ${(M.awardTop || M.awardRate) ? `<div class="awd me" style="margin-top:9px"><span class="ic">${M.awardTop ? '👟' : '⭐'}</span><div class="tx"><b>${M.awardTop ? '리그 득점왕' : '리그 평점왕'} 등극</b><span>${L.top ? esc(L.top.n) + ' · ' + L.top.g + '골' : (L.best ? esc(L.best.n) + ' · 평균 ' + (+L.best.v).toFixed(2) : '')}</span></div></div>` : ''}
      ${champMe ? `<div class="cuptro" style="margin-top:10px"><div class="ic">🏆</div><div class="tx"><b>${esc(L.my)} 리그 우승${lgIsUnderdog(L.my) ? ' 🐴' : ''}</b><span>${esc(LG[L.lg] || '')} · 리그 우승 ${(S.leagueCups || []).length}회</span><small>${esc((rows[0] || {}).pts || 0)}점 · ${L.fx.length}라운드 마감</small></div></div>` : ''}
      <div class="racts early">
        <button class="btn primary wide" data-act="lg-next">${L.done ? '시즌 결산 보기' : '다음 라운드 →'}</button>
        <div class="row" style="gap:6px">
          <button class="btn dark sm" style="flex:1" data-act="lg-history">🏆 리그 기록</button>
          <button class="btn dark sm" style="flex:1" data-act="go-stadium">경기장으로</button>
        </div>
      </div>
      <div class="rh"><span>득점 타임라인</span><span>점유 ${M.poss}% · 슈팅 ${M.shotsMe}-${M.shotsOp}</span></div>
      ${goalsCard(M)}
      <div class="rh"><span>오늘의 MVP</span><span>${esc(tacTag(M.tac))}</span></div>
      ${mvpCard(M)}
      <div class="rh"><span>리그 순위표</span><span>${esc(LG[L.lg] || '')} ${pos}위</span></div>
      ${lgTableHTML(L, 6)}
      ${(M.roundResults || []).length ? `<div class="rh"><span>R${M.roundNo || L.r} 라운드 결과</span><span>${(M.roundResults || []).length}경기</span></div>
      <div class="opps">${lgRoundRows(M.roundResults)}</div>` : ''}
      <div class="racts foot">
        <button class="btn dark wide" data-act="lg-next">${L.done ? '시즌 결산 보기' : '다음 라운드 →'}</button>
      </div>
    </div>
    <div class="rfoot">보유 코인 ${fmt(S.coins)} · ${esc(LG[L.lg] || '')} ${pos}위</div>`;
}

