"""공개 파일의 HTTP 실패와 검사 컨테이너의 안전한 정리를 검증합니다."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import unittest
import uuid
from unittest.mock import patch


SCRIPT = Path(__file__).with_name('frontend_smoke.py')
spec = importlib.util.spec_from_file_location('frontend_smoke_under_test', SCRIPT)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)
IMAGE = 'sha256:' + 'a' * 64
CONTAINER = 'b' * 64
RUN_ID = 'd' * 32
NAME = 'ieum-frontend-smoke-' + RUN_ID
INDEX = b'<html><script src="/assets/app.js"></script></html>'
SECRET = 'synthetic-private-value-never-log'


class FrontendSmokeTest(unittest.TestCase):
    def invoke(self, *, index=INDEX, index_exit=0, asset_exit=0, missing_status=404,
               missing_exit=1, creation_timeout=False, timeout_without_cid=False,
               cleanup_image=IMAGE, cleanup_name=NAME, cleanup_static_label='true',
               cleanup_run_label=RUN_ID, inventory_outputs=None, inventory_failure=False,
               cidfile_text=CONTAINER, clock=(0, 31)):
        commands = []
        inventory = iter(inventory_outputs) if inventory_outputs is not None else None

        def command(*args, **_kwargs):
            commands.append(args)
            if args[:3] == ('docker', 'image', 'inspect'):
                return IMAGE.encode()
            if args[:2] == ('docker', 'run'):
                if creation_timeout or timeout_without_cid:
                    if creation_timeout:
                        Path(args[args.index('--cidfile') + 1]).write_text(cidfile_text)
                    raise subprocess.TimeoutExpired('docker run', 20)
                return CONTAINER.encode()
            if args[:2] == ('docker', 'ps'):
                if inventory_failure:
                    raise RuntimeError('frontend_image_operation_failed')
                if inventory is not None:
                    return next(inventory, b'')
                return CONTAINER.encode()
            if args[:2] == ('docker', 'inspect'):
                return json.dumps([{'Id': CONTAINER, 'Image': cleanup_image, 'Name': '/' + cleanup_name,
                    'Config': {'Labels': {'ieum.frontend.smoke': cleanup_static_label,
                                         'ieum.frontend.smoke.run': cleanup_run_label}}}]).encode()
            if args[:3] == ('docker', 'rm', '--force'):
                return b''
            raise AssertionError('Unexpected Docker operation')

        responses = [subprocess.CompletedProcess([], index_exit, stdout=index, stderr=b''),
                     subprocess.CompletedProcess([], asset_exit, stdout=b'public asset', stderr=b'')]
        missing = subprocess.CompletedProcess([], missing_exit, stdout=b'',
            stderr=f'HTTP/1.1 {missing_status} Response\n'.encode())
        with patch.object(smoke, 'command', side_effect=command), \
             patch.object(smoke, 'fetch', side_effect=responses), \
             patch.object(smoke.subprocess, 'run', return_value=missing), \
             patch.object(smoke.uuid, 'uuid4', return_value=uuid.UUID(RUN_ID)), \
             patch.object(smoke.time, 'monotonic', side_effect=clock), \
             patch.object(smoke.time, 'sleep'):
            try:
                smoke.check_image('frontend:synthetic')
            except Exception as failure:
                return failure, commands
        return None, commands

    def assert_removed(self, commands):
        self.assertEqual([args for args in commands if args[:2] == ('docker', 'rm')],
                         [('docker', 'rm', '--force', CONTAINER)])

    def test_public_index_asset_and_missing_asset_pass_in_an_isolated_container(self):
        failure, commands = self.invoke()
        self.assertIsNone(failure)
        run = next(args for args in commands if args[:2] == ('docker', 'run'))
        self.assertEqual(run[run.index('--network') + 1], 'none')
        self.assertEqual(run[run.index('--name') + 1], NAME)
        self.assertIn('ieum.frontend.smoke.run=' + RUN_ID, run)
        self.assertEqual(run[-1], IMAGE)
        for option in ('--env', '--env-file', '--mount', '-v', '--publish', '-p'):
            self.assertNotIn(option, run)
        self.assert_removed(commands)

    def test_unreadable_index_is_rejected_and_only_its_probe_is_removed(self):
        failure, commands = self.invoke(index_exit=1)
        self.assertEqual(str(failure), 'frontend_index_http_check_failed')
        self.assert_removed(commands)

    def test_unreadable_asset_is_rejected_after_a_successful_index(self):
        failure, commands = self.invoke(asset_exit=1)
        self.assertEqual(str(failure), 'frontend_asset_http_check_failed')
        self.assert_removed(commands)

    def test_missing_asset_returning_spa_html_is_rejected(self):
        failure, commands = self.invoke(missing_status=200, missing_exit=0)
        self.assertEqual(str(failure), 'frontend_missing_asset_must_return_404')
        self.assert_removed(commands)

    def test_missing_asset_other_errors_are_not_accepted_as_404(self):
        for status in (403, 500):
            with self.subTest(status=status):
                failure, commands = self.invoke(missing_status=status)
                self.assertEqual(str(failure), 'frontend_missing_asset_must_return_404')
                self.assert_removed(commands)

    def test_index_without_an_asset_reference_is_rejected(self):
        failure, commands = self.invoke(index=b'<html>public index</html>')
        self.assertEqual(str(failure), 'frontend_asset_reference_missing')
        self.assert_removed(commands)

    def test_creation_timeout_recovers_its_own_container_id_from_cidfile(self):
        failure, commands = self.invoke(creation_timeout=True)
        self.assertIsInstance(failure, subprocess.TimeoutExpired)
        self.assert_removed(commands)

    def test_changed_container_identity_prevents_removal(self):
        failure, commands = self.invoke(cleanup_image='sha256:' + 'c' * 64)
        self.assertEqual(str(failure), 'frontend_probe_identity_changed')
        self.assertFalse(any(args[:2] == ('docker', 'rm') for args in commands))

    def test_timeout_without_cidfile_finds_only_its_late_created_container(self):
        failure, commands = self.invoke(timeout_without_cid=True,
            inventory_outputs=[b'', CONTAINER.encode()], clock=(0, 0, 1))
        self.assertIsInstance(failure, subprocess.TimeoutExpired)
        queries = [args for args in commands if args[:2] == ('docker', 'ps')]
        self.assertEqual(len(queries), 2)
        self.assertTrue(all('name=^/' + NAME + '$' in args and
            'label=ieum.frontend.smoke.run=' + RUN_ID in args for args in queries))
        self.assert_removed(commands)

    def test_timeout_without_cidfile_reports_unconfirmed_cleanup_when_never_observed(self):
        failure, commands = self.invoke(timeout_without_cid=True,
            inventory_outputs=[b''], clock=(0, 0, 11))
        self.assertEqual(str(failure), 'frontend_probe_cleanup_unconfirmed')
        self.assertFalse(any(args[:2] == ('docker', 'rm') for args in commands))

    def test_timeout_with_empty_or_partial_cidfile_recovers_only_its_verified_container(self):
        for candidate in ('', CONTAINER[:12]):
            with self.subTest(candidate=candidate):
                failure, commands = self.invoke(creation_timeout=True, cidfile_text=candidate, clock=(0, 0))
                self.assertIsInstance(failure, subprocess.TimeoutExpired)
                query = next(args for args in commands if args[:2] == ('docker', 'ps'))
                self.assertIn('name=^/' + NAME + '$', query)
                self.assertIn('label=ieum.frontend.smoke.run=' + RUN_ID, query)
                self.assert_removed(commands)

    def test_timeout_without_cidfile_reports_failed_inventory_as_unconfirmed_cleanup(self):
        failure, commands = self.invoke(timeout_without_cid=True, inventory_failure=True, clock=(0, 0))
        self.assertEqual(str(failure), 'frontend_probe_cleanup_unconfirmed')
        self.assertFalse(any(args[:2] == ('docker', 'rm') for args in commands))

    def test_timeout_without_cidfile_does_not_remove_multiple_matches(self):
        failure, commands = self.invoke(timeout_without_cid=True,
            inventory_outputs=[(CONTAINER + '\n' + 'e' * 64).encode()], clock=(0, 0))
        self.assertEqual(str(failure), 'frontend_probe_identity_changed')
        self.assertFalse(any(args[:2] == ('docker', 'inspect') or args[:2] == ('docker', 'rm')
                             for args in commands))

    def test_timeout_without_cidfile_refuses_other_names_labels_and_images(self):
        for values in ({'cleanup_name': 'other-probe'}, {'cleanup_static_label': 'false'},
                       {'cleanup_run_label': 'e' * 32}, {'cleanup_image': 'sha256:' + 'e' * 64}):
            with self.subTest(values=values):
                failure, commands = self.invoke(timeout_without_cid=True, clock=(0, 0), **values)
                self.assertEqual(str(failure), 'frontend_probe_identity_changed')
                self.assertFalse(any(args[:2] == ('docker', 'rm') for args in commands))

    def test_confirmed_container_already_removed_by_docker_needs_no_extra_cleanup(self):
        failure, commands = self.invoke(inventory_outputs=[b''])
        self.assertIsNone(failure)
        self.assertFalse(any(args[:2] == ('docker', 'rm') for args in commands))

    def test_fetch_uses_container_loopback_without_passing_environment_or_credentials(self):
        with patch.object(smoke.subprocess, 'run') as run:
            smoke.fetch(CONTAINER, '/index.html')
        self.assertEqual(run.call_args.args[0], ['docker', 'exec', CONTAINER,
            'wget', '-q', '-T', '3', '-O', '-', 'http://127.0.0.1/index.html'])
        self.assertNotIn('env', run.call_args.kwargs)

    def test_cli_hides_raw_docker_timeout_details(self):
        error = subprocess.TimeoutExpired(SECRET, 1, stderr=SECRET)
        stderr = io.StringIO()
        with patch.object(smoke, 'check_image', side_effect=error), \
             patch.object(smoke.signal, 'signal'), \
             patch.object(smoke.sys, 'argv', ['frontend_smoke.py', '--image', 'frontend:synthetic']), \
             contextlib.redirect_stderr(stderr):
            self.assertEqual(smoke.main(), 1)
        self.assertEqual(stderr.getvalue(), 'Frontend image rejected: frontend_http_check_failed\n')


if __name__ == '__main__':
    unittest.main()
