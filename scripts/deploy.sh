#!/usr/bin/env bash
# One-click deploy. Triggered by the dashboard (Admin → Deploy) or run by hand:
#   bash scripts/deploy.sh
#
# Steps: fetch → reset to origin/<branch> → npm ci → migrate → build → restart service.
# If install/migrate/build fails after the code was updated, the previous commit is
# restored and rebuilt so the site keeps serving the last good version.
# NOTE: database migrations are not rolled back (keep them additive / backwards compatible).
#
# Env (all optional):
#   DEPLOY_BRANCH      branch to deploy                (default: main)
#   DEPLOY_STATE_DIR   status/log directory            (default: /var/www/isaac-data/deploy)
#   DEPLOY_SERVICE     systemd unit to restart         (default: isaac-web)
#   DEPLOY_TRIGGER     who/what started it (for the history log)

set -Eeuo pipefail
# The service runs with NODE_ENV=production, which would make `npm ci` skip dev dependencies
# that the build needs.
unset NODE_ENV PORT HOSTNAME

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${DEPLOY_BRANCH:-main}"
STATE_DIR="${DEPLOY_STATE_DIR:-/var/www/isaac-data/deploy}"
SERVICE="${DEPLOY_SERVICE:-isaac-web}"
TRIGGER="${DEPLOY_TRIGGER:-manual}"

cd "$APP_DIR"
mkdir -p "$STATE_DIR"
LOCK="$STATE_DIR/lock"
LOG="$STATE_DIR/deploy.log"
STATUS="$STATE_DIR/status"
HISTORY="$STATE_DIR/history.log"

if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Another deploy is already running." >&2
  exit 3
fi

: > "$LOG"
if [ -t 1 ]; then exec > >(tee -a "$LOG") 2>&1; else exec >>"$LOG" 2>&1; fi

STARTED="$(date -u +%FT%TZ)"
STEP="start"
PULLED=0
FROM_FULL="$(git rev-parse HEAD)"
FROM="$(git rev-parse --short HEAD)"
TO=""

log() { echo "[$(date +%H:%M:%S)] $*"; }

set_status() { # state step message
  {
    echo "state=$1"
    echo "step=$2"
    echo "started=$STARTED"
    echo "from=$FROM"
    echo "to=$TO"
    echo "trigger=$TRIGGER"
    echo "message=$3"
    echo "updated=$(date -u +%FT%TZ)"
  } > "$STATUS.tmp"
  mv "$STATUS.tmp" "$STATUS"
}

finish() { # state message
  set_status "$1" "$STEP" "$2"
  echo "$(date -u +%FT%TZ)|$1|$FROM|$TO|$TRIGGER|$2" >> "$HISTORY"
  rmdir "$LOCK" 2>/dev/null || true
}

restart_service() {
  # --no-block: the service (which may be the process that started us) is restarted
  # asynchronously, so this script can finish writing its final status first.
  if [ "$(id -u)" = "0" ]; then
    systemctl restart --no-block "$SERVICE"
  else
    sudo -n /usr/bin/systemctl restart --no-block "$SERVICE"
  fi
}

on_error() {
  local code=$?
  trap - ERR
  log "✗ Step '$STEP' failed (exit $code)"
  if [ "$PULLED" = "1" ]; then
    log "Rolling back to $FROM …"
    STEP="rollback"
    set_status running rollback "Rolling back to $FROM"
    if git reset --hard "$FROM_FULL" && npm ci --no-audit --no-fund && npm run build; then
      log "Rollback complete — still serving $FROM."
      restart_service || true
      finish failed "Deploy failed (rolled back to $FROM)"
    else
      log "Rollback build failed — manual intervention required."
      finish failed "Deploy AND rollback failed — check the server"
    fi
  else
    finish failed "Deploy failed at step: $STEP"
  fi
  exit 1
}
trap on_error ERR

set_status running fetch "Fetching latest code"
STEP="fetch"
log "▶ Deploying branch '$BRANCH' (currently $FROM)"
git fetch --quiet origin "$BRANCH"
TO="$(git rev-parse --short "origin/$BRANCH")"
log "  target: $TO"

STEP="update"
set_status running update "Updating code to $TO"
git reset --hard "origin/$BRANCH"
PULLED=1

STEP="install"
set_status running install "Installing dependencies"
log "▶ npm ci"
npm ci --no-audit --no-fund

STEP="migrate"
set_status running migrate "Applying database migrations"
log "▶ prisma migrate deploy"
npm run db:deploy

STEP="build"
set_status running build "Building the site"
log "▶ next build"
npm run build

STEP="restart"
log "✔ Build finished — restarting $SERVICE"
finish success "Deployed $TO"
restart_service
log "✔ Done"
