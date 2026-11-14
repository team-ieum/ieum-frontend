"""MAIN의 명시적 Secret 입력과 기존 스냅샷 계약을 실제 CLI로 검증합니다."""

import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import textwrap
import unittest

import frontend_env as frontend
from test_frontend_env import python_subprocess_environment, records, run_workflow_shell
from test_frontend_main import main_payload

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = Path(__file__).with_name('frontend_env.py')
WORKFLOW = ROOT / '.github/workflows/frontend-main-server.yml'
PRIVATE = 'synthetic-unrelated-secret'


def settings_inputs():
    values = json.loads(main_payload())
    return {key: values.get(key, '') for key in frontend.MAIN_SECRET_KEYS}


def workflow_step(name):
    return WORKFLOW.read_text().split('      - name: ' + name + '\n', 1)[1].split('      - name:', 1)[0]


class MainSecretInputsTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.environment = python_subprocess_environment({
            'PATH': os.environ['PATH'], 'RUNNER_TEMP': str(self.root),
            'GITHUB_OUTPUT': str(self.root / 'outputs'), **settings_inputs()})

    def directory(self, suffix):
        result = self.root / ('ieum-frontend-settings.' + suffix)
        result.mkdir(mode=0o700)
        return result

    def cli(self, operation, directory, inputs=None):
        return subprocess.run([sys.executable, str(SCRIPT), operation, str(directory), '--environment', 'main'],
                              env={**self.environment, **(inputs or {})}, capture_output=True, text=True, timeout=10)

    def test_only_declared_inputs_are_selected_without_json_or_other_environment_fallback(self):
        ambient = {**settings_inputs(), 'MAIN_COM_NEW_UNDECLARED': PRIVATE,
                   'DEV_COM_VITE_API_URL': PRIVATE, 'AWS_VITE_API_URL': PRIVATE,
                   'VITE_API_URL': PRIVATE, 'GITHUB_TOKEN': PRIVATE,
                   frontend.SECRETS_VARIABLE: main_payload({'MAIN_COM_RUNTIME_ONLY': PRIVATE})}
        selected = json.loads(frontend.configuration_payload(ambient, 'main'))
        self.assertEqual(set(selected), set(frontend.MAIN_SECRET_KEYS) - {
            'MAIN_COM_VITE_MEASUREMENT_MODE', 'MAIN_COM_VITE_MEASUREMENT_DELAY_MS'})
        self.assertNotIn(PRIVATE, selected.values())
        ambient['MAIN_COM_VITE_API_URL'] = ''
        with self.assertRaisesRegex(frontend.FrontendEnvironmentError, 'missing_required_configuration'):
            frontend.build_environment(frontend.configuration_payload(ambient, 'main'), 'main')

    def test_restore_preserves_paths_permissions_literals_and_color_snapshot_format(self):
        directory = self.directory('restore')
        literal = '  literal = $HOME `value` "quoted" 한글  '
        completed = self.cli('restore', directory, {'MAIN_COM_VITE_MEASUREMENT_DELAY_MS': literal})
        self.assertEqual(completed.returncode, 0, completed.stderr)
        content = (directory / frontend.CANDIDATE_NAME).read_bytes()
        self.assertEqual(records(content), {'NODE_ENV': 'production', 'VITE_API_URL': 'https://kiacms.co.kr',
                                           'VITE_MEASUREMENT_DELAY_MS': literal})
        for filename in (frontend.CANDIDATE_NAME, frontend.DEPLOYMENT_NAME, frontend.SEAL_NAME):
            self.assertEqual(stat.S_IMODE((directory / filename).stat().st_mode), 0o600)
        expected_deployment = frontend.build_deployment(main_payload(), 'main')
        self.assertEqual((directory / frontend.DEPLOYMENT_NAME).read_bytes(), expected_deployment)
        self.assertEqual((directory / frontend.SEAL_NAME).read_bytes(), frontend.snapshot_seal(content, expected_deployment))
        self.assertEqual(self.cli('verify', directory).returncode, 0)
        self.assertNotIn(literal, completed.stdout + completed.stderr)

    def test_missing_optional_inputs_match_empty_github_inputs(self):
        empty = settings_inputs()
        absent = {key: value for key, value in empty.items() if value != ''}
        self.assertEqual(frontend.configuration_payload(empty, 'main'), frontend.configuration_payload(absent, 'main'))
        self.assertEqual(frontend.build_environment(frontend.configuration_payload(empty, 'main'), 'main'),
                         frontend.build_environment(main_payload(), 'main'))

    def test_required_api_and_each_topology_value_fail_before_creating_files(self):
        required = set(frontend.MAIN_SECRET_KEYS) - {
            'MAIN_COM_VITE_MEASUREMENT_MODE', 'MAIN_COM_VITE_MEASUREMENT_DELAY_MS'}
        for index, key in enumerate(sorted(required)):
            with self.subTest(key=key):
                directory = self.directory('missing' + str(index))
                completed = self.cli('restore', directory, {key: ''})
                self.assertNotEqual(completed.returncode, 0)
                self.assertEqual(list(directory.iterdir()), [])

    def test_invalid_multiline_optional_value_is_rejected_without_logging_value(self):
        directory = self.directory('invalid')
        completed = self.cli('restore', directory, {'MAIN_COM_VITE_MEASUREMENT_MODE': PRIVATE + '\nextra'})
        self.assertNotEqual(completed.returncode, 0)
        self.assertNotIn(PRIVATE, completed.stdout + completed.stderr)
        self.assertEqual(list(directory.iterdir()), [])

    def test_build_child_receives_public_values_only_and_restore_reproduces_seal(self):
        binary = self.root / 'bin'
        binary.mkdir()
        capture = self.root / 'build-child.json'
        executable = binary / 'npx'
        executable.write_text('#!' + sys.executable + '\nimport json, os\nfrom pathlib import Path\n'
                              'Path(' + repr(str(capture)) + ').write_text(json.dumps(dict(os.environ)))\n')
        executable.chmod(0o700)
        build = self.directory('build')
        restore = self.directory('deploy')
        inputs = {'PATH': str(binary) + os.pathsep + self.environment['PATH'],
                  'MAIN_COM_VITE_MEASUREMENT_MODE': 'true', 'MAIN_COM_VITE_MEASUREMENT_DELAY_MS': '250',
                  'MAIN_COM_UNDECLARED': PRIVATE, 'DEV_TOKEN': PRIVATE, 'AWS_TOKEN': PRIVATE,
                  'VITE_AMBIENT': PRIVATE, 'GITHUB_TOKEN': PRIVATE,
                  frontend.SECRETS_VARIABLE: main_payload({'MAIN_COM_RUNTIME_ONLY': PRIVATE})}
        completed = self.cli('build', build, inputs)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        child = json.loads(capture.read_text())
        self.assertEqual(child['VITE_API_URL'], 'https://kiacms.co.kr')
        self.assertEqual(child['VITE_MEASUREMENT_MODE'], 'true')
        self.assertEqual(child['VITE_MEASUREMENT_DELAY_MS'], '250')
        self.assertFalse(any(key.startswith(('MAIN_', 'DEV_', 'AWS_')) for key in child))
        self.assertNotIn(PRIVATE, child.values())
        self.assertNotIn(frontend.SECRETS_VARIABLE, child)
        self.assertEqual(self.cli('restore', restore, inputs).returncode, 0)
        for filename in (frontend.CANDIDATE_NAME, frontend.DEPLOYMENT_NAME, frontend.SEAL_NAME):
            self.assertEqual((build / filename).read_bytes(), (restore / filename).read_bytes())

    def test_workflow_maps_only_declared_settings_and_metadata_without_full_secrets_context(self):
        source = WORKFLOW.read_text()
        self.assertNotIn('toJSON(secrets)', source)
        self.assertNotIn(frontend.SECRETS_VARIABLE, source)
        self.assertEqual(set(re.findall(r'\bsecrets\.([A-Z0-9_]+)', source)),
                         set(frontend.MAIN_SECRET_KEYS) | {'MAIN_COM_NODE_VERSION', 'MAIN_COM_IMAGE_NAME'})
        for name in ('Build frontend from MAIN Secrets', 'Restore MAIN settings and verify build snapshot'):
            section = workflow_step(name)
            mapped = re.findall(r'^          ([A-Z0-9_]+): \$\{\{ secrets\.([A-Z0-9_]+) \}\}$', section, re.MULTILINE)
            self.assertEqual({name for name, _ in mapped}, set(frontend.MAIN_SECRET_KEYS))
            self.assertTrue(all(name == reference for name, reference in mapped))

    def test_restore_workflow_clears_raw_inputs_before_artifact_verification(self):
        section = workflow_step('Restore MAIN settings and verify build snapshot')
        script = textwrap.dedent(section.split('        run: |\n', 1)[1])
        verifier = self.root / 'verify.py'
        capture = self.root / 'verify-environment.json'
        verifier.write_text('import json, os\nfrom pathlib import Path\n'
                            'Path(' + repr(str(capture)) + ').write_text(json.dumps(dict(os.environ)))\n')
        self.assertEqual(script.count('scripts/bluegreen/frontend_artifact.py'), 1)
        script = script.replace('scripts/bluegreen/frontend_artifact.py', str(verifier))
        completed = run_workflow_shell(script, cwd=ROOT, env={**self.environment, 'ARTIFACT_DIR': str(self.root)})
        self.assertEqual(completed.returncode, 0, completed.stderr)
        child = json.loads(capture.read_text())
        self.assertFalse(any(key.startswith('MAIN_') for key in child))
        self.assertNotIn(frontend.SECRETS_VARIABLE, child)


if __name__ == '__main__':
    unittest.main()
