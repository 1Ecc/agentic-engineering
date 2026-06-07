#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
export LANG=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/ae-init.templates"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_file() {
  [[ -f "$1" ]] || fail "missing file: $1"
}

assert_dir() {
  [[ -d "$1" ]] || fail "missing dir: $1"
}

assert_contains() {
  local file="$1"
  local text="$2"
  grep -Fq -- "$text" "$file" || fail "expected '$text' in $file"
}

assert_not_contains() {
  local file="$1"
  local text="$2"
  if grep -Fq -- "$text" "$file"; then
    fail "did not expect '$text' in $file"
  fi
}

assert_not_line() {
  local file="$1"
  local text="$2"
  if grep -Fxq -- "$text" "$file"; then
    fail "did not expect exact line '$text' in $file"
  fi
}

render_template() {
  local template="$1"
  local project_name="$2"
  local project_goal="$3"
  local escaped_project_name
  local escaped_project_goal
  escaped_project_name="$(printf '%s' "$project_name" | sed -e 's/[\/&]/\\&/g')"
  escaped_project_goal="$(printf '%s' "$project_goal" | sed -e 's/[\/&]/\\&/g')"
  sed \
    -e "s/{{PROJECT_NAME}}/$escaped_project_name/g" \
    -e "s/{{PROJECT_GOAL}}/$escaped_project_goal/g" \
    "$template"
}

write_if_missing() {
  local target="$1"
  local template="$2"
  local project_name="$3"
  local project_goal="$4"

  if [[ ! -e "$target" ]]; then
    mkdir -p "$(dirname "$target")"
    render_template "$template" "$project_name" "$project_goal" > "$target"
  fi
}

build_rule_block() {
  local rules_file="$1"
  printf '%s\n' '<!-- AE:RULES:BEGIN -->'
  printf '%s\n' '<!-- 由 /ae-init 从 ~/.config/agentic-engineering/ae-rules.md 同步,勿手改 -->'
  cat "$rules_file"
  if [[ -s "$rules_file" ]] && [[ "$(tail -c 1 "$rules_file")" != "" ]]; then
    printf '\n'
  fi
  printf '%s\n' '<!-- AE:RULES:END -->'
}

sync_rules() {
  local target="$1"
  local rules_file="$2"
  [[ -f "$rules_file" ]] || return 0

  local begin_count
  local end_count
  begin_count="$(grep -c '<!-- AE:RULES:BEGIN -->' "$target" || true)"
  end_count="$(grep -c '<!-- AE:RULES:END -->' "$target" || true)"

  if [[ "$begin_count" != "$end_count" ]] || [[ "$begin_count" -gt 1 ]]; then
    fail "malformed AE:RULES markers in $target"
  fi

  local block_file
  block_file="$(mktemp)"
  build_rule_block "$rules_file" > "$block_file"

  if [[ "$begin_count" == "0" ]]; then
    {
      printf '\n'
      cat "$block_file"
    } >> "$target"
  else
    local next_file
    next_file="$(mktemp)"
    awk -v block_file="$block_file" '
      BEGIN {
        while ((getline line < block_file) > 0) {
          block = block line ORS
        }
        close(block_file)
      }
      /<!-- AE:RULES:BEGIN -->/ {
        printf "%s", block
        in_block = 1
        next
      }
      /<!-- AE:RULES:END -->/ {
        in_block = 0
        next
      }
      !in_block { print }
    ' "$target" > "$next_file"
    mv "$next_file" "$target"
  fi

  rm -f "$block_file"
}

run_ae_init_contract() {
  local root="$1"
  local project_goal="$2"
  local project_name
  project_name="$(basename "$root")"
  local rules_file="${XDG_CONFIG_HOME:-$HOME/.config}/agentic-engineering/ae-rules.md"

  mkdir -p \
    "$root/reference" \
    "$root/spec/needs" \
    "$root/spec/ADR" \
    "$root/.codex" \
    "$root/.claude" \
    "$root/data" \
    "$root/scripts"

  for keep in \
    "$root/reference/.gitkeep" \
    "$root/spec/needs/.gitkeep" \
    "$root/spec/ADR/.gitkeep" \
    "$root/.codex/.gitkeep" \
    "$root/.claude/.gitkeep" \
    "$root/data/.gitkeep" \
    "$root/scripts/.gitkeep"
  do
    [[ -e "$keep" ]] || : > "$keep"
  done

  write_if_missing "$root/README.md" "$TEMPLATE_DIR/README.md" "$project_name" "$project_goal"
  write_if_missing "$root/AGENTS.md" "$TEMPLATE_DIR/AGENTS.md" "$project_name" "$project_goal"
  write_if_missing "$root/CLAUDE.md" "$TEMPLATE_DIR/CLAUDE.md" "$project_name" "$project_goal"
  write_if_missing "$root/handoff.md" "$TEMPLATE_DIR/handoff.md" "$project_name" "$project_goal"
  write_if_missing "$root/spec/README.md" "$TEMPLATE_DIR/spec/README.md" "$project_name" "$project_goal"
  write_if_missing "$root/spec/INDEX.md" "$TEMPLATE_DIR/spec/INDEX.md" "$project_name" "$project_goal"

  sync_rules "$root/AGENTS.md" "$rules_file"
  sync_rules "$root/CLAUDE.md" "$rules_file"
}

snapshot_files() {
  local root="$1"
  (
    cd "$root"
    find . -type f | sort | while IFS= read -r file; do
      cksum "$file"
    done
  )
}

strip_rule_block() {
  awk '
    /<!-- AE:RULES:BEGIN -->/ { in_block = 1; next }
    /<!-- AE:RULES:END -->/ { in_block = 0; next }
    !in_block { print }
  ' "$1"
}

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

export XDG_CONFIG_HOME="$tmp_root/config"
project="$tmp_root/project-alpha"
mkdir -p "$project"

run_ae_init_contract "$project" "Build a small AE demo project."

for dir in \
  "$project/reference" \
  "$project/spec" \
  "$project/spec/needs" \
  "$project/spec/ADR" \
  "$project/.codex" \
  "$project/.claude" \
  "$project/data" \
  "$project/scripts"
do
  assert_dir "$dir"
done

for file in \
  "$project/README.md" \
  "$project/AGENTS.md" \
  "$project/CLAUDE.md" \
  "$project/handoff.md" \
  "$project/spec/README.md" \
  "$project/spec/INDEX.md" \
  "$project/reference/.gitkeep" \
  "$project/spec/needs/.gitkeep" \
  "$project/spec/ADR/.gitkeep" \
  "$project/.codex/.gitkeep" \
  "$project/.claude/.gitkeep" \
  "$project/data/.gitkeep" \
  "$project/scripts/.gitkeep"
do
  assert_file "$file"
done

assert_not_contains "$project/AGENTS.md" "AE:RULES:BEGIN"
assert_not_contains "$project/CLAUDE.md" "AE:RULES:BEGIN"

before="$(snapshot_files "$project")"
run_ae_init_contract "$project" "Build a small AE demo project."
after="$(snapshot_files "$project")"
[[ "$before" == "$after" ]] || fail "idempotent rerun changed files without rules"

mkdir -p "$XDG_CONFIG_HOME/agentic-engineering"
cat > "$XDG_CONFIG_HOME/agentic-engineering/ae-rules.md" <<'RULES'
- Rule one
- Rule two
RULES

run_ae_init_contract "$project" "Build a small AE demo project."
assert_contains "$project/AGENTS.md" "<!-- AE:RULES:BEGIN -->"
assert_contains "$project/AGENTS.md" "- Rule one"
assert_contains "$project/AGENTS.md" "- Rule two"
assert_contains "$project/CLAUDE.md" "- Rule one"
assert_contains "$project/CLAUDE.md" "- Rule two"

cat >> "$project/AGENTS.md" <<'MANUAL'

## Manual Note

Keep this exact text.
MANUAL

outside_before="$(strip_rule_block "$project/AGENTS.md")"

cat > "$XDG_CONFIG_HOME/agentic-engineering/ae-rules.md" <<'RULES'
- Rule one updated
- Rule two
- Rule three
RULES

run_ae_init_contract "$project" "Build a small AE demo project."

assert_contains "$project/AGENTS.md" "- Rule one updated"
assert_contains "$project/AGENTS.md" "- Rule three"
assert_not_line "$project/AGENTS.md" "- Rule one"
assert_contains "$project/AGENTS.md" "Keep this exact text."

outside_after="$(strip_rule_block "$project/AGENTS.md")"
[[ "$outside_before" == "$outside_after" ]] || fail "rule sync changed text outside AE:RULES block"

echo "ae-init contract tests passed"
