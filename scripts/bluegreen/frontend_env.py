#!/usr/bin/env python3
"""Select DEV_ frontend settings and reuse one private build/deploy snapshot."""

import argparse
import hashlib
import hmac
import ipaddress
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
DEPLOYMENT_NAME = 'frontend-deployment.json'
DEPLOYMENT_KEYS = ('DATA_DOCKER_NETWORK', 'DATA_DOCKER_NETWORK_SUBNET',
    'POSTGRES_CONTAINER_NAME', 'REDIS_CONTAINER_NAME', 'MONGO_CONTAINER_NAME',
    *(color + '_' + key for color in ('BLUE', 'GREEN') for key in
      ('DOCKER_NETWORK', 'DOCKER_NETWORK_SUBNET', 'CONTAINER_NAME', 'FRONTEND_IP', 'BACKEND_IP', 'AGENT_IP', 'FRONTEND_ENV_DIR', 'FRONTEND_ENV_FILE')))
RUNTIME_ROOT = Path('/home/kwung/deploy/bluegreen/runtime')
ROUTES = {'legacy': ('10.10.10.10', '10.10.10.11', '10.10.10.14')}

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
        if key.startswith('COM_'):
            key = key[4:]
            if key.startswith(('BLUE_', 'GREEN_')):
                raise FrontendEnvironmentError('invalid_secret_scope')
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
        fixed_key = next((item for item in (*FIXED_VALUES, *DEPLOYMENT_KEYS, *CI_KEYS) if canonical_key(item) == canonical), None)
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
    for key in CI_KEYS + DEPLOYMENT_KEYS + ('HUSKY',):
        values.pop(key, None)
    values['NODE_ENV'] = 'production'
    content = ''.join(key + '=' + values[key] + '\n' for key in sorted(values)).encode('utf-8')
    if len(content) > MAX_ENV_BYTES:
        raise FrontendEnvironmentError('configuration_too_large')
    return content


def validate_split_settings(value):
    try:
        if not isinstance(value, dict) or set(value) != {'version', 'data', 'blue', 'green'} or type(value['version']) is not int or value['version'] != 2:
            raise ValueError()
        data = value['data']
        if not isinstance(data, dict) or set(data) != {'network', 'subnet', 'stores'} or \
                not isinstance(data['stores'], dict) or set(data['stores']) != {'postgres', 'redis', 'mongo'}:
            raise ValueError()
        networks, names, addresses = [], set(), set()
        reserved = {'ieum-' + app for app in ('frontend', 'backend', 'agent')} | \
            {'ieum-' + color + '-' + app for color in ('blue', 'green') for app in ('backend', 'agent')}
        store_names = list(data['stores'].values())
        for color in ('blue', 'green'):
            slot = value[color]
            if not isinstance(slot, dict) or set(slot) != {'network', 'subnet', 'containerName', 'ip', 'backendIp', 'agentIp', 'envDir', 'envFile'} or \
                    any(not isinstance(v, str) or any(ord(c) < 32 or c in '\x7f\x85\u2028\u2029' for c in v) for v in slot.values()):
                raise ValueError()
            name = slot['containerName']
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', name) or name in reserved or name in names:
                raise ValueError()
            names.add(name)
            directory, file = Path(slot['envDir']), Path(slot['envFile'])
            allowed = RUNTIME_ROOT / color
            if str(directory) != slot['envDir'] or '..' in directory.parts or \
                    (directory != allowed and allowed not in directory.parents) or \
                    file.parent != directory or str(file) != slot['envFile'] or file.name not in {'frontend.env', '.env'} or \
                    any(not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', part) for part in directory.relative_to(allowed).parts):
                raise ValueError()
        for slot in (value['blue'], value['green'], data):
            if not isinstance(slot['network'], str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,62}', slot['network']) or slot['network'] in {'host', 'none', 'bridge'}:
                raise ValueError()
            network = ipaddress.IPv4Network(slot['subnet'], strict=True)
            private_blocks = [ipaddress.IPv4Network(block) for block in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')]
            if str(network) != slot['subnet'] or not any(network.subnet_of(block) for block in private_blocks):
                raise ValueError()
            if any(slot['network'] == existing_name or network.overlaps(existing_net) for existing_name, existing_net in networks):
                raise ValueError()
            networks.append((slot['network'], network))
        if value['blue']['network'] != 'ieum_net_blue' or value['green']['network'] != 'ieum_net_green':
            raise ValueError()
        for container in store_names:
            if not isinstance(container, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,127}', container) or container in reserved | names:
                raise ValueError()
        if len(set(store_names)) != 3:
            raise ValueError()
        for color in ('blue', 'green'):
            slot = value[color]; network = ipaddress.IPv4Network(slot['subnet'])
            for key in ('ip', 'backendIp', 'agentIp'):
                address = ipaddress.IPv4Address(slot[key])
                if str(address) != slot[key] or address not in network or address in (network.network_address, network.broadcast_address) or \
                        slot[key] in addresses or slot[key] in ROUTES['legacy']:
                    raise ValueError()
                addresses.add(slot[key])
        return value
    except (AttributeError, TypeError, ValueError, KeyError):
        raise ValueError('Invalid separated-network deployment settings') from None


def build_deployment(payload):
    values = selected_values(payload)
    if any(not values.get(key) or values[key].isspace() for key in DEPLOYMENT_KEYS):
        raise FrontendEnvironmentError('missing_deployment_configuration')
    try:
        value = {'version': 2, 'data': {'network': values['DATA_DOCKER_NETWORK'],
            'subnet': values['DATA_DOCKER_NETWORK_SUBNET'], 'stores': {
                name: values[key] for name, key in [('postgres', 'POSTGRES_CONTAINER_NAME'),
                    ('redis', 'REDIS_CONTAINER_NAME'), ('mongo', 'MONGO_CONTAINER_NAME')]}}}
        for color in ('blue', 'green'):
            prefix = color.upper() + '_'
            value[color] = {key: values[prefix + source] for key, source in [
                ('network', 'DOCKER_NETWORK'), ('subnet', 'DOCKER_NETWORK_SUBNET'),
                ('containerName', 'CONTAINER_NAME'), ('ip', 'FRONTEND_IP'),
                ('backendIp', 'BACKEND_IP'), ('agentIp', 'AGENT_IP'),
                ('envDir', 'FRONTEND_ENV_DIR'), ('envFile', 'FRONTEND_ENV_FILE')]}
        validate_split_settings(value)
        content = (json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n').encode()
        if len(content) > 16384: raise ValueError()
        return content
    except (ValueError, TypeError):
        raise FrontendEnvironmentError('invalid_deployment_configuration') from None


def snapshot_seal(content, deployment):
    return hashlib.sha256(content + b'\0' + deployment).hexdigest().encode('ascii') + b'\n'


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
                   if not key.upper().startswith('VITE_') and key != SECRETS_VARIABLE and key.upper() not in DEPLOYMENT_KEYS}
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
    deployment = build_deployment(payload)
    # Validate before creating either file; never reuse an earlier run's files.
    new_empty(root / CANDIDATE_NAME)
    new_empty(root / SEAL_NAME)
    new_empty(root / DEPLOYMENT_NAME)
    write_private_empty(root / DEPLOYMENT_NAME, deployment)
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
    write_private_empty(root / SEAL_NAME, snapshot_seal(content, deployment))


def verify_settings(directory):
    root = settings_directory(directory)
    content = read_private(root / CANDIDATE_NAME)
    seal = read_private(root / SEAL_NAME, 65)
    deployment = read_private(root / DEPLOYMENT_NAME, 16384)
    if re.fullmatch(rb'[a-f0-9]{64}\n', seal) is None or not hmac.compare_digest(
            snapshot_seal(content, deployment), seal):
        raise FrontendEnvironmentError('snapshot_mismatch')
    candidate_values(content)
    return root / CANDIDATE_NAME


def cleanup_settings(directory):
    if not directory:
        return
    root = settings_directory(directory)
    try:
        entries = list(root.iterdir())
        if any(path.name not in (CANDIDATE_NAME, SEAL_NAME, DEPLOYMENT_NAME) for path in entries):
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
