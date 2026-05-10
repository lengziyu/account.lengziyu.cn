#!/usr/bin/env python3

import argparse
import shlex
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
COMPOSE_FILE = "docker-compose.server.yml"


def run(command: str, check: bool = True, capture: bool = False) -> str:
    print(f"$ {command}")
    result = subprocess.run(
        command,
        cwd=ROOT,
        shell=True,
        text=True,
        capture_output=capture,
    )
    if result.stdout and not capture:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    if check and result.returncode != 0:
        raise SystemExit(result.returncode)
    return result.stdout.strip() if capture else ""


def resolve_upstream_ref() -> str:
    upstream = run(
        "git rev-parse --abbrev-ref --symbolic-full-name @{u}",
        check=False,
        capture=True,
    )
    return upstream or "origin/main"


def ensure_repo_clean(auto_stash: bool, hard_reset: bool) -> None:
    status = run("git status --porcelain", capture=True)
    if not status:
        return

    if hard_reset:
        upstream = resolve_upstream_ref()
        run("git fetch --all --prune")
        run("git reset --hard HEAD")
        run("git clean -fd")
        run(f"git reset --hard {shlex.quote(upstream)}")
        return

    if auto_stash:
        run('git stash push -u -m "update.py auto stash"')
        return

    print("检测到本地未提交改动，已停止更新。", file=sys.stderr)
    print("如需自动暂存后继续，请执行：python3 update.py --stash", file=sys.stderr)
    print("如需直接丢弃本地改动并强制对齐 GitHub，请执行：python3 update.py --hard", file=sys.stderr)
    print(status, file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="更新服务器版本并重启 Docker 容器"
    )
    parser.add_argument(
        "--stash",
        action="store_true",
        help="检测到本地改动时自动 stash 后继续",
    )
    parser.add_argument(
        "--hard",
        action="store_true",
        help="直接丢弃本地改动与未跟踪文件，强制对齐到 GitHub 上游版本",
    )
    parser.add_argument(
        "--skip-pull",
        action="store_true",
        help="跳过 git pull，只执行构建与重启",
    )
    parser.add_argument(
        "--force-db-push",
        action="store_true",
        help="无论 schema 是否变化，都执行一次 Prisma db push",
    )
    args = parser.parse_args()

    if args.hard and args.skip_pull:
        print("--hard 和 --skip-pull 不能同时使用。", file=sys.stderr)
        raise SystemExit(1)

    ensure_repo_clean(args.stash, args.hard)

    old_head = run("git rev-parse HEAD", capture=True)

    if not args.skip_pull:
        if args.hard:
            upstream = resolve_upstream_ref()
            run("git fetch --all --prune")
            run(f"git reset --hard {shlex.quote(upstream)}")
        else:
            run("git pull --ff-only")

    new_head = run("git rev-parse HEAD", capture=True)
    changed_files = (
        run(
            f"git diff --name-only {shlex.quote(old_head)} {shlex.quote(new_head)}",
            capture=True,
        ).splitlines()
        if old_head != new_head
        else []
    )

    schema_changed = "prisma/schema.prisma" in changed_files

    run(f"docker compose -f {COMPOSE_FILE} build app")

    if args.force_db_push or schema_changed:
        run(f"docker compose -f {COMPOSE_FILE} run --rm --no-deps app pnpm prisma db push")

    run(f"docker compose -f {COMPOSE_FILE} up -d app")
    run(f"docker compose -f {COMPOSE_FILE} ps")

    print("\n更新完成。")
    print("如果你改了 nginx，请顺手访问正式域名确认页面是否已切到新版本。")


if __name__ == "__main__":
    main()
