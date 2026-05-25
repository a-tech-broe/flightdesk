#!/usr/bin/env bash
# =============================================================================
# FlightDesk — AWS Infrastructure Teardown Helper
# =============================================================================
# Convenience wrapper around `terraform destroy` for CI or manual use.
# Destroys every AWS resource managed by infrastructure/terraform/.
#
# Required env vars (or pass as arguments):
#   TF_STATE_BUCKET      S3 bucket holding Terraform state
#   TF_LOCK_TABLE        DynamoDB table for state locking
#   AWS_REGION           AWS region (default: us-east-1)
#   EC2_KEY_PAIR_NAME    Name of the EC2 key pair (Terraform variable)
#   EC2_EIP_ALLOCATION_ID  (optional) Elastic IP allocation ID to disassociate
#
# USAGE
#   AWS_REGION=us-east-1 \
#   TF_STATE_BUCKET=my-bucket \
#   TF_LOCK_TABLE=my-table \
#   EC2_KEY_PAIR_NAME=my-keypair \
#   ./infrastructure/teardown.sh [--auto-approve]
# =============================================================================

set -euo pipefail

BOLD='\033[1m'; RED='\033[0;31m'; GREEN='\033[0;32m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'

info()  { echo -e "${CYAN}${BOLD}[INFO]${RESET}  $*"; }
ok()    { echo -e "${GREEN}${BOLD}[ OK ]${RESET}  $*"; }
warn()  { echo -e "${YELLOW}${BOLD}[WARN]${RESET}  $*"; }
die()   { echo -e "${RED}${BOLD}[FAIL]${RESET}  $*" >&2; exit 1; }

# ── directory of this script ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/terraform"

# ── args ─────────────────────────────────────────────────────────────────────
AUTO_APPROVE=false
for arg in "$@"; do
  [[ "$arg" == "--auto-approve" ]] && AUTO_APPROVE=true
done

# ── validate dependencies ─────────────────────────────────────────────────────
for cmd in terraform aws; do
  command -v "$cmd" &>/dev/null || die "Required command not found: ${cmd}"
done

# ── required vars ─────────────────────────────────────────────────────────────
: "${TF_STATE_BUCKET:?TF_STATE_BUCKET is required}"
: "${TF_LOCK_TABLE:?TF_LOCK_TABLE is required}"
: "${EC2_KEY_PAIR_NAME:?EC2_KEY_PAIR_NAME is required}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════╗"
echo "║    FlightDesk — AWS Infrastructure Teardown     ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo "  Region:       ${AWS_REGION}"
echo "  State bucket: ${TF_STATE_BUCKET}"
echo "  Lock table:   ${TF_LOCK_TABLE}"
echo "  Key pair:     ${EC2_KEY_PAIR_NAME}"
echo ""

# ── confirmation ──────────────────────────────────────────────────────────────
if ! $AUTO_APPROVE; then
  warn "The following AWS resources will be PERMANENTLY DESTROYED:"
  echo "    EC2 instance          flightdesk-dev"
  echo "    Security group        flightdesk-dev"
  echo "    Security group        flightdesk-alb-dev"
  echo "    Application LB        flightdesk-dev"
  echo "    Target group          flightdesk-dev"
  echo "    ALB listener (HTTP)   :80"
  echo "    ALB listener (HTTPS)  :443"
  echo "    ACM certificate       flightadmins.com + www.flightadmins.com"
  echo "    Route53 A record      flightadmins.com"
  echo "    Route53 A record      www.flightadmins.com"
  echo "    Route53 cert validation records"
  echo ""
  echo -en "${YELLOW}${BOLD}Type 'destroy' to confirm: ${RESET}"
  read -r confirm
  [[ "$confirm" == "destroy" ]] || { info "Teardown aborted."; exit 0; }
fi

# ── disassociate EIP (optional, avoids dependency errors) ─────────────────────
if [[ -n "${EC2_EIP_ALLOCATION_ID:-}" ]]; then
  info "Disassociating Elastic IP (alloc: ${EC2_EIP_ALLOCATION_ID})..."
  ASSOC_ID=$(aws ec2 describe-addresses \
    --allocation-ids "${EC2_EIP_ALLOCATION_ID}" \
    --query 'Addresses[0].AssociationId' \
    --output text \
    --region "${AWS_REGION}" 2>/dev/null || echo "None")

  if [[ "$ASSOC_ID" != "None" && -n "$ASSOC_ID" ]]; then
    aws ec2 disassociate-address \
      --association-id "${ASSOC_ID}" \
      --region "${AWS_REGION}" || warn "Could not disassociate EIP — continuing anyway"
    ok "EIP disassociated"
  else
    info "EIP already disassociated"
  fi
fi

# ── terraform init ────────────────────────────────────────────────────────────
info "Initialising Terraform backend..."
terraform -chdir="${TF_DIR}" init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="dynamodb_table=${TF_LOCK_TABLE}" \
  -reconfigure \
  -input=false

# ── terraform destroy ─────────────────────────────────────────────────────────
info "Running terraform destroy..."
TF_VAR_aws_region="${AWS_REGION}" \
TF_VAR_key_pair_name="${EC2_KEY_PAIR_NAME}" \
terraform -chdir="${TF_DIR}" destroy \
  -auto-approve \
  -input=false

ok "Terraform destroy complete."

# ── post-destroy sanity checks ────────────────────────────────────────────────
echo ""
info "Running post-destroy verification..."

# EC2
REMAINING_INSTANCES=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=flightdesk-dev" \
            "Name=instance-state-name,Values=running,stopped,pending,stopping" \
  --query 'Reservations[].Instances[].InstanceId' \
  --output text \
  --region "${AWS_REGION}" 2>/dev/null || echo "")
if [[ -n "$REMAINING_INSTANCES" ]]; then
  warn "EC2 instance(s) still exist: ${REMAINING_INSTANCES}"
  warn "Forcing termination..."
  aws ec2 terminate-instances \
    --instance-ids ${REMAINING_INSTANCES} \
    --region "${AWS_REGION}" || true
else
  ok "EC2: no instances remaining"
fi

# ALB
REMAINING_ALB=$(aws elbv2 describe-load-balancers \
  --names flightdesk-dev \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region "${AWS_REGION}" 2>/dev/null || echo "")
if [[ -n "$REMAINING_ALB" && "$REMAINING_ALB" != "None" ]]; then
  warn "ALB still present: ${REMAINING_ALB}"
  aws elbv2 delete-load-balancer \
    --load-balancer-arn "${REMAINING_ALB}" \
    --region "${AWS_REGION}" || true
else
  ok "ALB: no load balancer remaining"
fi

# Security groups (may take a moment after instance termination)
for SG_NAME in flightdesk-dev flightdesk-alb-dev; do
  SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${SG_NAME}" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region "${AWS_REGION}" 2>/dev/null || echo "")
  if [[ -n "$SG_ID" && "$SG_ID" != "None" ]]; then
    warn "Security group still present: ${SG_NAME} (${SG_ID}) — may be awaiting ENI detach"
  else
    ok "Security group removed: ${SG_NAME}"
  fi
done

echo ""
ok "═══════════════════════════════════════════════════════"
ok "  FlightDesk AWS infrastructure teardown complete."
ok "═══════════════════════════════════════════════════════"
