#!/usr/bin/env python3
"""Select DEV_ frontend settings and reuse one private build/deploy snapshot."""

import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

SECRET_PREFIX = 'DEV_'
SECRETS_VARIABLE = 'IEUM_FRONTEND_SECRETS_JSON'
BUILD_MARKER = 'IEUM_FRONTEND_BUILD_FROM_SNAPSHOT'
MAX_JSON_BYTES = 96 * 1024
MAX_ENV_BYTES = 48 * 1024
DIRECTORY_PREFIX = 'ieum-frontend-settings.'
CANDIDATE_NAME = 'frontend.env'
SEAL_NAME = 'frontend.sha256'
BUILD_COMMAND = ('npx', '--no-install', 'vite', 'build')
REQUIRED_KEYS = ('VITE_API_URL',)
CI_KEYS = ('NODE_VERSION', 'IMAGE_NAME')
FIXED_VALUES = {'NODE_ENV': 'production', 'HUSKY': '0'}
FORBIDDEN_CHARACTERS = '\x00\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029'
RESERVED_KEYS = (
    'PATH', 'HOME', 'SHELL', 'USER', 'LOGNAME', 'PWD', 'OLDPWD', 'IFS', 'CDPATH',
    'BASH_ENV', 'ENV', 'SHELLOPTS', 'BASHOPTS', 'NODE_OPTIONS', 'NODE_PATH',
    'LD_PRELOAD', 'LD_LIBRARY_PATH', 'GITHUB_TOKEN', SECRETS_VARIABLE, BUILD_MARKER,
    'CONTAINER_NAME', 'FRONTEND_IP', 'DOCKER_NETWORK', 'DOCKER_NETWORK_SUBNET',
    'FRONTEND_ENV_DIR', 'FRONTEND_ENV_FILE',
)
RESERVED_PREFIXES = ('IEUM_', 'GITHUB_', 'RUNNER_', 'ACTIONS_', 'NGINX_')


def canonical_key(key):
    return key.replace('_', '').upper()


RESERVED_CANONICAL_KEYS = frozenset(canonical_key(key) for key in RESERVED_KEYS)
RESERVED_CANONICAL_PREFIXES = tuple(canonical_key(key) for key in RESERVED_PREFIXES)


class FrontendEnvironmentError(ValueError):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise FrontendEnvironmentError('duplicate_secret_name')
        result[key] = value
    return result


def invalid_json_constant(_value):
    raise FrontendEnvironmentError('invalid_json')


def selected_values(payload):
    if not isinstance(payload, str) or not payload:
        raise FrontendEnvironmentError('missing_configuration')
    try:
        encoded = payload.encode('utf-8')
    except UnicodeError:
        raise FrontendEnvironmentError('invalid_encoding') from None
    if len(encoded) > MAX_JSON_BYTES:
        raise FrontendEnvironmentError('secrets_payload_too_large')
    try:
        source = json.loads(payload, object_pairs_hook=unique_object, parse_constant=invalid_json_constant)
    except (json.JSONDecodeError, RecursionError):
        raise FrontendEnvironmentError('invalid_json') from None
    if not isinstance(source, dict):
        raise FrontendEnvironmentError('invalid_json')
    values, seen = {}, set()
    for secret_name, value in source.items():
        name = secret_name.upper()
        if not name.startswith(SECRET_PREFIX):
            continue
        if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', secret_name) is None:
            raise FrontendEnvironmentError('invalid_secret_name')
        key = name[len(SECRET_PREFIX):]
        if re.fullmatch(r'[A-Z_][A-Z0-9_]*', key) is None:
            raise FrontendEnvironmentError('invalid_secret_name')
        canonical = canonical_key(key)
        if canonical in RESERVED_CANONICAL_KEYS or canonical.startswith(RESERVED_CANONICAL_PREFIXES):
            raise FrontendEnvironmentError('reserved_configuration')
        if canonical in seen:
            raise FrontendEnvironmentError('duplicate_configuration_key')
        seen.add(canonical)
        if not isinstance(value, str):
            raise FrontendEnvironmentError('invalid_configuration')
        if any(c in value for c in FORBIDDEN_CHARACTERS):
            raise FrontendEnvironmentError('unsupported_control_character')
        try:
            value.encode('utf-8')
        except UnicodeError:
            raise FrontendEnvironmentError('invalid_encoding') from None
        fixed_key = next((item for item in FIXED_VALUES if canonical_key(item) == canonical), None)
        if fixed_key is not None:
            key = fixed_key
        if key in FIXED_VALUES and value != FIXED_VALUES[key]:
            raise FrontendEnvironmentError('managed_configuration_mismatch')
        values[key] = value
    return values


def build_environment(payload):
    values = selected_values(payload)
    for key in REQUIRED_KEYS:
        if not values.get(key) or values[key].isspace():
            raise FrontendEnvironmentError('missing_required_configuration')
    for key in CI_KEYS + ('HUSKY',):
        values.pop(key, None)
    values['NODE_ENV'] = 'production'
    content = ''.join(key + '=' + values[key] + '\n' for key in sorted(values)).encode('utf-8')
    if len(content) > MAX_ENV_BYTES:
        raise FrontendEnvironmentError('configuration_too_large')
    return content


def write_private_empty(destination, content):
    descriptor = None
    try:
        descriptor = os.open(Path(destination), os.O_WRONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK)
        metadata = os.fstat(descriptor)
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.geteuid() or \
                stat.S_IMODE(metadata.st_mode) != 0o600 or metadata.st_nlink != 1:
            raise FrontendEnvironmentError('unsafe_candidate')
        if metadata.st_size:
            raise FrontendEnvironmentError('candidate_not_empty')
        remaining = memoryview(content)
        while remaining:
            written = os.write(descriptor, remaining)
            if written <= 0:
                raise OSError()
            remaining = remaining[written:]
        os.fsync(descriptor)
    except FrontendEnvironmentError:
        raise
    except (OSError, ValueError, TypeError):
        raise FrontendEnvironmentError('candidate_io_failed') from None
    finally:
        if descriptor is not None:
            try:
                os.close(descriptor)
            except OSError:
                raise FrontendEnvironmentError('candidate_io_failed') from None


def write_candidate(destination, payload):
    write_private_empty(destination, build_environment(payload))


def read_private(path, limit=MAX_ENV_BYTES):
    descriptor = None
    try:
        descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK)
        metadata = os.fstat(descriptor)
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.geteuid() or \
                stat.S_IMODE(metadata.st_mode) != 0o600 or metadata.st_nlink != 1 or metadata.st_size > limit:
            raise FrontendEnvironmentError('unsafe_candidate')
        with os.fdopen(descriptor, 'rb', closefd=False) as source:
            content = source.read(limit + 1)
        if len(content) > limit:
            raise FrontendEnvironmentError('configuration_too_large')
        return content
    except FrontendEnvironmentError:
        raise
    except (OSError, ValueError, TypeError):
        raise FrontendEnvironmentError('candidate_io_failed') from None
    finally:
        if descriptor is not None:
            try:
                os.close(descriptor)
            except OSError:
                raise FrontendEnvironmentError('candidate_io_failed') from None


def settings_directory(directory):
    try:
        path = Path(directory)
        metadata = path.lstat()
        runner = Path(os.environ['RUNNER_TEMP']).resolve()
        if path.is_symlink() or not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid != os.geteuid() or \
                stat.S_IMODE(metadata.st_mode) != 0o700 or path.parent.resolve() != runner or \
                re.fullmatch(re.escape(DIRECTORY_PREFIX) + r'[A-Za-z0-9_-]+', path.name) is None:
            raise FrontendEnvironmentError('unsafe_settings_directory')
        return path
    except FrontendEnvironmentError:
        raise
    except (KeyError, OSError, ValueError, TypeError):
        raise FrontendEnvironmentError('unsafe_settings_directory') from None


def new_empty(path):
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
        os.close(descriptor)
    except OSError:
        raise FrontendEnvironmentError('candidate_io_failed') from None


def candidate_values(content):
    try:
        values = {}
        for line in content.decode('utf-8').split('\n'):
            if not line:
                continue
            key, separator, value = line.partition('=')
            if not separator or key in values:
                raise FrontendEnvironmentError('invalid_candidate')
            values[key] = value
        expected = build_environment(json.dumps({SECRET_PREFIX + k: v for k, v in values.items()}, ensure_ascii=False))
        if expected != content:
            raise FrontendEnvironmentError('invalid_candidate')
        return values
    except UnicodeError:
        raise FrontendEnvironmentError('invalid_encoding') from None


def build_process_environment(content, ambient):
    values = candidate_values(content)
    environment = {key: value for key, value in ambient.items()
                   if not key.upper().startswith('VITE_') and key != SECRETS_VARIABLE}
    environment.update({key: value for key, value in values.items() if key.startswith('VITE_')})
    environment.update({'NODE_ENV': 'production', 'HUSKY': '0', BUILD_MARKER: '1'})
    return environment


def validate_ci(environment):
    for key in CI_KEYS:
        value = environment.get(key)
        if not isinstance(value, str) or not value or value.isspace() or \
                any(c in value for c in FORBIDDEN_CHARACTERS) or value.startswith('-'):
            raise FrontendEnvironmentError('missing_or_invalid_ci_configuration')


def build_settings(directory, payload):
    root = settings_directory(directory)
    content = build_environment(payload)
    # Validate before creating either file; never reuse an earlier run's files.
    new_empty(root / CANDIDATE_NAME)
    new_empty(root / SEAL_NAME)
    write_private_empty(root / CANDIDATE_NAME, content)
    child = build_process_environment(content, os.environ)
    try:
        result = subprocess.run(BUILD_COMMAND, env=child, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError:
        raise FrontendEnvironmentError('frontend_build_failed') from None
    if result.returncode:
        raise FrontendEnvironmentError('frontend_build_failed')
    # The seal stays private too. It checks build/deploy consistency, not hostile
    # mutation by another process already holding this runner account's rights.
    write_private_empty(root / SEAL_NAME, hashlib.sha256(content).hexdigest().encode('ascii') + b'\n')


def verify_settings(directory):
    root = settings_directory(directory)
    content = read_private(root / CANDIDATE_NAME)
    seal = read_private(root / SEAL_NAME, 65)
    if re.fullmatch(rb'[a-f0-9]{64}\n', seal) is None or not hmac.compare_digest(
            hashlib.sha256(content).hexdigest().encode('ascii') + b'\n', seal):
        raise FrontendEnvironmentError('snapshot_mismatch')
    candidate_values(content)
    return root / CANDIDATE_NAME


def cleanup_settings(directory):
    if not directory:
        return
    root = settings_directory(directory)
    try:
        entries = list(root.iterdir())
        if any(path.name not in (CANDIDATE_NAME, SEAL_NAME) for path in entries):
            raise FrontendEnvironmentError('unexpected_settings_file')
        for path in entries:
            path.unlink()
        root.rmdir()
    except FrontendEnvironmentError:
        raise
    except OSError:
        raise FrontendEnvironmentError('settings_cleanup_failed') from None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=('validate-ci', 'build', 'verify', 'cleanup'))
    parser.add_argument('directory', nargs='?', default='')
    arguments = parser.parse_args(argv)
    try:
        if arguments.operation == 'validate-ci':
            validate_ci(os.environ)
        elif arguments.operation == 'build':
            build_settings(arguments.directory, os.environ.get(SECRETS_VARIABLE))
        elif arguments.operation == 'verify':
            verify_settings(arguments.directory)
        else:
            cleanup_settings(arguments.directory)
    except FrontendEnvironmentError as failure:
        print('Frontend environment rejected: ' + failure.code, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
