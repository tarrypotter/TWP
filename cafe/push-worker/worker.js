/* 세종월드교회 카페 — FCM 백그라운드 푸시 발송 Worker (Cloudflare Workers 무료)
 *
 *  POST /send   (JSON)  { tokens: string[], title, body, url?, tag? }
 *  OPTIONS /send        CORS 프리플라이트
 *
 *  필요한 Secret(환경변수)
 *   FIREBASE_SA_JSON  : Firebase 서비스 계정 JSON 전체 (프로젝트 설정 > 서비스 계정 > 새 비공개 키)
 *   PUSH_KEY          : 앱(admin.html)과 맞출 간단한 공유 키. 헤더 x-push-key 로 전달됩니다.
 *   FCM_PROJECT_ID    : (선택) 없으면 SA의 project_id
 *
 *  서비스 계정 개인키는 이 파일에 절대 넣지 마세요. 오직 Secret 으로만.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-push-key',
  'Access-Control-Max-Age': '86400'
};
const ICON = 'https://tarrypotter.github.io/TWP/cafe/icon-192.png';
const BADGE = 'https://tarrypotter.github.io/TWP/cafe/icon-192.png';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true, service: 'sejong-cafe-push', fcm: !!env.FIREBASE_SA_JSON,
        // 배포된 코드가 최신인지 확인용 — 이 값이 없으면 예전 버전이 올라가 있는 것
        build: '2026-11-20-banner', urgency: 'high', ttl: 86400
      });
    }

    if (url.pathname !== '/send') return json({ ok: false, error: 'not_found' }, 404);
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

    // 공유 키(설정했을 때만 검사)
    if (env.PUSH_KEY) {
      const key = request.headers.get('x-push-key') || '';
      if (key !== env.PUSH_KEY) return json({ ok: false, error: 'unauthorized' }, 401);
    }

    let payload;
    try { payload = await request.json(); }
    catch (e) { return json({ ok: false, error: 'bad_json' }, 400); }

    const tokens = Array.from(new Set((payload.tokens || []).filter(t => typeof t === 'string' && t.length > 20))).slice(0, 200);
    const title = String(payload.title || '세종월드교회 카페').slice(0, 120);
    const body = String(payload.body || '').slice(0, 300);
    const tag = String(payload.tag || 'sejong-' + Date.now()).slice(0, 64);
    let link = String(payload.url || 'https://tarrypotter.github.io/TWP/cafe/');
    if (!/^https:\/\//.test(link)) link = 'https://tarrypotter.github.io/TWP/cafe/';

    if (!tokens.length) return json({ ok: false, error: 'no_tokens' }, 400);

    let sa;
    try { sa = JSON.parse(env.FIREBASE_SA_JSON); }
    catch (e) { return json({ ok: false, error: 'sa_json_invalid' }, 500); }

    let access;
    try { access = await getAccessToken(sa); }
    catch (e) { return json({ ok: false, error: 'oauth_failed', detail: String(e && e.message || e) }, 502); }

    const project = env.FCM_PROJECT_ID || sa.project_id;
    const endpoint = `https://fcm.googleapis.com/v1/projects/${project}/messages:send`;

    const results = await Promise.all(tokens.map(async token => {
      const message = {
        message: {
          token,
          notification: { title, body },
          webpush: {
            /* Urgency: high = APNs priority 10. 이게 없으면 iOS가 '조용한 알림'으로 보내 배너 없이 알림센터에만 쌓입니다.
               TTL: 86400 = 하루 안에 도착하면 전달 (그 뒤엔 버립니다). */
            headers: { Urgency: 'high', TTL: '86400' },
            notification: {
              title, body,
              icon: ICON, badge: BADGE,
              tag, renotify: true,
              /* iOS 배너를 막지 않도록 조용한 알림·고정 알림은 끕니다 */
              silent: false, requireInteraction: false,
              timestamp: Date.now(), dir: 'ltr', lang: 'ko',
              data: { url: link }
            },
            fcm_options: { link }
          },
          data: { title, body, url: link, tag }
        }
      };
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        if (res.ok) return { ok: true, tail: token.slice(-8) };
        const text = await res.text();
        let code = 'send_failed';
        try { code = (JSON.parse(text).error.details || []).map(d => d.errorCode).filter(Boolean)[0] || code; } catch (e) { }
        return { ok: false, tail: token.slice(-8), status: res.status, code };
      } catch (e) {
        return { ok: false, tail: token.slice(-8), code: 'network', detail: String(e && e.message || e) };
      }
    }));

    const sent = results.filter(r => r.ok).length;
    return json({
      ok: sent > 0,
      sent,
      failed: results.length - sent,
      // 만료·삭제된 기기 토큰은 프론트에서 지울 수 있게 알려 줍니다
      dead: results.filter(r => !r.ok && (r.code === 'UNREGISTERED' || r.code === 'NOT_FOUND' || r.status === 404)).map(r => r.tail),
      results
    });
  }
};

/* ---------------- OAuth2 (JWT → access token) ---------------- */
let cached = { token: '', exp: 0, email: '' };

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp - 60 > now && cached.email === sa.client_email) return cached.token;

  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const unsigned = b64u(JSON.stringify(header)) + '.' + b64u(JSON.stringify(claims));
  const key = await importPkcs8(sa.private_key);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = unsigned + '.' + b64u(sig);

  const res = await fetch(claims.aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
      '&assertion=' + encodeURIComponent(assertion)
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error('token ' + res.status + ' ' + JSON.stringify(data).slice(0, 200));
  cached = { token: data.access_token, exp: now + (Number(data.expires_in) || 3600), email: sa.client_email };
  return cached.token;
}

async function importPkcs8(pem) {
  const b64 = String(pem).replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', raw, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

function b64u(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
