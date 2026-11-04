"""Local DEV_ frontend regressions. All credentials, builds and controllers are synthetic."""
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import shlex
import signal
import stat
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = Path(__file__).with_name('frontend_env.py')
WORKFLOW = ROOT / '.github/workflows/frontend-dev-server.yml'
spec = importlib.util.spec_from_file_location('frontend_env_under_test', SCRIPT)
frontend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(frontend)
SECRET = 'synthetic-private-value-never-log'
URL = 'https://frontend-test.example.invalid'
DEPLOYMENT = {'DEV_COM_DATA_DOCKER_NETWORK': 'ieum_net_data', 'DEV_COM_DATA_DOCKER_NETWORK_SUBNET': '10.30.10.0/24',
    'DEV_COM_POSTGRES_CONTAINER_NAME': 'ieum-postgres', 'DEV_COM_REDIS_CONTAINER_NAME': 'ieum-redis', 'DEV_COM_MONGO_CONTAINER_NAME': 'ieum-mongo'}
for _color, _subnet in [('BLUE', '10.20.10'), ('GREEN', '10.10.10')]:
    DEPLOYMENT.update({'DEV_' + _color + '_CONTAINER_NAME': 'custom-' + _color.lower() + '-frontend',
        'DEV_' + _color + '_DOCKER_NETWORK': 'ieum_net_' + _color.lower(),
        'DEV_' + _color + '_DOCKER_NETWORK_SUBNET': _subnet + '.0/24',
        'DEV_' + _color + '_FRONTEND_IP': _subnet + '.40',
        'DEV_' + _color + '_BACKEND_IP': _subnet + '.41',
        'DEV_' + _color + '_AGENT_IP': _subnet + '.44',
        'DEV_' + _color + '_FRONTEND_ENV_DIR': '/home/kwung/deploy/bluegreen/runtime/' + _color.lower() + '/custom',
        'DEV_' + _color + '_FRONTEND_ENV_FILE': '/home/kwung/deploy/bluegreen/runtime/' + _color.lower() + '/custom/frontend.env'})


def payload(extra=None):
    return json.dumps({'DEV_COM_VITE_API_URL': URL, 'DEV_COM_NODE_VERSION': '24',
                       'DEV_COM_IMAGE_NAME': 'ieum-frontend-dev', **DEPLOYMENT, **(extra or {})})


def records(content):
    return dict(line.split('=', 1) for line in content.decode().splitlines())


def python_subprocess_environment(environment):
    # setup-python의 공유 라이브러리 경로만 보존하고 자격 증명과 Python 설정은 상속하지 않습니다.
    selected = {}
    if value := os.environ.get('LD_LIBRARY_PATH'):
        selected['LD_LIBRARY_PATH'] = value
    selected.update(environment)
    return selected


CONTROLLER_LITERAL = '/home/kwung/deploy/bluegreen/bluegreen.py'
BUILDER_LITERAL = 'scripts/bluegreen/frontend_env.py'


def guard_workflow_shell(code, controllers, builders):
    if code.count(CONTROLLER_LITERAL) != controllers or code.count(BUILDER_LITERAL) != builders:
        raise AssertionError('Workflow test command paths changed')


def rewrite_workflow_shell(code, controller, controllers, builders):
    guard_workflow_shell(code, controllers, builders)
    builder = shlex.quote(str(SCRIPT))
    script = code.replace(BUILDER_LITERAL, builder).replace(CONTROLLER_LITERAL, shlex.quote(str(controller)))
    assert CONTROLLER_LITERAL not in script, 'Production controller remains in workflow test'
    assert script.count(builder) == builders and BUILDER_LITERAL not in script.replace(builder, ''), 'Builder substitution failed'
    return script


def run_workflow_shell(script, *, cwd, env, timeout=6):
    process = subprocess.Popen(['bash', '-c', script], cwd=cwd, env=python_subprocess_environment(env),
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        try: os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError: pass
        stdout, stderr = process.communicate()
        raise subprocess.TimeoutExpired(process.args, timeout, output=stdout, stderr=stderr) from None
    return subprocess.CompletedProcess(process.args, process.returncode, stdout, stderr)


class SelectionTest(unittest.TestCase):
    def reject(self, source):
        with self.assertRaises(frontend.FrontendEnvironmentError) as caught:
            frontend.build_environment(source)
        self.assertNotIn(SECRET, str(caught.exception))
        self.assertRegex(str(caught.exception), r'\A[a-z_]+\Z')

    def test_defaults_and_ci_metadata_are_not_runtime_values(self):
        self.assertEqual(records(frontend.build_environment(payload())),
                         {'NODE_ENV': 'production', 'VITE_API_URL': URL})

    def test_new_prefixed_values_and_empty_values_are_automatic(self):
        self.assertEqual(records(frontend.build_environment(payload({'DEV_VITE_NEW': SECRET,
            'DEV_RUNTIME_ONLY': '', 'DEV_FEATURE_TOKEN': SECRET}))),
            {'NODE_ENV': 'production', 'VITE_API_URL': URL, 'VITE_NEW': SECRET,
             'RUNTIME_ONLY': '', 'FEATURE_TOKEN': SECRET})

    def test_nondev_secrets_and_old_server_values_are_ignored(self):
        content = frontend.build_environment(payload({'MAIN_TOKEN': SECRET, 'GITHUB_TOKEN': SECRET,
            'AWS_SECRET_ACCESS_KEY': SECRET, 'VITE_API_URL': 'wrong', 'DEVELOPMENT_TOKEN': SECRET,
            'DEVX_TOKEN': SECRET, 'FRONTEND_ENV_FILE': SECRET}))
        self.assertEqual(records(content), {'NODE_ENV': 'production', 'VITE_API_URL': URL})

    def test_case_normalization_and_deterministic_sort(self):
        source = json.dumps({'dev_vite_api_url': URL, 'Dev_New_Value': '서울'})
        self.assertEqual(frontend.build_environment(source),
                         ('NEW_VALUE=서울\nNODE_ENV=production\nVITE_API_URL=' + URL + '\n').encode())

    def test_required_api_rejects_missing_empty_and_whitespace(self):
        for value in (None, '', ' \t '):
            self.reject('{}' if value is None else json.dumps({'DEV_VITE_API_URL': value}))

    def test_fixed_production_and_husky_accept_only_existing_values(self):
        self.assertEqual(records(frontend.build_environment(payload({'DEV_NODE_ENV': 'production',
            'DEV_HUSKY': '0'}))), {'NODE_ENV': 'production', 'VITE_API_URL': URL})
        for key in ('NODE_ENV', 'NODEENV', 'HUSKY', 'H_USKY'):
            self.reject(payload({'DEV_' + key: 'changed'}))

    def test_reserved_process_and_deployment_keys_are_rejected(self):
        for key in frontend.RESERVED_KEYS + ('NGINX_ENVSUBST_TEMPLATE_DIR', 'IEUM_FUTURE_CONTROL'):
            for form in (key, key.lower(), key.replace('_', '')):
                with self.subTest(key=key, form=form):
                    self.reject(payload({'DEV_' + form: SECRET}))

    def test_duplicate_case_and_relaxed_names_are_rejected(self):
        self.reject(payload({'dev_com_vite_api_url': URL}))
        self.reject(payload({'DEV_VITEAPIURL': URL}))
        self.reject(payload({'DEV_VITE__API_URL': URL}))
        self.reject(payload()[:-1] + ',"DEV_VITE_API_URL":"duplicate"}')

    def test_invalid_json_shape_duplicate_names_and_constants(self):
        for source in (None, '', '[]', 'null', '1', '{', json.dumps(SECRET),
                       '{"GITHUB_TOKEN":"one","GITHUB_TOKEN":"two"}',
                       payload()[:-1] + ',"MAIN_NONSTANDARD":NaN}',
                       '[' * 1500 + '0' + ']' * 1500):
            self.reject(source)

    def test_invalid_suffix_and_selected_types_are_sanitized(self):
        for suffix in ('', '1BAD', 'BAD-KEY', 'BAD KEY', '서울', 'ß'):
            self.reject(payload({'DEV_' + suffix: SECRET}))
        for value in (None, 1, True, [], {}):
            self.reject(payload({'DEV_NEW_OPTION': value}))

    def test_literal_values_are_preserved_and_never_interpreted(self):
        value = '  ' + SECRET + '="${HOME}" $(echo value) `echo other` # 서울  '
        self.assertEqual(records(frontend.build_environment(payload({'DEV_VITE_NEW': value})))['VITE_NEW'], value)

    def test_all_record_controls_and_invalid_unicode_are_rejected(self):
        for control in frontend.FORBIDDEN_CHARACTERS:
            self.reject(payload({'DEV_VITE_NEW': SECRET + control + 'HIDDEN=value'}))
        self.reject(payload({'DEV_VITE_NEW': SECRET + '\ud800'}))
        self.reject(payload() + '\ud800')

    def test_raw_json_limit_counts_unselected_values(self):
        values = {'DEV_VITE_API_URL': URL, 'MAIN_PADDING': ''}
        overhead = len(json.dumps(values).encode())
        values['MAIN_PADDING'] = 'x' * (frontend.MAX_JSON_BYTES - overhead)
        self.assertEqual(len(json.dumps(values).encode()), frontend.MAX_JSON_BYTES)
        self.assertEqual(records(frontend.build_environment(json.dumps(values)))['VITE_API_URL'], URL)
        values['MAIN_PADDING'] += 'x'
        self.reject(json.dumps(values))

    def test_candidate_byte_limit_accepts_boundary_and_rejects_excess(self):
        base = len(frontend.build_environment(payload())) + len('VITE_NEW=\n')
        value = 'x' * (frontend.MAX_ENV_BYTES - base)
        self.assertEqual(len(frontend.build_environment(payload({'DEV_VITE_NEW': value}))), frontend.MAX_ENV_BYTES)
        self.reject(payload({'DEV_VITE_NEW': value + 'x'}))
        self.reject(json.dumps({'DEV_VITE_API_URL': URL, 'DEV_VITE_NEW': '한' * (frontend.MAX_ENV_BYTES // 2)}, ensure_ascii=False))

    def test_deleted_new_key_is_removed_in_complete_rebuild(self):
        self.assertIn('VITE_REMOVED', records(frontend.build_environment(payload({'DEV_VITE_REMOVED': SECRET}))))
        self.assertNotIn('VITE_REMOVED', records(frontend.build_environment(payload())))

    def test_ci_metadata_validation_is_separate(self):
        frontend.validate_ci({'NODE_VERSION': '24', 'IMAGE_NAME': 'ieum-frontend-dev'})
        for value in ('', ' \t ', 'bad\nvalue', '-bad'):
            for key in frontend.CI_KEYS:
                values = {'NODE_VERSION': '24', 'IMAGE_NAME': 'ieum-frontend-dev', key: value}
                with self.assertRaises(frontend.FrontendEnvironmentError):
                    frontend.validate_ci(values)


class DeploymentSettingsTest(unittest.TestCase):
    def test_selected_deployment_values_are_separate_from_app_candidate(self):
        config = json.loads(frontend.build_deployment(payload()))
        self.assertEqual(config['data']['network'], 'ieum_net_data')
        self.assertEqual(config['blue']['containerName'], 'custom-blue-frontend')
        self.assertEqual(config['green']['ip'], '10.10.10.40')
        app = records(frontend.build_environment(payload()))
        self.assertTrue(set(frontend.DEPLOYMENT_KEYS).isdisjoint(app))

    def test_each_deployment_secret_is_required_without_fallback(self):
        for key in DEPLOYMENT:
            for value in ('', '   '):
                with self.subTest(key=key), self.assertRaises(frontend.FrontendEnvironmentError):
                    frontend.build_deployment(payload({key: value}))
            values = json.loads(payload()); values.pop(key)
            with self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_deployment(json.dumps(values))

    def test_conflicting_names_ips_and_invalid_network_or_paths_are_rejected(self):
        invalid = [
            {'DEV_BLUE_CONTAINER_NAME': 'bad; command'},
            {'DEV_GREEN_CONTAINER_NAME': DEPLOYMENT['DEV_BLUE_CONTAINER_NAME']},
            {'DEV_GREEN_FRONTEND_IP': DEPLOYMENT['DEV_BLUE_FRONTEND_IP']},
            {'DEV_BLUE_FRONTEND_IP': '127.0.0.1'},
            {'DEV_BLUE_FRONTEND_IP': '10.10.10.255'},
            {'DEV_BLUE_FRONTEND_IP': '10.10.10.040'},
            {'DEV_BLUE_DOCKER_NETWORK': 'host'},
            {'DEV_BLUE_DOCKER_NETWORK_SUBNET': '10.10.10.7/24'},
            {'DEV_BLUE_FRONTEND_ENV_DIR': '/etc'},
            {'DEV_BLUE_FRONTEND_ENV_FILE': '/etc/passwd'},
            {'DEV_BLUE_FRONTEND_ENV_DIR': '/home/kwung/deploy/bluegreen/runtime/blue/../green'},
            {'DEV_BLUE_FRONTEND_ENV_FILE': DEPLOYMENT['DEV_BLUE_FRONTEND_ENV_DIR'] + '/backend.env'},
        ]
        for extra in invalid:
            with self.subTest(keys=list(extra)), self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_deployment(payload(extra))

    def test_metadata_alias_collisions_are_rejected(self):
        with self.assertRaises(frontend.FrontendEnvironmentError):
            frontend.build_deployment(payload({'DEV_BLUECONTAINERNAME': 'duplicate'}))

    def test_deployment_directories_cannot_overlap_other_app_snapshot_names(self):
        root = '/home/kwung/deploy/bluegreen/runtime/blue'
        for suffix in ('backend.env', 'agent.env', 'a.b', '.hidden', 'custom/x.y'):
            directory = root + '/' + suffix
            with self.subTest(suffix=suffix), self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_deployment(payload({'DEV_BLUE_FRONTEND_ENV_DIR': directory,
                    'DEV_BLUE_FRONTEND_ENV_FILE': directory + '/frontend.env'}))
        for suffix in ('', '/custom', '/custom/sub'):
            directory = root + suffix
            content = frontend.build_deployment(payload({'DEV_BLUE_FRONTEND_ENV_DIR': directory,
                'DEV_BLUE_FRONTEND_ENV_FILE': directory + '/frontend.env'}))
            self.assertEqual(json.loads(content)['blue']['envDir'], directory)


    def test_com_prefix_is_removed_and_common_values_do_not_leak_with_com_names(self):
        values = records(frontend.build_environment(payload({'DEV_COM_VITE_NEW_OPTION': 'enabled'})))
        self.assertEqual(values['VITE_API_URL'], URL)
        self.assertEqual(values['VITE_NEW_OPTION'], 'enabled')
        self.assertFalse(any(key.startswith('COM_') for key in values))
        self.assertEqual(len(frontend.DEPLOYMENT_KEYS), 21)

    def test_common_and_direct_names_collide_after_mapping_and_reservations_still_apply(self):
        for extra in ({'DEV_VITE_API_URL': URL}, {'DEV_COM_NODE_OPTIONS': '--require=other'},
                      {'DEV_COM_BLUE_FRONTEND_IP': '10.20.10.40'}, {'DEV_COM_': 'empty'}):
            with self.subTest(extra=extra), self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_deployment(payload(extra))

    def test_separate_network_subnets_must_not_overlap_and_stores_must_be_unique(self):
        for extra in ({'DEV_BLUE_DOCKER_NETWORK_SUBNET': '10.10.10.0/24'},
                      {'DEV_COM_DATA_DOCKER_NETWORK_SUBNET': '10.20.10.0/24'},
                      {'DEV_COM_MONGO_CONTAINER_NAME': 'ieum-redis'},
                      {'DEV_COM_DATA_DOCKER_NETWORK': 'ieum_net_green'},
                      {'DEV_BLUE_AGENT_IP': '10.20.10.41'}):
            with self.subTest(extra=extra), self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_deployment(payload(extra))



class PrivateFileTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.file = self.root / 'candidate.env'
        self.file.touch(mode=0o600)
        self.file.chmod(0o600)

    def reject(self, path=None):
        with self.assertRaises(frontend.FrontendEnvironmentError) as caught:
            frontend.write_candidate(path or self.file, payload({'DEV_VITE_NEW': SECRET}))
        self.assertNotIn(SECRET, str(caught.exception))

    def test_owned_empty_private_candidate_is_written(self):
        frontend.write_candidate(self.file, payload())
        self.assertEqual(self.file.read_bytes(), frontend.build_environment(payload()))
        self.assertEqual(stat.S_IMODE(self.file.stat().st_mode), 0o600)

    def test_existing_content_is_not_overwritten(self):
        self.file.write_text('old')
        self.reject()
        self.assertEqual(self.file.read_text(), 'old')

    def test_invalid_payload_is_rejected_before_open(self):
        with patch.object(frontend.os, 'open') as opening:
            with self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.write_candidate(self.file, '{}')
        opening.assert_not_called()

    def test_symlink_and_hardlink_are_rejected(self):
        link = self.root / 'link.env'
        link.symlink_to(self.file)
        self.reject(link)
        link.unlink()
        os.link(self.file, link)
        self.reject()
        self.assertEqual(link.read_bytes(), b'')

    def test_wrong_mode_owner_directory_and_missing_path_are_rejected(self):
        for mode in (0o644, 0o640, 0o400):
            self.file.chmod(mode)
            self.reject()
        self.file.chmod(0o600)
        with patch.object(frontend.os, 'geteuid', return_value=os.geteuid() + 1):
            self.reject()
        self.reject(self.root)
        missing = self.root / 'missing.env'
        self.reject(missing)
        self.assertFalse(missing.exists())

    def test_partial_writes_finish_and_io_errors_are_sanitized(self):
        original = os.write
        with patch.object(frontend.os, 'write', side_effect=lambda fd, data: original(fd, data[:7])):
            frontend.write_candidate(self.file, payload())
        self.assertEqual(self.file.read_bytes(), frontend.build_environment(payload()))
        for operation in ('write', 'fsync'):
            self.file.write_bytes(b'')
            with patch.object(frontend.os, operation, side_effect=OSError(SECRET)):
                self.reject()

    def test_fifo_is_rejected_without_blocking(self):
        fifo = self.root / 'fifo'
        os.mkfifo(fifo, 0o600)
        result = subprocess.run([sys.executable, '-c',
            'import importlib.util,sys; s=importlib.util.spec_from_file_location("x",sys.argv[1]);'
            'm=importlib.util.module_from_spec(s);s.loader.exec_module(m);m.write_candidate(sys.argv[2],sys.argv[3])',
            str(SCRIPT), str(fifo), payload()], env=python_subprocess_environment({'PATH': os.defpath}),
            capture_output=True, timeout=3)
        self.assertNotEqual(result.returncode, 0)


class SnapshotTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.runner = Path(self.tmp.name)
        self.directory = self.runner / (frontend.DIRECTORY_PREFIX + 'synthetic')
        self.directory.mkdir(mode=0o700)
        self.env = patch.dict(os.environ, {'RUNNER_TEMP': str(self.runner)}, clear=False)
        self.env.start()
        self.addCleanup(self.env.stop)

    def build(self, source=None, exit_code=0):
        with patch.object(frontend.subprocess, 'run', return_value=subprocess.CompletedProcess([], exit_code)) as run:
            frontend.build_settings(self.directory, payload() if source is None else source)
        return run

    def test_build_and_deploy_use_identical_private_candidate(self):
        run = self.build(payload({'DEV_VITE_NEW': 'new', 'DEV_RUNTIME_TOKEN': SECRET}))
        candidate = frontend.verify_settings(self.directory)
        self.assertEqual(candidate.read_bytes(), frontend.build_environment(payload({'DEV_VITE_NEW': 'new', 'DEV_RUNTIME_TOKEN': SECRET})))
        child = run.call_args.kwargs['env']
        self.assertEqual(child['VITE_NEW'], 'new')
        self.assertNotIn('RUNTIME_TOKEN', child)
        self.assertNotIn(frontend.SECRETS_VARIABLE, child)
        self.assertEqual(child['NODE_ENV'], 'production')
        self.assertEqual(child['HUSKY'], '0')
        self.assertEqual(child[frontend.BUILD_MARKER], '1')

    def test_ambient_vite_values_and_raw_json_are_not_used_by_build(self):
        with patch.dict(os.environ, {'VITE_OLD': SECRET, frontend.SECRETS_VARIABLE: payload()}):
            child = self.build().call_args.kwargs['env']
        self.assertNotIn('VITE_OLD', child)
        self.assertNotIn(frontend.SECRETS_VARIABLE, child)
        self.assertEqual(child['VITE_API_URL'], URL)

    def test_build_uses_fixed_argv_without_any_values_and_suppresses_logs(self):
        run = self.build(payload({'DEV_VITE_NEW': SECRET}))
        self.assertEqual(run.call_args.args[0], frontend.BUILD_COMMAND)
        self.assertNotIn(SECRET, ' '.join(run.call_args.args[0]))
        self.assertEqual(run.call_args.kwargs['stdout'], subprocess.DEVNULL)
        self.assertEqual(run.call_args.kwargs['stderr'], subprocess.DEVNULL)

    def test_modified_candidate_or_seal_prevents_deployment(self):
        self.build()
        candidate = self.directory / frontend.CANDIDATE_NAME
        original = candidate.read_bytes()
        candidate.write_bytes(original.replace(URL.encode(), b'changed'))
        with self.assertRaises(frontend.FrontendEnvironmentError):
            frontend.verify_settings(self.directory)
        candidate.write_bytes(original)
        (self.directory / frontend.SEAL_NAME).write_text('invalid')
        with self.assertRaises(frontend.FrontendEnvironmentError):
            frontend.verify_settings(self.directory)

    def test_failed_build_never_seals_settings_and_uses_fixed_error(self):
        with self.assertRaises(frontend.FrontendEnvironmentError) as caught:
            self.build(exit_code=23)
        self.assertEqual(str(caught.exception), 'frontend_build_failed')
        self.assertEqual((self.directory / frontend.SEAL_NAME).read_bytes(), b'')
        with self.assertRaises(frontend.FrontendEnvironmentError):
            frontend.verify_settings(self.directory)

    def test_private_directory_scope_and_permissions_are_checked(self):
        self.directory.chmod(0o755)
        with self.assertRaises(frontend.FrontendEnvironmentError):
            self.build()
        self.directory.chmod(0o700)
        with patch.dict(os.environ, {'RUNNER_TEMP': str(self.directory)}):
            with self.assertRaises(frontend.FrontendEnvironmentError):
                self.build()

    def test_cleanup_removes_only_expected_private_files(self):
        self.build()
        frontend.cleanup_settings(self.directory)
        self.assertFalse(self.directory.exists())
        frontend.cleanup_settings('')

    def test_cleanup_preserves_unexpected_files(self):
        unexpected = self.directory / 'do-not-delete'
        unexpected.write_text('preserve')
        with self.assertRaises(frontend.FrontendEnvironmentError):
            frontend.cleanup_settings(self.directory)
        self.assertEqual(unexpected.read_text(), 'preserve')

    def test_deployment_metadata_is_sealed_private_and_not_a_build_environment(self):
        child = self.build().call_args.kwargs['env']
        path = self.directory / frontend.DEPLOYMENT_NAME
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        self.assertEqual(path.read_bytes(), frontend.build_deployment(payload()))
        self.assertTrue(set(frontend.DEPLOYMENT_KEYS).isdisjoint(child))
        value = json.loads(path.read_text()); value['blue']['ip'] = '10.10.10.60'
        path.write_text(json.dumps(value))
        with self.assertRaisesRegex(frontend.FrontendEnvironmentError, 'snapshot_mismatch'):
            frontend.verify_settings(self.directory)

    def test_missing_deployment_settings_prevent_build_and_file_creation(self):
        values = json.loads(payload()); values.pop('DEV_BLUE_FRONTEND_IP')
        with patch.object(frontend.subprocess, 'run') as build:
            with self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_settings(self.directory, json.dumps(values))
        build.assert_not_called()
        self.assertEqual(list(self.directory.iterdir()), [])



class WorkflowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text()
        def block(name):
            part = cls.source.split('      - name: ' + name + '\n', 1)[1]
            return textwrap.dedent(part.split('        run: |\n', 1)[1].split('      - name:', 1)[0])
        cls.build_shell = block('Build frontend from DEV Secrets')
        cls.deploy_shell = block('Deploy the frontend build snapshot')
        cls.cleanup_shell = block('Remove private frontend settings')
        cls.configure_shell = block('Configure frontend deployment settings')
        for code, controllers, builders in [(cls.build_shell, 0, 2), (cls.deploy_shell, 1, 1),
                (cls.cleanup_shell, 0, 1), (cls.configure_shell, 1, 1)]:
            guard_workflow_shell(code, controllers, builders)

    def invoke(self, source=None, build_exit=0, controller_exit=0, tamper=False, skip_deploy=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            runner = root / 'runner temp'; runner.mkdir()
            bins = root / 'bin'; bins.mkdir()
            output = root / 'outputs'
            node_log = root / 'node.json'; controller_log = root / 'controller.json'
            marker = root / 'shell-expansion-must-not-run'
            npx = bins / 'npx'
            npx.write_text('#!' + sys.executable + '\nimport json,os,pathlib,sys\n'
                'pathlib.Path(' + repr(str(node_log)) + ').write_text(json.dumps(dict(os.environ)))\n'
                'print(' + repr(SECRET) + ')\n'
                'sys.exit(' + str(build_exit) + ')\n')
            npx.chmod(0o700)
            controller = root / 'controller.py'
            controller.write_text('import json,os,pathlib,sys\na=sys.argv[1:]\n'
                'p=pathlib.Path(a[a.index("--env-file")+1])\n'
                'pathlib.Path(' + repr(str(controller_log)) + ').write_text(json.dumps({"args":a,"content":p.read_text(),"deployment":pathlib.Path(a[a.index("--frontend-deployment-file")+1]).read_text(),"rawInherited":' + repr(frontend.SECRETS_VARIABLE) + ' in os.environ}))\n'
                'sys.exit(' + str(controller_exit) + ')\n')
            env = {'PATH': str(bins) + os.pathsep + str(Path(sys.executable).parent) + os.pathsep + os.defpath,
                'RUNNER_TEMP': str(runner), 'GITHUB_OUTPUT': str(output), 'IMAGE_NAME': 'ieum-frontend-dev',
                'IMAGE_TAG': 'synthetic-sha', 'IEUM_BLUEGREEN_JOB_DEADLINE_EPOCH': str(int(time.time()) + 21600),
                'IEUM_BLUEGREEN_HOME': str(root / 'nonexistent-bluegreen-home'),
                'VITE_AMBIENT_OLD': 'must-not-use', frontend.SECRETS_VARIABLE: source or payload({
                    'DEV_VITE_NEW': SECRET + '$(touch ' + shlex.quote(str(marker)) + ')',
                    'DEV_RUNTIME_TOKEN': SECRET})}
            def shell(code, controllers, builders):
                return rewrite_workflow_shell(code, controller, controllers, builders)
            built = run_workflow_shell(shell(self.build_shell, 0, 2), cwd=root, env=env)
            settings = ''
            if output.exists():
                settings = output.read_text().strip().split('=', 1)[1]
            # This is a later workflow step; the whole Secrets JSON is step-scoped.
            env.pop(frontend.SECRETS_VARIABLE)
            env['SETTINGS_DIR'] = settings
            if tamper and settings:
                Path(settings, frontend.CANDIDATE_NAME).write_text('VITE_API_URL=changed\nNODE_ENV=production\n')
            deployed = None
            if built.returncode == 0 and not skip_deploy:
                deployed = run_workflow_shell(shell(self.deploy_shell, 1, 1), cwd=root, env=env)
            cleaned = run_workflow_shell(shell(self.cleanup_shell, 0, 1), cwd=root, env=env)
            return {'build': built, 'deploy': deployed, 'cleanup': cleaned,
                'node': json.loads(node_log.read_text()) if node_log.exists() else None,
                'controller': json.loads(controller_log.read_text()) if controller_log.exists() else None,
                'outputs': output.read_text() if output.exists() else '', 'remaining': list(runner.iterdir()),
                'expanded': marker.exists()}

    def test_workflow_has_prefixed_metadata_and_only_one_raw_json_reference(self):
        self.assertIn('NODE_VERSION: ${{ secrets.DEV_COM_NODE_VERSION }}', self.source)
        self.assertIn('IMAGE_NAME: ${{ secrets.DEV_COM_IMAGE_NAME }}', self.source)
        self.assertEqual(self.source.count('${{ toJSON(secrets) }}'), 1)
        self.assertNotIn('secrets.VITE_API_URL', self.source)
        self.assertNotIn('${{ secrets.', self.build_shell + self.deploy_shell + self.cleanup_shell)
        self.assertIn('if: always()', self.source)
        self.assertIn('--replace-env', self.deploy_shell)
        self.assertIn('--frontend-deployment-file \"$SETTINGS_DIR/frontend-deployment.json\"', self.deploy_shell)
        self.assertLess(self.deploy_shell.index('frontend_env.py verify'), self.deploy_shell.index('bluegreen.py'))

    def test_initial_configuration_is_an_explicit_manual_operation_separate_from_deploy(self):
        self.assertIn('options: [deploy, configure-frontend]', self.source)
        configure = self.source.split('      - name: Configure frontend deployment settings\n', 1)[1].split('      - name:', 1)[0]
        deploy = self.source.split('      - name: Deploy the frontend build snapshot\n', 1)[1].split('      - name:', 1)[0]
        self.assertIn("if: github.event_name == 'workflow_dispatch' && inputs.operation == 'configure-frontend'", configure)
        self.assertIn("if: github.event_name != 'workflow_dispatch' || inputs.operation == 'deploy'", deploy)
        self.assertLess(configure.index('frontend_env.py verify'), configure.index('configure-frontend \\'))
        self.assertIn('--settings-file "$SETTINGS_DIR/frontend-deployment.json"', configure)
        self.assertNotIn('--service', configure)
        self.assertNotIn('secrets.', configure)

    def test_changed_controller_or_builder_path_is_rejected_before_execution(self):
        for original, replacement in [(CONTROLLER_LITERAL, '/different/bluegreen.py'),
                (BUILDER_LITERAL, 'scripts/new/frontend_env.py')]:
            changed = self.deploy_shell.replace(original, replacement)
            with patch.object(subprocess, 'Popen') as run:
                with self.assertRaises(AssertionError): guard_workflow_shell(changed, 1, 1)
                with self.assertRaises(AssertionError): rewrite_workflow_shell(changed, Path('/fake/controller.py'), 1, 1)
            run.assert_not_called()

    def test_shell_timeout_kills_the_whole_private_process_group(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(os, 'killpg', wraps=os.killpg) as kill:
            with self.assertRaises(subprocess.TimeoutExpired):
                run_workflow_shell('sleep 60', cwd=directory, env={'PATH': os.defpath}, timeout=0.05)
            self.assertEqual(kill.call_count, 1)
            self.assertEqual(kill.call_args.args[1], signal.SIGKILL)

    def test_shell_preserves_only_the_python_loader_path_from_ambient_environment(self):
        loader = os.environ.get('LD_LIBRARY_PATH', str(Path(sys.executable).parent))
        blocked = ('LD_PRELOAD', 'PYTHONPATH', 'PYTHONHOME', 'GITHUB_TOKEN', frontend.SECRETS_VARIABLE)
        script = shlex.quote(sys.executable) + ' -c ' + shlex.quote(
            'import json,os; print(json.dumps({k:os.environ.get(k) for k in ' + repr(('LD_LIBRARY_PATH',) + blocked) + '}))')
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,
                {'LD_LIBRARY_PATH': loader, **{key: SECRET for key in blocked}}):
            result = run_workflow_shell(script, cwd=directory, env={'PATH': os.defpath})
        self.assertEqual(result.returncode, 0, result.stderr)
        values = json.loads(result.stdout)
        self.assertEqual(values.pop('LD_LIBRARY_PATH'), loader)
        self.assertTrue(all(value is None for value in values.values()))

    def test_missing_loader_path_does_not_add_ambient_values(self):
        with patch.dict(os.environ, {'GITHUB_TOKEN': SECRET}, clear=True):
            self.assertEqual(python_subprocess_environment({'PATH': os.defpath}), {'PATH': os.defpath})

    def test_image_public_files_are_readable_without_relaxing_private_settings(self):
        dockerfile = self.source.split("cat > Dockerfile.ci <<'EOF'", 1)[1].split('          EOF', 1)[0]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            public = root / 'html'; public.mkdir(mode=0o700)
            assets = public / 'assets'; assets.mkdir(mode=0o700)
            files = [public / 'index.html', assets / 'app.js']
            private = root / 'frontend.env'; private.write_text(SECRET); private.chmod(0o600)
            for path in files:
                path.write_text('public output'); path.chmod(0o600)
            for line in dockerfile.splitlines():
                if line.strip().startswith('RUN chmod '):
                    command = shlex.split(line.strip()[4:])
                    self.assertEqual(command[-1], '/usr/share/nginx/html')
                    subprocess.run([*command[:-1], str(public)], check=True, capture_output=True)
            for path in files:
                self.assertEqual(stat.S_IMODE(path.stat().st_mode) & 0o444, 0o444)
            for path in (public, assets):
                self.assertEqual(stat.S_IMODE(path.stat().st_mode) & 0o555, 0o555)
            self.assertEqual(stat.S_IMODE(private.stat().st_mode), 0o600)
        build = self.source.index('      - name: Build Docker image\n')
        smoke = self.source.index('      - name: Check frontend HTTP responses in the built image\n')
        self.assertLess(build, smoke)
        self.assertLess(smoke, self.source.index('      - name: Verify installed blue-green release\n'))

    def test_success_build_and_deploy_share_snapshot_and_cleanup_without_logging_values(self):
        result = self.invoke()
        self.assertEqual(result['build'].returncode, 0)
        self.assertEqual(result['deploy'].returncode, 0)
        self.assertEqual(result['cleanup'].returncode, 0)
        self.assertFalse(result['controller']['rawInherited'])
        self.assertEqual(json.loads(result['controller']['deployment']), json.loads(frontend.build_deployment(payload())))
        self.assertNotIn(frontend.SECRETS_VARIABLE, result['node'])
        self.assertNotIn('RUNTIME_TOKEN', result['node'])
        self.assertNotIn('VITE_AMBIENT_OLD', result['node'])
        self.assertEqual(result['node']['VITE_API_URL'], URL)
        candidate = records(result['controller']['content'].encode())
        self.assertEqual(candidate['VITE_NEW'], result['node']['VITE_NEW'])
        self.assertEqual(candidate['RUNTIME_TOKEN'], SECRET)
        self.assertIn('--replace-env', result['controller']['args'])
        self.assertFalse(result['expanded'])
        self.assertEqual(result['remaining'], [])
        self.assertNotIn(SECRET, result['outputs'])
        for stage in ('build', 'deploy', 'cleanup'):
            self.assertNotIn(SECRET, result[stage].stdout + result[stage].stderr)

    def test_failed_build_cleans_before_output_and_never_deploys(self):
        result = self.invoke(build_exit=23)
        self.assertEqual(result['build'].returncode, 1)
        self.assertIsNone(result['controller'])
        self.assertEqual(result['outputs'], '')
        self.assertEqual(result['remaining'], [])
        self.assertNotIn(SECRET, result['build'].stdout + result['build'].stderr)

    def test_invalid_input_cleans_before_output_and_never_builds(self):
        result = self.invoke(source='{}')
        self.assertEqual(result['build'].returncode, 1)
        self.assertIsNone(result['node'])
        self.assertIsNone(result['controller'])
        self.assertEqual(result['remaining'], [])

    def test_snapshot_tamper_prevents_controller_and_still_cleans(self):
        result = self.invoke(tamper=True)
        self.assertEqual(result['deploy'].returncode, 1)
        self.assertIsNone(result['controller'])
        self.assertEqual(result['remaining'], [])

    def test_controller_failure_is_preserved_and_always_cleanup_removes_private_files(self):
        result = self.invoke(controller_exit=23)
        self.assertEqual(result['deploy'].returncode, 23)
        self.assertEqual(result['remaining'], [])

    def test_later_build_or_image_step_failure_can_cleanup_without_deployment(self):
        result = self.invoke(skip_deploy=True)
        self.assertIsNone(result['controller'])
        self.assertEqual(result['remaining'], [])

    def test_vite_config_disables_dotenv_only_for_snapshot_builds_and_docker_context_excludes_env(self):
        config = (ROOT / 'vite.config.ts').read_text()
        self.assertIn("process.env.IEUM_FRONTEND_BUILD_FROM_SNAPSHOT === '1'", config)
        self.assertIn("fromDeploymentSnapshot ? process.env : loadEnv(mode, process.cwd(), '')", config)
        self.assertIn('envDir: fromDeploymentSnapshot ? false : undefined', config)
        ignored = (ROOT / '.dockerignore').read_text().splitlines()
        self.assertIn('.env', ignored)
        self.assertIn('.env.*', ignored)
        self.assertIn('.git', ignored)


if __name__ == '__main__':
    unittest.main()
