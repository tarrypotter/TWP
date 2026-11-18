/* ==========================================================================
   DRAFT XI · 부팅 — 대회 모듈까지 모두 로드된 뒤 상태 검증 + 첫 화면
   ========================================================================== */
(function(){
  S = sanitize(S) || freshState();
  try{ save(); }catch(e){}
  if(typeof fitApp === 'function') fitApp();
  paintHud();
  render();
  if(S.lgMigrated){
    delete S.lgMigrated; save();
    setTimeout(() => toast('26/27 리그가 20팀 38라운드 · 18팀 34라운드로 개편되어 이번 시즌을 새 일정으로 다시 시작합니다'), 500);
  }
})();
