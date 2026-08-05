#!/bin/bash
# Deploy Academy of Being to kaditech.com (nginx static).
# Run on LAN: HOST=root@192.168.1.98 PASS=Panda88 ./DEPLOY_ACADEMY.sh
set -euo pipefail
HOST="${HOST:-root@192.168.1.98}"
WEB="${WEB:-/var/www/kaditech-starlight}"
PASS="${PASS:-Panda88}"
DIR="$(cd "$(dirname "$0")" && pwd)"

if command -v sshpass >/dev/null 2>&1; then
  export SSHPASS="$PASS"
  RSYNC=(sshpass -e rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new")
  SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new)
else
  RSYNC=(rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new")
  SSH=(ssh -o StrictHostKeyChecking=accept-new)
fi

echo "==> Academy of Being → $HOST:$WEB"
"${RSYNC[@]}" "$DIR/Academyofbeing/" "$HOST:$WEB/Academyofbeing/"
"${RSYNC[@]}" "$DIR/index.html" "$HOST:$WEB/index.html"
"${RSYNC[@]}" "$DIR/apps/index.html" "$HOST:$WEB/apps/index.html"
"${SSH[@]}" "$HOST" "chown -R nginx:nginx $WEB/Academyofbeing $WEB/index.html $WEB/apps/index.html 2>/dev/null || true; chmod -R a+rX $WEB/Academyofbeing; nginx -t && systemctl reload nginx; ls -la $WEB/Academyofbeing; echo DONE"
echo "Open https://kaditech.com/Academyofbeing/"
