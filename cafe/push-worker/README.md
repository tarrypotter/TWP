# 세종월드교회 카페 — 백그라운드 푸시 Worker

`cafe/` 앱의 잠금화면 푸시(FCM)를 실제로 쏘는 Cloudflare Worker입니다.
Firebase 서비스 계정 키로 OAuth2 토큰을 만들어 FCM v1 `messages:send`로 발송합니다.

- 주소: https://sejong-cafe-push.ai330928.workers.dev
- 엔드포인트: `POST /send` (CORS 허용, `OPTIONS` 204)

## 요청

```json
{ "tokens": ["<FCM 등록 토큰>"], "title": "☕ 음료 나왔습니다", "body": "아메리카노 ×1 나왔습니다", "url": "https://tarrypotter.github.io/TWP/cafe/?view=orders", "tag": "chat-<orderId>" }
```

헤더 `x-push-key: <PUSH_KEY>` 필요.

## 응답

```json
{ "ok": true, "sent": 1, "failed": 0, "dead": [], "results": [{ "ok": true, "tail": "…abcd1234" }] }
```

`dead`에는 만료·삭제된 기기 토큰이 담깁니다.

## 시크릿 (대시보드 > Worker > Settings > Variables and Secrets)

| 이름 | 값 |
| --- | --- |
| `FIREBASE_SA_JSON` | Firebase `프로젝트 설정 > 서비스 계정 > 새 비공개 키` JSON **전체** |
| `PUSH_KEY` | 앱 `core.js`의 `PUSH.key`와 같은 값 (현재 `sce_…`) |
| `FCM_PROJECT_ID` | (선택) 없으면 SA의 `project_id` 사용 |

서비스 계정 개인키는 **이 저장소에 절대 커밋하지 않습니다.** Worker 시크릿에만 있습니다.

## 배포 방법

대시보드에서 `sejong-cafe-push` → Edit code → 이 파일(`worker.js`) 내용을 붙여넣고 Deploy.

또는 API 토큰(Workers Scripts:Write)으로:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts/sejong-cafe-push" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2026-11-19"};type=application/json' \
  -F 'worker.js=@worker.js;type=application/javascript+module'
```
