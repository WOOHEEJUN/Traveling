#!/usr/bin/env bash
#
# 서버에서 실행하는 배포 스크립트.
# 최신 코드를 받아 빌드하고 서비스를 재시작합니다.
#
# 사용법 (로컬 PC에서):
#   ssh -i C:/Users/tigensoft/.ssh/ai_trader_vultr root@158.247.222.58 'bash /opt/traveling/scripts/deploy.sh'
#
# 스크립트 자체가 바뀌었을 수도 있으니, git pull은 이 파일 밖에서 먼저 하는 게 아니라
# 여기서 fetch 후 최신 스크립트로 다시 실행되도록 되어 있습니다.

set -euo pipefail

APP_DIR="/opt/traveling"
BRANCH="main"

cd "$APP_DIR"

echo "==> 1/5 최신 코드 받기"
git fetch --all --quiet
# 삭제된 파일(구 아이콘 등)까지 반영하려면 reset + clean 필요
git reset --hard "origin/$BRANCH" --quiet
git clean -fd --quiet
echo "    $(git log --oneline -1)"

echo "==> 2/5 의존성 설치 (빌드에 devDependencies 필요)"
npm ci --include=dev --no-audit --no-fund >/dev/null 2>&1
echo "    완료"

echo "==> 3/5 Prisma 클라이언트 생성 + 마이그레이션 적용"
npx prisma generate >/dev/null 2>&1
npx prisma migrate deploy 2>&1 | grep -E "migrations|already|No pending" | tail -2 || true

echo "==> 4/5 프로덕션 빌드"
# RAM이 950MB뿐이라 힙 상한을 둡니다 (스왑 2.3GB가 있어 버팀)
# npm 실제 종료 코드로 판정합니다. (grep -q 로 파이프를 걸면 SIGPIPE +
#  pipefail 때문에 빌드가 성공해도 실패로 오판되므로 쓰지 않습니다.)
if NODE_OPTIONS="--max-old-space-size=768" npm run build >/tmp/build.log 2>&1; then
  echo "    빌드 성공"
else
  echo "    !! 빌드 실패 — 서비스를 재시작하지 않습니다. 로그:"
  tail -25 /tmp/build.log
  exit 1
fi

echo "==> 5/5 서비스 재시작"
systemctl restart traveling
sleep 8

if [ "$(systemctl is-active traveling)" = "active" ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/login)
  echo "    서비스 active / 로컬 응답 [$code]"
  if [ "$code" != "200" ]; then
    echo "    !! /login 응답이 200이 아닙니다. 로그 확인 필요:"
    tail -15 /var/log/traveling.log
    exit 1
  fi
else
  echo "    !! 서비스가 뜨지 않았습니다. 로그:"
  systemctl status traveling --no-pager | head -12
  tail -20 /var/log/traveling.log
  exit 1
fi

echo ""
echo "배포 완료: https://158-247-222-58.sslip.io"
