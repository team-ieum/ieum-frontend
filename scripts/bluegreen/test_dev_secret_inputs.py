"""DEV의 명시적 입력 경계와 기존 배포 스냅샷을 실제 CLI로 검증합니다."""

import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import unittest

import frontend_env as frontend
from test_frontend_env import payload, python_subprocess_environment, records, URL

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = Path(__file__).with_name('frontend_env.py')
WORKFLOW = ROOT / '.github/workflows/frontend-dev-server.yml'
PRIVATE = 'synthetic-unselected-secret'
OPTIONAL_KEYS = {'DEV_COM_VITE_MEASUREMENT_MODE', 'DEV_COM_VITE_MEASUREMENT_DELAY_MS'}


def settings_inputs():
    values = json.loads(payload())
    return {key: values.get(key, '') for key in frontend.DEV_SECRET_KEYS}


class DevSecretInputsTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.environment = python_subprocess_environment({
            'PATH': os.environ['PATH'], 'RUNNER_TEMP': str(self.root), **settings_inputs()})

    def directory(self, suffix):
        result = self.root / (frontend.DIRECTORY_PREFIX + suffix)
        result.mkdir(mode=0o700)
        return result

    def cli(self, operation, directory, inputs=None, omitted=()):
        environment = {**self.environment, **(inputs or {})}
        for key in omitted:
            environment.pop(key, None)
        return subprocess.run([sys.executable, str(SCRIPT), operation, str(directory)],
                              env=environment, capture_output=True, text=True, timeout=10)

    def test_only_declared_dev_inputs_are_selected_without_legacy_or_other_environment_fallback(self):
        ambient = {**settings_inputs(), 'DEV_COM_UNDECLARED': PRIVATE,
                   'DEV_VITE_API_URL': PRIVATE, 'MAIN_COM_VITE_API_URL': PRIVATE,
                   'AWS_VITE_API_URL': PRIVATE, 'VITE_API_URL': PRIVATE, 'GITHUB_TOKEN': PRIVATE,
                   frontend.SECRETS_VARIABLE: payload({'DEV_COM_UNDECLARED': PRIVATE})}
        selected = json.loads(frontend.configuration_payload(ambient))
        self.assertEqual(set(selected), set(frontend.DEV_SECRET_KEYS) - OPTIONAL_KEYS)
        self.assertNotIn(PRIVATE, selected.values())
        ambient.pop('DEV_COM_VITE_API_URL')
        with self.assertRaisesRegex(frontend.FrontendEnvironmentError, 'missing_required_configuration'):
            frontend.build_environment(frontend.configuration_payload(ambient))
        self.assertEqual(frontend.configuration_payload({frontend.SECRETS_VARIABLE: payload()}), '{}')

    def test_restore_preserves_mapping_paths_permissions_and_snapshot_seal(self):
        directory = self.directory('restore')
        literal = '  literal = $HOME `value` "quoted" 한글  '
        completed = self.cli('restore', directory, {'DEV_COM_VITE_MEASUREMENT_DELAY_MS': literal})
        self.assertEqual(completed.returncode, 0, completed.stderr)
        content = (directory / frontend.CANDIDATE_NAME).read_bytes()
        self.assertEqual(records(content), {'NODE_ENV': 'production', 'VITE_API_URL': URL,
                                           'VITE_MEASUREMENT_DELAY_MS': literal})
        expected = frontend.build_deployment(payload())
        self.assertEqual((directory / frontend.DEPLOYMENT_NAME).read_bytes(), expected)
        self.assertEqual((directory / frontend.SEAL_NAME).read_bytes(), frontend.snapshot_seal(content, expected))
        for filename in (frontend.CANDIDATE_NAME, frontend.DEPLOYMENT_NAME, frontend.SEAL_NAME):
            self.assertEqual(stat.S_IMODE((directory / filename).stat().st_mode), 0o600)
        self.assertEqual(self.cli('verify', directory).returncode, 0)
        self.assertNotIn(literal, completed.stdout + completed.stderr)

    def test_unregistered_and_empty_optional_inputs_keep_original_unregistered_defaults(self):
        empty = settings_inputs()
        absent = {key: value for key, value in empty.items() if key not in OPTIONAL_KEYS}
        self.assertEqual(frontend.configuration_payload(empty), frontend.configuration_payload(absent))
        content = frontend.build_environment(frontend.configuration_payload(empty))
        self.assertEqual(content, frontend.build_environment(payload()))
        child = frontend.build_process_environment(content, {'VITE_MEASUREMENT_DELAY_MS': '0'})
        self.assertNotIn('VITE_MEASUREMENT_DELAY_MS', child)
        self.assertNotIn('VITE_MEASUREMENT_MODE', child)
        selected = frontend.configuration_payload({**empty, 'DEV_COM_VITE_MEASUREMENT_DELAY_MS': '0'})
        self.assertEqual(records(frontend.build_environment(selected))['VITE_MEASUREMENT_DELAY_MS'], '0')

    def test_missing_empty_and_whitespace_required_values_fail_before_creating_files(self):
        required = set(frontend.DEV_SECRET_KEYS) - OPTIONAL_KEYS
        for index, key in enumerate(sorted(required)):
            for mode in ('missing', '', '   '):
                with self.subTest(key=key, mode=mode):
                    directory = self.directory(str(index) + '-' + repr(mode))
                    completed = self.cli('restore', directory,
                                         {frontend.SECRETS_VARIABLE: payload(), **({key: mode} if mode != 'missing' else {})},
                                         omitted=(key,) if mode == 'missing' else ())
                    self.assertNotEqual(completed.returncode, 0)
                    self.assertEqual(list(directory.iterdir()), [])

    def test_multiline_input_is_rejected_without_logging_value(self):
        directory = self.directory('invalid')
        completed = self.cli('restore', directory, {'DEV_COM_VITE_MEASUREMENT_MODE': PRIVATE + '\nextra'})
        self.assertNotEqual(completed.returncode, 0)
        self.assertNotIn(PRIVATE, completed.stdout + completed.stderr)
        self.assertEqual(list(directory.iterdir()), [])

    def test_build_child_cannot_inherit_raw_secrets_and_restore_matches_build(self):
        binary = self.root / 'bin'
        binary.mkdir()
        capture = self.root / 'child.json'
        executable = binary / 'npx'
        executable.write_text('#!' + sys.executable + '\nimport json, os\nfrom pathlib import Path\n'
                              'Path(' + repr(str(capture)) + ').write_text(json.dumps(dict(os.environ)))\n')
        executable.chmod(0o700)
        build = self.directory('build')
        restore = self.directory('deploy')
        inputs = {'PATH': str(binary) + os.pathsep + self.environment['PATH'],
                  'DEV_COM_VITE_MEASUREMENT_MODE': 'true', 'DEV_COM_VITE_MEASUREMENT_DELAY_MS': '250',
                  'DEV_COM_UNDECLARED': PRIVATE, 'MAIN_TOKEN': PRIVATE, 'AWS_TOKEN': PRIVATE,
                  'VITE_AMBIENT': PRIVATE, 'GITHUB_TOKEN': PRIVATE, frontend.SECRETS_VARIABLE: payload()}
        completed = self.cli('build', build, inputs)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        child = json.loads(capture.read_text())
        self.assertEqual(child['VITE_API_URL'], URL)
        self.assertEqual(child['VITE_MEASUREMENT_MODE'], 'true')
        self.assertEqual(child['VITE_MEASUREMENT_DELAY_MS'], '250')
        self.assertFalse(any(key.startswith(('DEV_', 'MAIN_', 'AWS_')) for key in child))
        self.assertNotIn(PRIVATE, child.values())
        self.assertNotIn(frontend.SECRETS_VARIABLE, child)
        self.assertEqual(self.cli('restore', restore, inputs).returncode, 0)
        for filename in (frontend.CANDIDATE_NAME, frontend.DEPLOYMENT_NAME, frontend.SEAL_NAME):
            self.assertEqual((build / filename).read_bytes(), (restore / filename).read_bytes())

    def test_workflow_declares_only_allowed_inputs_with_exact_existing_secret_names(self):
        source = WORKFLOW.read_text()
        self.assertNotIn('toJSON(secrets)', source)
        self.assertNotIn(frontend.SECRETS_VARIABLE, source)
        self.assertEqual(set(re.findall(r'\bsecrets\.([A-Z0-9_]+)', source)),
                         set(frontend.DEV_SECRET_KEYS) | {'DEV_COM_NODE_VERSION', 'DEV_COM_IMAGE_NAME'})
        section = source.split('      - name: Build frontend from DEV Secrets\n', 1)[1].split('      - name:', 1)[0]
        mapped = re.findall(r'^          ([A-Z0-9_]+): \$\{\{ secrets\.([A-Z0-9_]+) \}\}$', section, re.MULTILINE)
        self.assertEqual({name for name, _ in mapped}, set(frontend.DEV_SECRET_KEYS))
        self.assertEqual(len(mapped), len(frontend.DEV_SECRET_KEYS))
        self.assertTrue(all(name == reference for name, reference in mapped))
        shell = section.split('        run: |\n', 1)[1]
        self.assertNotIn('${{ secrets.', shell)
        self.assertIn('unset "${!DEV_@}"', shell)


if __name__ == '__main__':
    unittest.main()
