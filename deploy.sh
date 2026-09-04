#!/usr/bin/env bash
#
# Deploy nimiq-cafe to the production VPS.
#
# Run from a local checkout:
#
#   ./deploy.sh                 # pull, build what changed, restart, health check
#   ./deploy.sh --force-client  # rebuild the client even if client/ did not change
#   ./deploy.sh --skip-client   # never rebuild the client
#   ./deploy.sh --dry-run       # show what would happen, change nothing
#
# The server compiles TypeScript in place (tsc writes .js next to each .ts) and
# Express serves the Vite bundle from client/dist, so a deploy is:
# git pull -> deps -> client build -> tsc -> pm2 restart.

set -euo pipefail

# The deploy target lives outside the repo so publishing this script does not
# publish the server it logs into. Put DEPLOY_HOST in .deploy.env (gitignored,
# see .deploy.env.example) or pass it in the environment.
if [ -f "$(dirname "$0")/.deploy.env" ]; then
  # shellcheck source=/dev/null
  . "$(dirname "$0")/.deploy.env"
fi

HOST="${DEPLOY_HOST:-}"
APP_DIR="${DEPLOY_APP_DIR:-/var/www/nimiq-cafe-prod}"
BRANCH="${DEPLOY_BRANCH:-main}"
SITE_URL="${DEPLOY_SITE_URL:-https://nimiq.cafe}"
PM2_APPS="nimiq-cafe-prod storeBlockchainInfo"

CLIENT_MODE="auto"
DRY_RUN="no"

for arg in "$@"; do
  case "$arg" in
    --force-client) CLIENT_MODE="force" ;;
    --skip-client)  CLIENT_MODE="skip" ;;
    --dry-run)      DRY_RUN="yes" ;;
    -h|--help)      sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31mERROR:\033[0m %s\n' "$1" >&2; exit 1; }

[ -n "$HOST" ] || fail "DEPLOY_HOST is not set -- copy .deploy.env.example to .deploy.env"

# --- local preflight -------------------------------------------------------
# Deploying pulls from origin, so anything not pushed will not ship.

say "Checking local state"

git rev-parse --git-dir >/dev/null 2>&1 || fail "not a git repository"

LOCAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$LOCAL_BRANCH" = "$BRANCH" ] || fail "on branch '$LOCAL_BRANCH', expected '$BRANCH'"

git fetch origin "$BRANCH" --quiet

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  if git merge-base --is-ancestor "$LOCAL_HEAD" "$REMOTE_HEAD"; then
    say "Local is behind origin/$BRANCH; deploying origin/$BRANCH"
  else
    fail "HEAD is not pushed to origin/$BRANCH -- push first, or it will not deploy"
  fi
fi

say "Deploying $(git rev-parse --short "$REMOTE_HEAD") to $HOST:$APP_DIR"

if [ "$DRY_RUN" = "yes" ]; then
  say "Dry run: stopping before touching the server"
  exit 0
fi

# --- remote deploy ---------------------------------------------------------

ssh "$HOST" bash -s -- "$APP_DIR" "$BRANCH" "$CLIENT_MODE" "$PM2_APPS" <<'REMOTE'
set -euo pipefail

# ssh flattens arguments into one command string that the remote shell re-splits,
# so the multi-word app list arrives as separate positionals. Collect the rest.
APP_DIR="$1"; BRANCH="$2"; CLIENT_MODE="$3"; shift 3; PM2_APPS="$*"

say() { printf '\033[1;34m  ->\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31m  ERROR:\033[0m %s\n' "$1" >&2; exit 1; }

cd "$APP_DIR"

# Generated data (server/json) and tsc output are gitignored, so a dirty tree
# here means real hand edits on the server that a pull would silently discard.
# client/yarn.lock is excluded: esbuild/rollup ship per-platform native packages,
# so yarn rewrites those entries on every machine. That churn is expected.
DIRTY="$(git status --porcelain --untracked-files=no | grep -v ' client/yarn.lock$' || true)"
if [ -n "$DIRTY" ]; then
  printf '%s\n' "$DIRTY" >&2
  fail "working tree has uncommitted tracked changes -- resolve on the server first"
fi

PREV="$(git rev-parse HEAD)"

say "Pulling origin/$BRANCH"
git fetch origin "$BRANCH" --quiet
git merge --ff-only "origin/$BRANCH"

NEW="$(git rev-parse HEAD)"

if [ "$PREV" = "$NEW" ]; then
  say "Already at $(git rev-parse --short HEAD); redeploying anyway"
  CHANGED="$(git diff --name-only "${PREV}~1" "$NEW" || true)"
else
  say "$(git rev-parse --short "$PREV") -> $(git rev-parse --short "$NEW")"
  CHANGED="$(git diff --name-only "$PREV" "$NEW")"
fi

changed_in() { printf '%s\n' "$CHANGED" | grep -q "^$1" && return 0 || return 1; }

# --- server ---
if changed_in "server/package-lock.json" || [ ! -d server/node_modules ]; then
  # Dev dependencies are required: typescript provides the tsc used below.
  say "Installing server dependencies"
  (cd server && npm ci --no-audit --no-fund)
else
  say "Server dependencies unchanged"
fi

say "Compiling server TypeScript"
(cd server && ./node_modules/.bin/tsc) || fail "tsc failed -- nothing restarted"

# --- client ---
BUILD_CLIENT="no"
case "$CLIENT_MODE" in
  force) BUILD_CLIENT="yes" ;;
  skip)  BUILD_CLIENT="no" ;;
  auto)  if changed_in "client/" || [ ! -d client/dist ]; then BUILD_CLIENT="yes"; fi ;;
esac

if [ "$BUILD_CLIENT" = "yes" ]; then
  if changed_in "client/yarn.lock" || [ ! -d client/node_modules ]; then
    # Not --frozen-lockfile: the lockfile pins per-platform esbuild/rollup
    # binaries, so it legitimately differs between dev machines and this server.
    say "Installing client dependencies"
    (cd client && yarn install)
  fi

  say "Building client (this takes a few minutes)"
  # Build into a temp dir first so a failed build cannot leave a half-written
  # dist/ being served to users.
  (cd client && rm -rf dist.new && yarn build --outDir dist.new) || fail "client build failed -- nothing restarted"

  [ -f client/dist.new/index.html ] || fail "client build produced no index.html"

  say "Swapping in new client build"
  rm -rf client/dist.old
  if [ -d client/dist ]; then mv client/dist client/dist.old; fi
  mv client/dist.new client/dist
else
  say "Client unchanged, skipping build"
fi

# --- restart ---
say "Restarting: $PM2_APPS"
pm2 restart $PM2_APPS --update-env
pm2 save --force >/dev/null

sleep 5

for app in $PM2_APPS; do
  STATUS="$(pm2 jlist | python3 -c "
import json,sys
for p in json.load(sys.stdin):
    if p['name']=='$app': print(p['pm2_env']['status'])
")"
  [ "$STATUS" = "online" ] || fail "$app is '$STATUS' after restart"
  say "$app is online"
done
REMOTE

# --- health check ----------------------------------------------------------
# The failure this repo keeps hitting is a process that is up but serving stale
# data, so check freshness, not just HTTP 200.

say "Waiting for the block relay to catch up"
sleep 10

HEAD_BLOCK="$(ssh "$HOST" 'curl -s -m 10 -X POST -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"getBlockNumber\",\"params\":[],\"id\":1}" \
  http://127.0.0.1:8648/' | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["data"])')"

SERVED_BLOCK="$(curl -s -m 20 "$SITE_URL/api/latest-blocks" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["blockNumber"] if d else 0)')"

LAG=$(( HEAD_BLOCK - SERVED_BLOCK ))
# The node head is sampled first, so by the time the site answers it can
# legitimately be a block or two ahead. Only the magnitude matters.
ABS_LAG=${LAG#-}

say "Node head: $HEAD_BLOCK | served: $SERVED_BLOCK | lag: $LAG blocks"

if [ "$ABS_LAG" -gt 100 ]; then
  fail "/api/latest-blocks is stale -- check 'pm2 logs storeBlockchainInfo'"
fi

POOLS="$(curl -s -m 30 "$SITE_URL/api/pools" | python3 -c '
import json, sys
d = json.load(sys.stdin)
stakers = sum(p["numStakers"] for p in d)
balance = sum(p["balance"] for p in d)
print(len(d), "pools,", stakers, "stakers,", format(balance, ","), "NIM")')"

say "Pools API: $POOLS"
say "Deploy complete: $SITE_URL"
