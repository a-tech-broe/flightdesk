#!/usr/bin/env bash
# =============================================================================
# FlightDesk — Complete Cleanup Script
# =============================================================================
# Cleans every resource this repository creates.
#
# USAGE
#   ./cleanup.sh [MODE] [OPTIONS]
#
# MODES (pick one; default: --local)
#   --local       Stop containers, remove volumes + images + networks (default)
#   --remote      SSH to EC2 and clean Docker/app files there
#   --infra       Terraform destroy (tears down all AWS resources)
#   --all         Full teardown: --remote → --infra → --local
#
# OPTIONS
#   --dry-run     Print what would happen without making any changes
#   --yes         Skip all confirmation prompts (use with care)
#   --keep-data   Skip postgres_data volume deletion (preserves DB)
#   --keep-images Keep built Docker images (faster re-deploy later)
#   -h, --help    Show this help text
#
# EXAMPLES
#   ./cleanup.sh                         # local Docker cleanup only
#   ./cleanup.sh --all --yes             # full teardown, no prompts
#   ./cleanup.sh --remote --dry-run      # preview EC2 cleanup
#   ./cleanup.sh --infra                 # destroy AWS resources only
# =============================================================================

set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
ok()      { echo -e "${GREEN}${BOLD}[ OK ]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}${BOLD}[ERR ]${RESET}  $*" >&2; }
section() { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }
dryrun()  { echo -e "${YELLOW}${BOLD}[DRY ]${RESET}  (would run) $*"; }

# ── defaults ──────────────────────────────────────────────────────────────────
MODE=""
DRY_RUN=false
AUTO_YES=false
KEEP_DATA=false
KEEP_IMAGES=false

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${REPO_ROOT}/infrastructure/terraform"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.yml"

# Resource identifiers (must match what's in docker-compose.yml / terraform)
COMPOSE_PROJECT="flightdesk"         # default compose project = directory name
NAMED_VOLUMES=("flightdesk_postgres_data" "postgres_data")
BUILT_IMAGES=("flightdesk-backend" "flightdesk-frontend")
COMPOSE_NETWORK="${COMPOSE_PROJECT}_default"

# ── helpers ───────────────────────────────────────────────────────────────────
run() {
  if $DRY_RUN; then dryrun "$*"; else eval "$*"; fi
}

confirm() {
  local msg="$1"
  if $AUTO_YES; then
    warn "Auto-yes: skipping prompt for → $msg"
    return 0
  fi
  echo -en "${YELLOW}${BOLD}[????]${RESET}  $msg [y/N] "
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

require_cmd() {
  command -v "$1" &>/dev/null || { error "Required command not found: $1"; exit 1; }
}

load_env() {
  if [[ -f "${REPO_ROOT}/.env" ]]; then
    # shellcheck disable=SC1090
    set -o allexport; source "${REPO_ROOT}/.env"; set +o allexport
  fi
}

# ── parse args ────────────────────────────────────────────────────────────────
parse_args() {
  local args=("$@")
  local mode_set=false

  for arg in "${args[@]}"; do
    case "$arg" in
      --local)       MODE="local";  mode_set=true ;;
      --remote)      MODE="remote"; mode_set=true ;;
      --infra)       MODE="infra";  mode_set=true ;;
      --all)         MODE="all";    mode_set=true ;;
      --dry-run)     DRY_RUN=true ;;
      --yes|-y)      AUTO_YES=true ;;
      --keep-data)   KEEP_DATA=true ;;
      --keep-images) KEEP_IMAGES=true ;;
      -h|--help)     usage; exit 0 ;;
      *) error "Unknown argument: $arg"; usage; exit 1 ;;
    esac
  done

  $mode_set || MODE="local"
}

usage() {
  sed -n '/^# USAGE/,/^# ====/p' "$0" | grep -v '^# ====' | sed 's/^# //'
}

# =============================================================================
# MODE: LOCAL — stop + remove all local Docker resources
# =============================================================================
cleanup_local() {
  section "Local Docker Cleanup"

  require_cmd docker

  # 1. Compose down (removes containers + the default network)
  if [[ -f "$COMPOSE_FILE" ]]; then
    info "Stopping and removing compose services..."
    if $KEEP_DATA; then
      run "docker compose -f '${COMPOSE_FILE}' down --remove-orphans --rmi none 2>/dev/null || true"
    else
      run "docker compose -f '${COMPOSE_FILE}' down --volumes --remove-orphans --rmi none 2>/dev/null || true"
    fi
    ok "Compose services removed"
  else
    warn "docker-compose.yml not found at ${COMPOSE_FILE}; skipping compose down"
  fi

  # 2. Named volumes
  if ! $KEEP_DATA; then
    section "Named Volumes"
    for vol in "${NAMED_VOLUMES[@]}"; do
      if docker volume ls --format '{{.Name}}' | grep -qx "$vol" 2>/dev/null; then
        info "Removing volume: $vol"
        run "docker volume rm '$vol' 2>/dev/null || true"
        ok "Removed $vol"
      else
        info "Volume not found (already clean): $vol"
      fi
    done
  else
    warn "Skipping volume deletion (--keep-data)"
  fi

  # 3. Built images
  if ! $KEEP_IMAGES; then
    section "Built Images"
    for img in "${BUILT_IMAGES[@]}"; do
      # Match both tag patterns: plain name and name:latest / name:tag
      local ids
      ids=$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
        | awk -v i="$img" 'index($1,i)!=0 {print $2}' | sort -u)
      if [[ -n "$ids" ]]; then
        info "Removing image(s) for: $img"
        run "docker rmi --force $ids 2>/dev/null || true"
        ok "Removed $img"
      else
        info "Image not found (already clean): $img"
      fi
    done

    # Remove dangling images left behind by builds
    info "Removing dangling build-cache images..."
    run "docker image prune -f 2>/dev/null || true"
  else
    warn "Skipping image deletion (--keep-images)"
  fi

  # 4. Compose network (may already be gone after `compose down`)
  section "Docker Networks"
  if docker network ls --format '{{.Name}}' | grep -qx "$COMPOSE_NETWORK" 2>/dev/null; then
    info "Removing network: $COMPOSE_NETWORK"
    run "docker network rm '$COMPOSE_NETWORK' 2>/dev/null || true"
    ok "Removed $COMPOSE_NETWORK"
  else
    info "Network not found (already clean): $COMPOSE_NETWORK"
  fi

  # 5. Build cache
  section "Docker Build Cache"
  if confirm "Prune Docker build cache? (frees disk space, next build will be slower)"; then
    run "docker builder prune -f"
    ok "Build cache cleared"
  else
    info "Skipping build cache prune"
  fi

  # 6. Local build artefacts
  section "Local Build Artefacts"
  if confirm "Remove local build artefacts (.next, __pycache__, *.pyc, node_modules)?"; then
    run "find '${REPO_ROOT}/frontend' -type d -name '.next' -exec rm -rf {} + 2>/dev/null || true"
    run "find '${REPO_ROOT}/frontend' -type d -name 'node_modules' -exec rm -rf {} + 2>/dev/null || true"
    run "find '${REPO_ROOT}/backend'  -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true"
    run "find '${REPO_ROOT}/backend'  -name '*.pyc' -delete 2>/dev/null || true"
    run "find '${REPO_ROOT}/backend'  -name '*.pyo' -delete 2>/dev/null || true"
    run "find '${REPO_ROOT}'          -name '.pytest_cache' -exec rm -rf {} + 2>/dev/null || true"
    ok "Build artefacts removed"
  else
    info "Skipping artefact removal"
  fi

  ok "Local cleanup complete."
}

# =============================================================================
# MODE: REMOTE — SSH to EC2, stop Docker, remove app files
# =============================================================================
cleanup_remote() {
  section "Remote EC2 Cleanup"

  load_env

  # EC2 host — prefer CLI env var, else .env value, else prompt
  local ec2_host="${EC2_EIP_HOST:-}"
  local ec2_key="${EC2_SSH_KEY_PATH:-}"      # path to private key file
  local ec2_user="${EC2_USER:-ec2-user}"

  if [[ -z "$ec2_host" ]]; then
    echo -en "${CYAN}EC2 host / IP: ${RESET}"; read -r ec2_host
  fi
  if [[ -z "$ec2_key" ]]; then
    echo -en "${CYAN}Path to SSH private key [~/.ssh/id_rsa]: ${RESET}"; read -r ec2_key
    ec2_key="${ec2_key:-$HOME/.ssh/id_rsa}"
  fi

  info "Target: ${ec2_user}@${ec2_host}"

  if ! confirm "This will stop all Docker services and remove /app/flightdesk on ${ec2_host}. Continue?"; then
    info "Remote cleanup cancelled."
    return 0
  fi

  local remote_script
  remote_script=$(cat <<'REMOTE'
set -euo pipefail

echo "==> Stopping Docker Compose services..."
if [ -f /app/flightdesk/docker-compose.yml ]; then
  cd /app/flightdesk
  docker compose down --volumes --remove-orphans --rmi all 2>/dev/null || true
fi

echo "==> Removing built images..."
docker rmi flightdesk-backend flightdesk-frontend 2>/dev/null || true
docker image prune -f 2>/dev/null || true

echo "==> Removing named volumes..."
docker volume rm flightdesk_postgres_data postgres_data 2>/dev/null || true

echo "==> Removing Docker networks..."
docker network rm flightdesk_default 2>/dev/null || true

echo "==> Pruning system..."
docker system prune -f 2>/dev/null || true

echo "==> Removing app directory..."
rm -rf /app/flightdesk

echo "Remote cleanup done."
REMOTE
)

  if $DRY_RUN; then
    dryrun "Would SSH to ${ec2_user}@${ec2_host} and run:"
    echo "$remote_script" | sed 's/^/    /'
  else
    ssh -i "$ec2_key" \
        -o StrictHostKeyChecking=no \
        -o BatchMode=yes \
        "${ec2_user}@${ec2_host}" \
        "bash -s" <<< "$remote_script"
    ok "Remote EC2 cleanup complete."
  fi
}

# =============================================================================
# MODE: INFRA — Terraform destroy (all AWS resources)
# =============================================================================
cleanup_infra() {
  section "AWS Infrastructure Teardown (Terraform Destroy)"

  require_cmd terraform
  require_cmd aws

  if [[ ! -d "$TF_DIR" ]]; then
    error "Terraform directory not found: ${TF_DIR}"
    exit 1
  fi

  # Collect required Terraform backend config
  local bucket="${TF_STATE_BUCKET:-}"
  local region="${AWS_REGION:-}"
  local lock_table="${TF_LOCK_TABLE:-}"
  local key_pair="${EC2_KEY_PAIR_NAME:-}"

  load_env  # may set some of these from .env

  if [[ -z "$bucket" ]]; then
    echo -en "${CYAN}TF State S3 bucket name: ${RESET}"; read -r bucket
  fi
  if [[ -z "$region" ]]; then
    echo -en "${CYAN}AWS region [us-east-1]: ${RESET}"; read -r region
    region="${region:-us-east-1}"
  fi
  if [[ -z "$lock_table" ]]; then
    echo -en "${CYAN}DynamoDB lock table name: ${RESET}"; read -r lock_table
  fi
  if [[ -z "$key_pair" ]]; then
    echo -en "${CYAN}EC2 key pair name: ${RESET}"; read -r key_pair
  fi

  warn "This will PERMANENTLY DESTROY:"
  echo "    • EC2 instance:            flightdesk-dev"
  echo "    • Security groups:         flightdesk-dev, flightdesk-alb-dev"
  echo "    • Application Load Balancer: flightdesk-dev"
  echo "    • Target group:            flightdesk-dev"
  echo "    • ALB listeners:           HTTP :80 + HTTPS :443"
  echo "    • ACM certificate:         flightadmins.com"
  echo "    • Route53 records:         flightadmins.com, www.flightadmins.com"
  echo "    • Route53 cert validation records"
  echo ""
  echo "  The following are NOT destroyed (created outside Terraform):"
  echo "    • Route53 hosted zone:     flightadmins.com"
  echo "    • Elastic IP allocation:   (disassociated but not released)"
  echo "    • S3 state bucket:         ${bucket}"
  echo "    • DynamoDB lock table:     ${lock_table}"
  echo ""

  if ! confirm "Type 'y' to confirm destruction of all AWS resources listed above"; then
    info "Infrastructure teardown cancelled."
    return 0
  fi

  # Disassociate EIP before destroy to avoid dependency errors
  local eip_alloc="${EC2_EIP_ALLOCATION_ID:-}"
  if [[ -n "$eip_alloc" ]]; then
    info "Disassociating Elastic IP ${eip_alloc}..."
    if $DRY_RUN; then
      dryrun "aws ec2 disassociate-address --allocation-id ${eip_alloc}"
    else
      local assoc_id
      assoc_id=$(aws ec2 describe-addresses \
        --allocation-ids "$eip_alloc" \
        --query 'Addresses[0].AssociationId' --output text 2>/dev/null || echo "None")
      if [[ "$assoc_id" != "None" && -n "$assoc_id" ]]; then
        aws ec2 disassociate-address --association-id "$assoc_id" || true
        ok "EIP disassociated"
      else
        info "EIP already disassociated"
      fi
    fi
  fi

  # Terraform init
  info "Initialising Terraform..."
  run "terraform -chdir='${TF_DIR}' init \
    -backend-config='bucket=${bucket}' \
    -backend-config='region=${region}' \
    -backend-config='dynamodb_table=${lock_table}' \
    -reconfigure \
    -input=false"

  # Terraform destroy
  info "Running terraform destroy..."
  run "TF_VAR_aws_region='${region}' \
       TF_VAR_key_pair_name='${key_pair}' \
       terraform -chdir='${TF_DIR}' destroy \
         -auto-approve \
         -input=false"

  ok "AWS infrastructure destroyed."

  # Verify nothing is left
  section "Post-Destroy Verification"
  if ! $DRY_RUN; then
    info "Checking for lingering EC2 instances tagged flightdesk-dev..."
    local remaining
    remaining=$(aws ec2 describe-instances \
      --filters "Name=tag:Name,Values=flightdesk-dev" \
                "Name=instance-state-name,Values=running,stopped,pending,stopping" \
      --query 'Reservations[].Instances[].InstanceId' \
      --output text --region "$region" 2>/dev/null || echo "")
    if [[ -n "$remaining" ]]; then
      warn "Instance(s) still present: ${remaining}"
      warn "Force-terminating..."
      aws ec2 terminate-instances --instance-ids $remaining --region "$region" || true
    else
      ok "No EC2 instances remaining"
    fi

    info "Checking for lingering ALBs named flightdesk-dev..."
    local alb_arn
    alb_arn=$(aws elbv2 describe-load-balancers \
      --names flightdesk-dev \
      --query 'LoadBalancers[0].LoadBalancerArn' \
      --output text --region "$region" 2>/dev/null || echo "")
    if [[ -n "$alb_arn" && "$alb_arn" != "None" ]]; then
      warn "ALB still present: ${alb_arn}"
      aws elbv2 delete-load-balancer --load-balancer-arn "$alb_arn" --region "$region" || true
    else
      ok "No ALB remaining"
    fi
  fi
}

# =============================================================================
# MODE: ALL — remote → infra → local
# =============================================================================
cleanup_all() {
  warn "FULL TEARDOWN MODE"
  warn "This will destroy ALL resources: EC2 Docker services, AWS infrastructure, and local Docker resources."
  echo ""

  if ! confirm "Are you absolutely sure you want to destroy EVERYTHING?"; then
    info "Full teardown cancelled."
    exit 0
  fi

  # Step 1 — clean EC2 first so containers gracefully exit before instance dies
  info "Step 1/3 — Cleaning EC2 remote resources..."
  cleanup_remote

  # Step 2 — destroy AWS infrastructure
  info "Step 2/3 — Destroying AWS infrastructure..."
  cleanup_infra

  # Step 3 — clean local Docker
  info "Step 3/3 — Cleaning local Docker resources..."
  cleanup_local

  section "All Resources Destroyed"
  ok "FlightDesk cleanup complete. The environment is fully torn down."
}

# =============================================================================
# ENTRYPOINT
# =============================================================================
main() {
  parse_args "$@"

  echo -e "${BOLD}"
  echo "╔══════════════════════════════════════════════════╗"
  echo "║       FlightDesk — Resource Cleanup Flow         ║"
  echo "╚══════════════════════════════════════════════════╝"
  echo -e "${RESET}"
  echo "  Mode:     ${BOLD}${MODE}${RESET}"
  echo "  Dry-run:  ${BOLD}${DRY_RUN}${RESET}"
  echo "  Auto-yes: ${BOLD}${AUTO_YES}${RESET}"
  $KEEP_DATA   && echo "  Keep DB data: ${BOLD}yes${RESET}"
  $KEEP_IMAGES && echo "  Keep images:  ${BOLD}yes${RESET}"
  echo ""

  case "$MODE" in
    local)  cleanup_local  ;;
    remote) cleanup_remote ;;
    infra)  cleanup_infra  ;;
    all)    cleanup_all    ;;
    *)      error "Unknown mode: $MODE"; usage; exit 1 ;;
  esac
}

main "$@"
