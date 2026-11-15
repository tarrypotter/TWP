# ABYSSBLADE — 심연의 룬검 각성

무기(룬검) 성장 × 로그라이크. 실제 **Rust → WebAssembly** 엔진이 60fps로 전투를 시뮬레이션하고, 브라우저는 그 결과만 그립니다.

- **엔진**: `src/lib.rs` — 외부 크레이트 없이 `std`만 사용, `crate-type = ["cdylib"]`, `wasm32-unknown-unknown`
- **셸**: `template.html` — 단일 파일 모바일 앱(100dvh 고정, 확대 차단, 캔버스 렌더)
- **빌드**: `build.py` — `target/.../bladeforge.wasm`을 base64로 `template.html`에 인라인 → `dist/index.html`
- **배포**: `abyssblade/index.html` 빌드 산출물을 `tarrypotter/TWP`에 커밋 (저장소 Pages가 서빙)

## 엔진이 하는 일

- 60Hz 시뮬레이션: 플레이어 이동, 사거리 내 자동 검기(부채꼴 판정), 쿨타임 특수기(대시 + 광역 참격)
- 적 AI: 추적형 / 돌격형 / 중장갑 / 원거리 주술사 / 수문장(보스, 방사형 탄막 + 돌진)
- 원소 상호작용: 화상 도트, 연쇄 번개, 빙결 둔화, 흡혈, 검기 파동 투사체 — 모두 크리티컬 계산 포함
- 룬검 제련: 골드로 실시간 강화(+N) → 피해·사거리·공격속도·검 크기 증가, 5/10/15강에서 분기·초월
- 로그라이크: 층 클리어마다 3택 성물, 5층마다 수문장, 사망 시 심연 파편 획득 → 제련소 영구 강화

JS는 `bf_tick(dt, moveX, moveY)`만 호출하고, 엔진이 `Float32Array` 렌더 버퍼(헤더 + 7개 섹션)를 채웁니다.

## 로컬 빌드

```bash
cargo build --target wasm32-unknown-unknown --release
python3 build.py      # dist/index.html
```

## 배포

`tarrypotter/TWP` 저장소의 `abyssblade/` 경로로 호스팅합니다(저장소 Pages, main 브랜치).

https://tarrypotter.github.io/TWP/abyssblade/

`.github/workflows/deploy.yml`은 이 프로젝트를 단독 저장소로 옮겼을 때 쓰는 자체 배포 워크플로입니다.
`cargo build --target wasm32-unknown-unknown --release` → `python3 build.py` → `dist/` 업로드 순서로 동작합니다.
