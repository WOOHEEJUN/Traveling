# 배포 가이드

"우리 어디가지" 앱을 Vultr 서버에 배포하는 방법. **아무 채팅 세션에서도 이 문서만 보면 배포할 수 있게** 정리했습니다.

- **접속 주소**: https://158-247-222-58.sslip.io
- **로그인**: 서버 앞단 비밀번호 없음. 앱에서 PIN만 입력 (우희주니 `0314` / 유지마니 `0414`)
- **GitHub**: https://github.com/WOOHEEJUN/Traveling (커밋 메시지는 한글)

---

## 배포하기 (평소)

코드를 수정하고 GitHub `main`에 푸시한 뒤, **한 줄이면 배포됩니다**:

```bash
ssh -i C:/Users/tigensoft/.ssh/ai_trader_vultr root@158.247.222.58 'bash /opt/traveling/scripts/deploy.sh'
```

이 명령이 하는 일 (`scripts/deploy.sh`):
1. 최신 코드 받기 (`git reset --hard` + `git clean` — 삭제된 파일까지 반영)
2. 의존성 설치 (`npm ci --include=dev` — 빌드에 devDependencies 필요)
3. Prisma 클라이언트 생성 + 마이그레이션 적용
4. 프로덕션 빌드 (RAM이 작아 힙 상한을 둠)
5. 서비스 재시작 후 응답 확인

빌드가 실패하면 서비스를 재시작하지 않고 멈추므로, 실패해도 기존 앱은 계속 돕니다.

**전체 순서 (수정 → 배포):**
```bash
# 1. 로컬에서 커밋 & 푸시
cd D:/work/Traveling
git add -A && git commit -m "수정 내용"
git push origin main

# 2. 배포
ssh -i C:/Users/tigensoft/.ssh/ai_trader_vultr root@158.247.222.58 'bash /opt/traveling/scripts/deploy.sh'
```

> ⚠️ `deploy.sh` 자체를 수정했다면, 그 커밋을 먼저 푸시해야 서버가 새 스크립트를 받습니다. 스크립트는 실행 시 스스로 최신 코드를 fetch하지만, 이미 실행 중인 스크립트 파일은 교체되지 않으므로 **스크립트 로직을 바꾼 배포는 두 번 돌려야** 새 로직이 적용됩니다.

---

## 서버 정보

| 항목 | 값 |
|---|---|
| 공인 IP | 158.247.222.58 |
| 접속 | `ssh -i C:/Users/tigensoft/.ssh/ai_trader_vultr root@158.247.222.58` |
| 앱 위치 | `/opt/traveling` |
| 실행 방식 | systemd 서비스 `traveling` (포트 3000) |
| 리버스 프록시 | Caddy → `127.0.0.1:3000`, 자동 HTTPS |
| DB | SQLite `/opt/traveling/data/prod.db` |
| 환경변수 | `/opt/traveling/.env` (권한 600) |
| Node | v22 (nodesource) |
| RAM | 950MB + 스왑 2.3GB |
| OS | Ubuntu 26.04 |

### 환경변수 (`.env`)
```
ANTHROPIC_API_KEY        # Claude API (여행 추천)
KAKAO_REST_API_KEY       # 카카오 로컬/이미지 검색 (백엔드)
NEXT_PUBLIC_KAKAO_JS_KEY # 카카오맵 표시 (프론트)
SESSION_PASSWORD         # iron-session 암호 (32자+)
PIN_ME                   # 우희주니 로그인 PIN
PIN_GIRLFRIEND           # 유지마니 로그인 PIN
DATABASE_URL             # file:/opt/traveling/data/prod.db
NODE_ENV=production
PORT=3000
```
키 값은 서버 `.env`에만 있고 GitHub에는 올라가지 않습니다. 값을 바꾸려면 서버에서 직접 편집 후 재시작:
```bash
ssh -i C:/Users/tigensoft/.ssh/ai_trader_vultr root@158.247.222.58
nano /opt/traveling/.env
systemctl restart traveling
```

---

## 상태 확인 / 로그

```bash
# 서비스 상태
ssh -i C:/Users/tigensoft/.ssh/ai_trader_vultr root@158.247.222.58 'systemctl status traveling --no-pager | head -12'

# 실시간 로그 (Claude API 사용량도 여기 찍힘)
ssh -i C:/Users/tigensoft/.ssh/ai_trader_vultr root@158.247.222.58 'tail -f /var/log/traveling.log'

# 외부에서 응답 확인
curl -s -o /dev/null -w "%{http_code}\n" https://158-247-222-58.sslip.io/login   # 200이면 정상
```

---

## 문제 해결

### 배포했는데 화면이 안 바뀜
브라우저 캐시. 강력 새로고침(Ctrl+Shift+R) 하거나, PWA로 설치했으면 홈 화면 아이콘 지우고 다시 접속.

### 빌드가 멈추거나 OOM
RAM이 작아서 그렇습니다. 스왑이 살아있는지 확인:
```bash
ssh ... 'free -h; swapon --show'
```
스왑이 없으면:
```bash
ssh ... 'fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile'
```

### 서비스가 안 뜸
```bash
ssh ... 'journalctl -u traveling -n 40 --no-pager; tail -30 /var/log/traveling.log'
```
흔한 원인: `.env`의 키 누락, 마이그레이션 안 됨(`npx prisma migrate deploy`), 포트 3000 점유.

### 카카오맵이 안 뜸 / 401
카카오 개발자센터 > 앱 설정 > 플랫폼 > Web에 도메인이 등록돼 있어야 합니다:
- `https://158-247-222-58.sslip.io`

### 내 IP가 차단됨 (curl이 000/연결 안 됨)
fail2ban이 막은 것. 로그인 실패를 반복하거나(앱 rate limit) SSH 실패가 쌓이면 걸립니다.
```bash
ssh ... 'fail2ban-client status caddy-auth; fail2ban-client set caddy-auth unbanip <내IP>'
```
앱 로그인 시도 제한(IP당 10분 5회)에 걸린 경우는 서비스 재시작으로 초기화됩니다(메모리 기록):
```bash
ssh ... 'systemctl restart traveling'
```

### DB를 초기화하고 싶음 (주의: 저장된 여행 다 사라짐)
```bash
ssh ... 'cd /opt/traveling && rm -f data/prod.db && npx prisma migrate deploy && npx tsx prisma/seed.ts'
```

---

## Caddy 설정 (참고)

`/etc/caddy/Caddyfile` — 봇 차단 + 자동 HTTPS + 리버스 프록시. 서버 앞단 basic_auth는 제거됨(앱 PIN 로그인 + 시도 제한으로 대체). 수정 시:
```bash
ssh ... 'nano /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy'
```
백업은 `/etc/caddy/Caddyfile.bak.*`에 있습니다.

---

## 최초 배포 (서버를 처음부터 세팅할 때)

이미 세팅돼 있으므로 평소엔 볼 일 없지만, 서버를 갈아엎을 경우:

```bash
# 1. Node 22 설치
ssh ... 'curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs build-essential'

# 2. 코드 받기
ssh ... 'mkdir -p /opt/traveling && cd /opt/traveling && git clone https://github.com/WOOHEEJUN/Traveling.git .'

# 3. .env 작성 (위 "환경변수" 참고, 권한 600)
#    data 디렉터리 생성: mkdir -p /opt/traveling/data

# 4. systemd 서비스 등록: /etc/systemd/system/traveling.service 작성
#    (WorkingDirectory=/opt/traveling, EnvironmentFile=/opt/traveling/.env,
#     ExecStart=/usr/bin/npm run start, Restart=always, MemoryMax=600M)
#    systemctl daemon-reload && systemctl enable --now traveling

# 5. 첫 빌드 + 시드
ssh ... 'bash /opt/traveling/scripts/deploy.sh'
ssh ... 'cd /opt/traveling && npx tsx prisma/seed.ts'

# 6. Caddyfile에 reverse_proxy 127.0.0.1:3000 설정 후 reload
```
