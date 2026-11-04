#!/usr/bin/env python3
"""포트를 공개하지 않고 실제 nginx worker가 공개 파일을 제공하는지 검사합니다."""

import argparse
import json
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time
import uuid


def command(*args, timeout=20):
    result = subprocess.run(args, capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('frontend_image_operation_failed')
    return result.stdout.strip()


def fetch(container, path):
    return subprocess.run(
        ['docker', 'exec', container, 'wget', '-q', '-T', '3', '-O', '-',
         'http://127.0.0.1' + path],
        capture_output=True, timeout=5,
    )


def interrupted(signum, _frame):
    raise SystemExit(128 + signum)


def cleanup_probe(container, cidfile, identity, name, run_id, creation_attempted):
    if container is None and cidfile.exists():
        candidate = cidfile.read_text().strip()
        # 기록 중 끊긴 빈 파일과 부분 CID는 신뢰하지 않고 이름과 label로 회수합니다.
        if re.fullmatch(r'[a-f0-9]{64}', candidate):
            container = candidate
    if container is None:
        if not creation_attempted:
            return
        # run 응답과 cidfile보다 생성이 늦을 수 있어 이번 실행의 이름과 label로만 재조회합니다.
        deadline = time.monotonic() + 10
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise RuntimeError('frontend_probe_cleanup_unconfirmed')
            try:
                present = command('docker', 'ps', '--all', '--no-trunc', '--filter',
                    'name=^/' + name + '$', '--filter', 'label=ieum.frontend.smoke.run=' + run_id,
                    '--format', '{{.ID}}', timeout=min(5, remaining)).decode().splitlines()
            except (RuntimeError, OSError, subprocess.SubprocessError, UnicodeError):
                raise RuntimeError('frontend_probe_cleanup_unconfirmed') from None
            if present:
                if len(present) != 1 or not re.fullmatch(r'[a-f0-9]{64}', present[0]):
                    raise RuntimeError('frontend_probe_identity_changed')
                container = present[0]
                break
            time.sleep(0.25)
    else:
        try:
            present = command('docker', 'ps', '--all', '--no-trunc', '--filter',
                'id=' + container, '--format', '{{.ID}}', timeout=5).decode().splitlines()
        except (RuntimeError, OSError, subprocess.SubprocessError, UnicodeError):
            raise RuntimeError('frontend_probe_cleanup_unconfirmed') from None
        if not present:
            # CID가 확정된 컨테이너는 --rm로 먼저 사라졌다면 추가 생성 가능성이 없습니다.
            return
        if present != [container]:
            raise RuntimeError('frontend_probe_identity_changed')
    try:
        details = json.loads(command('docker', 'inspect', container, timeout=5))[0]
        labels = details['Config'].get('Labels', {})
        matches = (details['Id'] == container and details['Image'] == identity and
            details['Name'] == '/' + name and labels.get('ieum.frontend.smoke') == 'true' and
            labels.get('ieum.frontend.smoke.run') == run_id)
    except (RuntimeError, OSError, subprocess.SubprocessError, UnicodeError, ValueError,
            KeyError, IndexError, TypeError, AttributeError):
        raise RuntimeError('frontend_probe_cleanup_unconfirmed') from None
    if not matches:
        raise RuntimeError('frontend_probe_identity_changed')
    try:
        command('docker', 'rm', '--force', container, timeout=10)
    except (RuntimeError, OSError, subprocess.SubprocessError):
        raise RuntimeError('frontend_probe_cleanup_unconfirmed') from None


def check_image(image):
    container = None
    directory = tempfile.TemporaryDirectory(prefix='ieum-frontend-smoke-')
    cidfile = Path(directory.name) / 'container.cid'
    identity = None
    run_id = uuid.uuid4().hex
    name = 'ieum-frontend-smoke-' + run_id
    creation_attempted = False
    try:
        identity = command('docker', 'image', 'inspect', '--format', '{{.Id}}', image).decode()
        if not re.fullmatch(r'sha256:[a-f0-9]{64}', identity):
            raise RuntimeError('frontend_image_identity_unavailable')
        creation_attempted = True
        created = command('docker', 'run', '--detach', '--rm', '--name', name, '--network', 'none',
                          '--cidfile', str(cidfile), '--log-driver', 'none', '--label', 'ieum.frontend.smoke=true',
                          '--label', 'ieum.frontend.smoke.run=' + run_id, identity).decode()
        if not re.fullmatch(r'[a-f0-9]{64}', created):
            raise RuntimeError('frontend_probe_identity_unavailable')
        container = created
        deadline = time.monotonic() + 30
        while True:
            response = fetch(container, '/index.html')
            if response.returncode == 0 and response.stdout:
                break
            if time.monotonic() >= deadline:
                raise RuntimeError('frontend_index_http_check_failed')
            time.sleep(0.25)
        match = re.search(rb'(?:src|href)="(/assets/[^\"]+)"', response.stdout)
        if match is None:
            raise RuntimeError('frontend_asset_reference_missing')
        asset_path = match.group(1).decode('utf-8')
        asset = fetch(container, asset_path)
        if asset.returncode or not asset.stdout:
            raise RuntimeError('frontend_asset_http_check_failed')
        missing = subprocess.run(
            ['docker', 'exec', container, 'wget', '-S', '-T', '3', '-O', '/dev/null',
             'http://127.0.0.1/assets/__ieum_missing_asset_probe__.js'],
            capture_output=True, timeout=5,
        )
        if missing.returncode == 0 or re.search(rb'HTTP/[0-9.]+\s+404\b', missing.stderr) is None:
            raise RuntimeError('frontend_missing_asset_must_return_404')
    finally:
        try:
            cleanup_probe(container, cidfile, identity, name, run_id, creation_attempted)
        finally:
            directory.cleanup()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    args = parser.parse_args()
    signal.signal(signal.SIGTERM, interrupted)
    try:
        check_image(args.image)
    except (RuntimeError, OSError, subprocess.SubprocessError, UnicodeError) as error:
        message = str(error) if isinstance(error, RuntimeError) else 'frontend_http_check_failed'
        print('Frontend image rejected: ' + message, file=sys.stderr)
        return 1
    print('Frontend image HTTP checks passed: index 200, asset 200, missing asset 404')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
