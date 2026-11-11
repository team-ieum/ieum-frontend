#!/usr/bin/env python3
"""MAIN 빌드 이미지와 설정 해시만 전달하고 배포 러너에서 다시 검증합니다."""

import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tarfile

import frontend_env as frontend

ARCHIVE = 'frontend-image.tar'
MANIFEST = 'frontend-image.json'
MAX_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024


def fail(code):
    raise frontend.FrontendEnvironmentError(code)


def file_bytes(path, limit):
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.geteuid() or metadata.st_nlink != 1 or metadata.st_size > limit:
        fail('unsafe_artifact_file')
    return path.read_bytes()


def archive_hash(path):
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.geteuid() or metadata.st_nlink != 1 or \
            not 0 < metadata.st_size <= MAX_ARCHIVE_BYTES:
        fail('unsafe_artifact_file')
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def command(*arguments):
    result = subprocess.run(arguments, capture_output=True, timeout=180)
    if result.returncode:
        fail('artifact_docker_operation_failed')
    return result.stdout.decode().strip()


def identity(image_name, source_sha, environment):
    frontend.validate_ci({'NODE_VERSION': '24', 'IMAGE_NAME': image_name}, 'main')
    if re.fullmatch(r'[a-f0-9]{40}', source_sha) is None:
        fail('invalid_artifact_source')
    run_id, attempt = environment.get('GITHUB_RUN_ID', ''), environment.get('GITHUB_RUN_ATTEMPT', '')
    if re.fullmatch(r'[1-9][0-9]*', run_id) is None or re.fullmatch(r'[1-9][0-9]*', attempt) is None:
        fail('invalid_artifact_run')
    return {'version': 1, 'environment': 'main', 'source_sha': source_sha,
            'run_id': run_id, 'run_attempt': attempt, 'image': image_name + ':' + source_sha}


def settings_hash(directory):
    frontend.verify_settings(directory, 'main')
    root = frontend.settings_directory(directory)
    content = frontend.public_build_settings(frontend.read_private(root / frontend.CANDIDATE_NAME), 'main')
    deployment = frontend.read_private(root / frontend.DEPLOYMENT_NAME, 16384)
    return frontend.snapshot_seal(content, deployment).decode().strip()


def validate_archive(path, image, image_id):
    """docker load 전에 단일 MAIN 이미지의 이름과 config digest를 확인합니다."""
    if re.fullmatch(r'sha256:[a-f0-9]{64}', image_id) is None:
        fail('invalid_artifact_image')
    with tarfile.open(path, mode='r:') as archive:
        members = {}
        for index, member in enumerate(archive):
            name = PurePosixPath(member.name)
            if index > 100000 or name.is_absolute() or '..' in name.parts or member.name in members or \
                    not (member.isfile() or member.isdir()):
                fail('invalid_image_archive')
            members[member.name] = member

        def read(name, limit):
            entry = members.get(name)
            if entry is None or not entry.isfile() or entry.size > limit:
                fail('invalid_image_archive')
            with archive.extractfile(entry) as source:
                return source.read(limit + 1)

        manifest = json.loads(read('manifest.json', 65536), object_pairs_hook=frontend.unique_object)
        if not isinstance(manifest, list) or len(manifest) != 1 or not isinstance(manifest[0], dict):
            fail('invalid_image_archive')
        entry = manifest[0]
        if entry.get('RepoTags') != [image] or not isinstance(entry.get('Config'), str):
            fail('unexpected_image_tag')
        config = read(entry['Config'], 1024 * 1024)
        if not hmac.compare_digest('sha256:' + hashlib.sha256(config).hexdigest(), image_id):
            fail('image_config_mismatch')
        configuration = json.loads(config)
        if not isinstance(configuration, dict) or configuration.get('os') != 'linux' or configuration.get('architecture') != 'amd64':
            fail('invalid_image_platform')
        layers = entry.get('Layers')
        if not isinstance(layers, list) or any(not isinstance(layer, str) or layer not in members or
                not members[layer].isfile() for layer in layers):
            fail('invalid_image_archive')


def pack(directory, settings, image_name, source_sha, environment):
    root = Path(directory)
    if root.is_symlink() or not root.is_dir() or list(root.iterdir()):
        fail('unsafe_artifact_directory')
    manifest = identity(image_name, source_sha, environment)
    manifest['settings_sha256'] = settings_hash(settings)
    image_id = command('docker', 'image', 'inspect', '--format', '{{.Id}}', manifest['image'])
    if re.fullmatch(r'sha256:[a-f0-9]{64}', image_id) is None:
        fail('invalid_artifact_image')
    manifest['image_id'] = image_id
    command('docker', 'image', 'save', '--output', str(root / ARCHIVE), manifest['image'])
    manifest['archive_sha256'] = archive_hash(root / ARCHIVE)
    validate_archive(root / ARCHIVE, manifest['image'], image_id)
    (root / MANIFEST).write_text(json.dumps(manifest, sort_keys=True) + '\n')
    with open(environment['GITHUB_OUTPUT'], 'a') as output:
        for key in ('image_id', 'archive_sha256', 'settings_sha256'):
            output.write(key + '=' + manifest[key] + '\n')
    return manifest


def verify(directory, settings, image_name, source_sha, environment):
    root = Path(directory)
    if root.is_symlink() or not root.is_dir() or {path.name for path in root.iterdir()} != {ARCHIVE, MANIFEST}:
        fail('unsafe_artifact_directory')
    expected = identity(image_name, source_sha, environment)
    manifest = json.loads(file_bytes(root / MANIFEST, 8192), object_pairs_hook=frontend.unique_object)
    keys = set(expected) | {'image_id', 'archive_sha256', 'settings_sha256'}
    if not isinstance(manifest, dict) or set(manifest) != keys or type(manifest.get('version')) is not int or \
            any(manifest.get(key) != value for key, value in expected.items()):
        fail('artifact_identity_mismatch')
    for key in ('archive_sha256', 'settings_sha256'):
        value = environment.get('IEUM_EXPECTED_' + key.upper(), '')
        if re.fullmatch(r'[a-f0-9]{64}', value) is None or manifest[key] != value:
            fail('artifact_digest_mismatch')
    if manifest['image_id'] != environment.get('IEUM_EXPECTED_IMAGE_ID'):
        fail('artifact_identity_mismatch')
    if not hmac.compare_digest(settings_hash(settings), manifest['settings_sha256']):
        fail('artifact_settings_changed')
    if not hmac.compare_digest(archive_hash(root / ARCHIVE), manifest['archive_sha256']):
        fail('artifact_archive_changed')
    validate_archive(root / ARCHIVE, manifest['image'], manifest['image_id'])
    return manifest


def load(directory, settings, image_name, source_sha, environment):
    manifest = verify(directory, settings, image_name, source_sha, environment)
    command('docker', 'image', 'load', '--input', str(Path(directory) / ARCHIVE))
    loaded = command('docker', 'image', 'inspect', '--format', '{{.Id}}', manifest['image'])
    if not hmac.compare_digest(loaded, manifest['image_id']):
        fail('loaded_image_mismatch')
    # 이후 배포는 tag 대신 검증한 immutable ID를 전달합니다.
    with open(environment['GITHUB_OUTPUT'], 'a') as output:
        output.write('image_id=' + loaded + '\n')


def cleanup(directory):
    if not directory:
        return
    root = Path(directory)
    metadata = root.lstat()
    if root.is_symlink() or not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid != os.geteuid() or \
            root.parent.resolve() != Path(os.environ['RUNNER_TEMP']).resolve() or \
            re.fullmatch(r'ieum-frontend-(?:bundle|artifact)\.[A-Za-z0-9_-]+', root.name) is None:
        fail('unsafe_artifact_directory')
    entries = list(root.iterdir())
    if any(path.name not in (ARCHIVE, MANIFEST) or path.is_dir() for path in entries):
        fail('unexpected_artifact_file')
    for path in entries:
        path.unlink()
    root.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=('pack', 'verify', 'load', 'cleanup'))
    parser.add_argument('--directory', required=True)
    parser.add_argument('--settings-directory', default='')
    args = parser.parse_args()
    try:
        if args.operation == 'cleanup':
            cleanup(args.directory)
        else:
            operation = {'pack': pack, 'verify': verify, 'load': load}[args.operation]
            operation(args.directory, args.settings_directory, os.environ.get('IMAGE_NAME', ''),
                      os.environ.get('GITHUB_SHA', ''), os.environ)
    except (frontend.FrontendEnvironmentError, OSError, ValueError, TypeError, KeyError,
            UnicodeError, tarfile.TarError, subprocess.SubprocessError) as error:
        code = error.code if isinstance(error, frontend.FrontendEnvironmentError) else 'artifact_operation_failed'
        print('Frontend artifact rejected: ' + code, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
