"""MAIN 격리와 CI 이미지 전달 경계. 실제 Docker·서버·Secrets는 사용하지 않습니다."""

import ast
import hashlib
import io
import itertools
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import frontend_artifact as artifact
import frontend_env as frontend
from test_frontend_env import DEPLOYMENT, payload as dev_payload, records

ROOT = Path(__file__).resolve().parents[2]
SOURCE = 'a' * 40
IMAGE = 'ieum-frontend-main'
PRIVATE = 'synthetic-runtime-only-value'


def main_payload(extra=None):
    values = {key.replace('DEV_', 'MAIN_', 1): value for key, value in DEPLOYMENT.items()}
    values.update({'MAIN_COM_VITE_API_URL': 'https://kiacms.co.kr', 'MAIN_COM_NODE_VERSION': '24',
        'MAIN_COM_IMAGE_NAME': IMAGE, 'MAIN_COM_DATA_DOCKER_NETWORK': 'ieum_main_net_data',
        'MAIN_COM_DATA_DOCKER_NETWORK_SUBNET': '10.60.10.0/24'})
    for app in ('POSTGRES', 'REDIS', 'MONGO'):
        values['MAIN_COM_' + app + '_CONTAINER_NAME'] = 'ieum-main-' + app.lower()
    for color, subnet in [('BLUE', '10.40.10'), ('GREEN', '10.50.10')]:
        prefix = 'MAIN_' + color + '_'
        directory = '/home/kwung/deploy/bluegreen-main/runtime/' + color.lower()
        values.update({prefix + 'DOCKER_NETWORK': 'ieum_main_net_' + color.lower(),
            prefix + 'DOCKER_NETWORK_SUBNET': subnet + '.0/24',
            prefix + 'CONTAINER_NAME': 'ieum-main-' + color.lower() + '-frontend',
            prefix + 'FRONTEND_IP': subnet + '.20', prefix + 'BACKEND_IP': subnet + '.21',
            prefix + 'AGENT_IP': subnet + '.24', prefix + 'FRONTEND_ENV_DIR': directory,
            prefix + 'FRONTEND_ENV_FILE': directory + '/frontend.env'})
    values.update(extra or {})
    return json.dumps(values)


class MainSelectionTest(unittest.TestCase):
    def test_main_and_dev_select_only_their_own_namespace(self):
        combined = json.dumps({**json.loads(dev_payload()), **json.loads(main_payload()),
            'AWS_VITE_API_URL': PRIVATE, 'VITE_API_URL': PRIVATE})
        self.assertEqual(records(frontend.build_environment(combined, 'main')),
            {'NODE_ENV': 'production', 'VITE_API_URL': 'https://kiacms.co.kr'})
        self.assertEqual(frontend.build_environment(combined), frontend.build_environment(dev_payload()))
        self.assertEqual(frontend.build_deployment(combined, 'main'), frontend.build_deployment(main_payload(), 'main'))
        with self.assertRaises(frontend.FrontendEnvironmentError):
            frontend.build_environment(dev_payload(), 'main')

    def test_main_accepts_new_common_values_without_putting_metadata_into_runtime(self):
        content = frontend.build_environment(main_payload({'MAIN_COM_VITE_FUTURE': 'yes',
            'MAIN_COM_RUNTIME_ONLY': PRIVATE}), 'main')
        values = records(content)
        self.assertEqual(values['VITE_FUTURE'], 'yes')
        self.assertEqual(values['RUNTIME_ONLY'], PRIVATE)
        self.assertTrue(set(frontend.CI_KEYS + frontend.DEPLOYMENT_KEYS).isdisjoint(values))
        child = frontend.build_process_environment(content, {'VITE_OLD': 'old'}, 'main')
        self.assertNotIn('RUNTIME_ONLY', child)
        self.assertNotIn('VITE_OLD', child)

    def test_main_rejects_dev_domain_direct_prefix_or_wrong_scope(self):
        for change in ({'MAIN_COM_VITE_API_URL': 'https://green.kiacms.co.kr'},
                       {'MAIN_COM_VITE_API_URL': 'https://kiacms.co.kr/'},
                       {'MAIN_VITE_NEW': 'x'}, {'MAIN_COM_BLUE_FRONTEND_IP': '10.40.10.20'},
                       {'MAIN_BLUE_VITE_API_URL': 'https://kiacms.co.kr'}, {'MAIN_COM_NODE_OPTIONS': 'x'}):
            with self.subTest(change=change), self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_environment(main_payload(change), 'main')
        with self.assertRaises(frontend.FrontendEnvironmentError):
            frontend.build_environment(main_payload(), 'production')

    def test_main_rejects_dev_paths_networks_containers_and_stores(self):
        for key, value in (
            ('MAIN_BLUE_DOCKER_NETWORK', 'ieum_net_blue'),
            ('MAIN_COM_DATA_DOCKER_NETWORK', 'ieum_net_data'),
            ('MAIN_COM_POSTGRES_CONTAINER_NAME', 'ieum-postgres'),
            ('MAIN_BLUE_CONTAINER_NAME', 'ieum-blue-frontend'),
            ('MAIN_BLUE_FRONTEND_ENV_DIR', '/home/kwung/deploy/bluegreen/runtime/blue'),
            ('MAIN_GREEN_FRONTEND_ENV_FILE', '/home/kwung/deploy/bluegreen/runtime/green/frontend.env'),
        ):
            with self.subTest(key=key), self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.build_deployment(main_payload({key: value}), 'main')

    def test_main_ci_image_cannot_overwrite_dev_tags(self):
        frontend.validate_ci({'NODE_VERSION': '24.10.0', 'IMAGE_NAME': IMAGE}, 'main')
        for image in ('ieum-frontend-dev', 'ieum-main-dev', 'repository:tag', '../main', '-main'):
            with self.subTest(image=image), self.assertRaises(frontend.FrontendEnvironmentError):
                frontend.validate_ci({'NODE_VERSION': '24', 'IMAGE_NAME': image}, 'main')


class MainArtifactTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.settings = self.root / 'ieum-frontend-settings.synthetic'
        self.settings.mkdir(mode=0o700)
        self.bundle = self.root / 'ieum-frontend-bundle.synthetic'
        self.bundle.mkdir(mode=0o700)
        self.environment = {'GITHUB_RUN_ID': '42', 'GITHUB_RUN_ATTEMPT': '1',
                            'GITHUB_OUTPUT': str(self.root / 'output'), 'RUNNER_TEMP': str(self.root)}
        self.patch_env = patch.dict(os.environ, {'RUNNER_TEMP': str(self.root)})
        self.patch_env.start()
        self.addCleanup(self.patch_env.stop)
        frontend.restore_settings(self.settings, main_payload({'MAIN_COM_RUNTIME_ONLY': PRIVATE}), 'main')
        self.config = json.dumps({'architecture': 'amd64', 'os': 'linux', 'config': {}}).encode()
        self.image_id = 'sha256:' + hashlib.sha256(self.config).hexdigest()

    def write_archive(self, entries, path=None):
        with tarfile.open(path or self.bundle / artifact.ARCHIVE, 'w') as output:
            for name, content in entries.items():
                entry = tarfile.TarInfo(name); entry.size = len(content)
                output.addfile(entry, io.BytesIO(content))

    def create_archive(self, tags=None, extra=None):
        config_name = self.image_id[7:] + '.json'
        manifest = [{'Config': config_name, 'RepoTags': tags or [IMAGE + ':' + SOURCE], 'Layers': ['layer.tar']}]
        entries = {'manifest.json': json.dumps(manifest).encode(), config_name: self.config, 'layer.tar': b'layer'}
        entries.update(extra or {})
        self.write_archive(entries)

    def oci_entries(self, index=True, config=None):
        """containerd docker save의 OCI + Docker 호환 manifest 및 BuildKit attestation 형태."""
        entries = {}

        def blob(content, media_type):
            encoded = content if isinstance(content, bytes) else json.dumps(content).encode()
            digest = 'sha256:' + hashlib.sha256(encoded).hexdigest()
            entries['blobs/sha256/' + digest[7:]] = encoded
            return {'mediaType': media_type, 'digest': digest, 'size': len(encoded)}

        configuration = blob(self.config if config is None else config, 'application/vnd.oci.image.config.v1+json')
        layer = blob(b'layer', 'application/vnd.oci.image.layer.v1.tar')
        manifest_type = 'application/vnd.oci.image.manifest.v1+json'
        image_manifest = blob({'schemaVersion': 2, 'mediaType': manifest_type,
            'config': configuration, 'layers': [layer]}, manifest_type)
        image_manifest['platform'] = {'architecture': 'amd64', 'os': 'linux'}
        root = image_manifest
        attestation = None
        if index:
            attestation_config = blob({'architecture': 'unknown', 'os': 'unknown'}, 'application/vnd.oci.image.config.v1+json')
            attestation = blob({'schemaVersion': 2, 'mediaType': manifest_type,
                'config': attestation_config, 'layers': []}, manifest_type)
            attestation.update({'platform': {'architecture': 'unknown', 'os': 'unknown'},
                'annotations': {'vnd.docker.reference.type': 'attestation-manifest',
                                'vnd.docker.reference.digest': image_manifest['digest']}})
            index_type = 'application/vnd.oci.image.index.v1+json'
            root = blob({'schemaVersion': 2, 'mediaType': index_type,
                         'manifests': [image_manifest, attestation]}, index_type)
        root['annotations'] = {'io.containerd.image.name': 'docker.io/library/' + IMAGE + ':' + SOURCE,
                               'org.opencontainers.image.ref.name': SOURCE}
        entries['oci-layout'] = b'{"imageLayoutVersion":"1.0.0"}'
        entries['index.json'] = json.dumps({'schemaVersion': 2, 'manifests': [root]}).encode()
        entries['manifest.json'] = json.dumps([{'Config': 'blobs/sha256/' + configuration['digest'][7:],
            'RepoTags': [IMAGE + ':' + SOURCE], 'Layers': ['blobs/sha256/' + layer['digest'][7:]]}]).encode()
        return root['digest'], entries, attestation

    def pack(self, oci=False):
        image_id, entries, _ = self.oci_entries() if oci else (self.image_id, None, None)
        def docker(*arguments):
            if arguments[:3] == ('docker', 'image', 'inspect'):
                return image_id
            if arguments[:3] == ('docker', 'image', 'save'):
                self.write_archive(entries) if oci else self.create_archive()
                return ''
            raise AssertionError('Unexpected Docker operation')
        with patch.object(artifact, 'command', side_effect=docker):
            value = artifact.pack(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        for key in ('image_id', 'archive_sha256', 'settings_sha256'):
            self.environment['IEUM_EXPECTED_' + key.upper()] = value[key]
        return value

    def test_bundle_contains_no_private_settings_and_restored_snapshot_loads_same_image(self):
        manifest = self.pack()
        self.assertEqual({path.name for path in self.bundle.iterdir()}, {artifact.ARCHIVE, artifact.MANIFEST})
        self.assertNotIn(PRIVATE.encode(), (self.bundle / artifact.MANIFEST).read_bytes())
        self.assertNotIn(PRIVATE.encode(), (self.bundle / artifact.ARCHIVE).read_bytes())
        self.assertEqual(artifact.verify(self.bundle, self.settings, IMAGE, SOURCE, self.environment), manifest)
        with patch.object(artifact, 'command', side_effect=['loaded', self.image_id]) as docker:
            artifact.load(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        self.assertEqual(docker.call_args_list[0].args[:3], ('docker', 'image', 'load'))
        self.assertIn('image_id=' + self.image_id, (self.root / 'output').read_text())

    def test_ci_writes_only_public_build_values_and_deploy_can_restore_runtime_values(self):
        directory = self.root / 'ieum-frontend-settings.ci'
        directory.mkdir(mode=0o700)
        with patch.object(frontend.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)):
            frontend.build_settings(directory, main_payload({'MAIN_COM_RUNTIME_ONLY': PRIVATE}), 'main')
        self.assertNotIn(PRIVATE, (directory / frontend.CANDIDATE_NAME).read_text())
        self.assertIn(PRIVATE, (self.settings / frontend.CANDIDATE_NAME).read_text())
        self.assertEqual(artifact.settings_hash(directory), artifact.settings_hash(self.settings))

    def test_changed_settings_fail_before_loading(self):
        self.pack()
        frontend.cleanup_settings(self.settings)
        self.settings.mkdir(mode=0o700)
        frontend.restore_settings(self.settings, main_payload({'MAIN_COM_VITE_FUTURE': 'changed'}), 'main')
        with patch.object(artifact, 'command') as docker, self.assertRaisesRegex(
                frontend.FrontendEnvironmentError, 'artifact_settings_changed'):
            artifact.load(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        docker.assert_not_called()

    def test_wrong_commit_run_attempt_or_expected_digest_fail_before_load(self):
        self.pack()
        for environment, source in [({**self.environment, 'GITHUB_RUN_ID': '43'}, SOURCE),
                ({**self.environment, 'GITHUB_RUN_ATTEMPT': '2'}, SOURCE), (self.environment, 'b' * 40),
                ({**self.environment, 'IEUM_EXPECTED_ARCHIVE_SHA256': 'b' * 64}, SOURCE),
                ({**self.environment, 'IEUM_EXPECTED_IMAGE_ID': 'sha256:' + 'b' * 64}, SOURCE)]:
            with self.subTest(source=source), patch.object(artifact, 'command') as docker, \
                    self.assertRaises(frontend.FrontendEnvironmentError):
                artifact.load(self.bundle, self.settings, IMAGE, source, environment)
            docker.assert_not_called()

    def test_archive_mutation_rejects_without_docker(self):
        self.pack()
        with (self.bundle / artifact.ARCHIVE).open('ab') as output:
            output.write(b'mutation')
        with patch.object(artifact, 'command') as docker, self.assertRaisesRegex(
                frontend.FrontendEnvironmentError, 'artifact_archive_changed'):
            artifact.load(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        docker.assert_not_called()

    def test_archive_rejects_dev_tags_multiple_tags_config_digest_and_traversal(self):
        for tags, extra in [(['ieum-frontend-dev:' + SOURCE], {}),
                ([IMAGE + ':' + SOURCE, 'ieum-frontend-dev:latest'], {}),
                (None, {'../escape': b'invalid'})]:
            with self.subTest(tags=tags, extra=list(extra)):
                self.create_archive(tags, extra)
                with self.assertRaises(frontend.FrontendEnvironmentError):
                    artifact.validate_archive(self.bundle / artifact.ARCHIVE, IMAGE + ':' + SOURCE, self.image_id)
        self.create_archive()
        with self.assertRaisesRegex(frontend.FrontendEnvironmentError, 'image_config_mismatch'):
            artifact.validate_archive(self.bundle / artifact.ARCHIVE, IMAGE + ':' + SOURCE, 'sha256:' + 'b' * 64)

    def test_loaded_id_mismatch_is_not_passed_to_controller(self):
        self.pack()
        wrong_config = json.dumps({'architecture': 'amd64', 'os': 'linux', 'config': {'Env': ['WRONG=true']}}).encode()
        wrong_id, entries, _ = self.oci_entries(config=wrong_config)
        def docker(*arguments):
            if arguments[:3] == ('docker', 'image', 'load'):
                return ''
            if arguments[:3] == ('docker', 'image', 'inspect'):
                return wrong_id
            self.assertEqual(arguments[:4], ('docker', 'image', 'save', '--output'))
            self.write_archive(entries, arguments[4])
            return ''
        Path(self.environment['GITHUB_OUTPUT']).write_text('')
        with patch.object(artifact, 'command', side_effect=docker), \
                self.assertRaisesRegex(frontend.FrontendEnvironmentError, 'loaded_image_mismatch'):
            artifact.load(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        self.assertEqual(Path(self.environment['GITHUB_OUTPUT']).read_text(), '')
        self.assertEqual(list(self.root.glob('ieum-frontend-loaded.*')), [])

    def test_oci_manifest_and_index_resolve_to_config_digest(self):
        for index in (False, True):
            with self.subTest(index=index):
                image_id, entries, _ = self.oci_entries(index=index)
                self.assertNotEqual(image_id, self.image_id)
                self.write_archive(entries)
                for engine_id in (image_id, self.image_id):
                    self.assertEqual(artifact.validate_archive(self.bundle / artifact.ARCHIVE,
                        IMAGE + ':' + SOURCE, engine_id), self.image_id)

    def test_oci_bundle_passes_pack_verify_and_load_on_containerd(self):
        manifest = self.pack(oci=True)
        self.assertNotEqual(manifest['image_id'], self.image_id)
        self.assertEqual(artifact.verify(self.bundle, self.settings, IMAGE, SOURCE, self.environment), manifest)
        with patch.object(artifact, 'command', side_effect=['loaded', manifest['image_id']]) as docker:
            artifact.load(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        self.assertEqual(docker.call_count, 2)

    def test_export_may_omit_attestation_blobs_but_must_keep_executable_manifest(self):
        for omitted in ('attestation', 'attestation_config', 'executable'):
            with self.subTest(omitted=omitted):
                image_id, entries, attestation = self.oci_entries()
                path = 'blobs/sha256/' + attestation['digest'][7:]
                if omitted == 'attestation_config':
                    path = 'blobs/sha256/' + json.loads(entries[path])['config']['digest'][7:]
                elif omitted == 'executable':
                    path = 'blobs/sha256/' + attestation['annotations']['vnd.docker.reference.digest'][7:]
                del entries[path]
                self.write_archive(entries)
                if omitted == 'executable':
                    with self.assertRaises(frontend.FrontendEnvironmentError):
                        artifact.validate_archive(self.bundle / artifact.ARCHIVE, IMAGE + ':' + SOURCE, image_id)
                else:
                    self.assertEqual(artifact.validate_archive(self.bundle / artifact.ARCHIVE,
                        IMAGE + ':' + SOURCE, image_id), self.image_id)

    def test_containerd_bundle_loads_into_classic_store_with_actual_config_id(self):
        self.pack(oci=True)
        Path(self.environment['GITHUB_OUTPUT']).write_text('')
        with patch.object(artifact, 'command', side_effect=['loaded', self.image_id]) as docker:
            artifact.load(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        self.assertEqual(docker.call_count, 2)
        self.assertEqual(Path(self.environment['GITHUB_OUTPUT']).read_text(), 'image_id=' + self.image_id + '\n')

    def test_classic_bundle_loads_into_containerd_after_resaving_same_config(self):
        self.pack()
        new_id, entries, _ = self.oci_entries(index=False)
        def docker(*arguments):
            if arguments[:3] == ('docker', 'image', 'load'):
                return ''
            if arguments[:3] == ('docker', 'image', 'inspect'):
                return new_id
            self.assertEqual(arguments[:4], ('docker', 'image', 'save', '--output'))
            self.write_archive(entries, arguments[4])
            return ''
        Path(self.environment['GITHUB_OUTPUT']).write_text('')
        with patch.object(artifact, 'command', side_effect=docker):
            artifact.load(self.bundle, self.settings, IMAGE, SOURCE, self.environment)
        self.assertEqual(Path(self.environment['GITHUB_OUTPUT']).read_text(), 'image_id=' + new_id + '\n')
        self.assertEqual(list(self.root.glob('ieum-frontend-loaded.*')), [])

    def test_oci_cannot_import_dev_or_additional_tags_through_index(self):
        for mutation in ('name', 'ref', 'extra'):
            with self.subTest(mutation=mutation):
                image_id, entries, _ = self.oci_entries()
                index = json.loads(entries['index.json'])
                root = index['manifests'][0]
                if mutation == 'name':
                    root['annotations']['io.containerd.image.name'] = 'docker.io/library/ieum-frontend-dev:latest'
                elif mutation == 'ref':
                    root['annotations']['org.opencontainers.image.ref.name'] = 'dev'
                else:
                    index['manifests'].append(root)
                entries['index.json'] = json.dumps(index).encode()
                self.write_archive(entries)
                with self.assertRaises(frontend.FrontendEnvironmentError):
                    artifact.validate_archive(self.bundle / artifact.ARCHIVE, IMAGE + ':' + SOURCE, image_id)

    def test_archive_rejects_path_aliases_that_docker_would_normalize(self):
        for alias in ('./index.json', 'index.json/', 'blobs/../index.json', './manifest.json', 'blobs//sha256/unused'):
            with self.subTest(alias=alias):
                image_id, entries, _ = self.oci_entries()
                malicious = json.loads(entries['index.json'])
                malicious['manifests'][0]['annotations']['io.containerd.image.name'] = 'ieum-frontend-dev:latest'
                entries[alias] = json.dumps(malicious).encode()
                self.write_archive(entries)
                with self.assertRaisesRegex(frontend.FrontendEnvironmentError, 'invalid_image_archive'):
                    artifact.validate_archive(self.bundle / artifact.ARCHIVE, IMAGE + ':' + SOURCE, image_id)

    def test_oci_rejects_changed_descriptors_config_or_unrelated_id(self):
        for mutation in ('digest', 'size', 'config', 'unrelated', 'attestation'):
            with self.subTest(mutation=mutation):
                image_id, entries, attestation = self.oci_entries()
                if mutation == 'digest':
                    entries['blobs/sha256/' + image_id[7:]] += b' '
                elif mutation == 'size':
                    index = json.loads(entries['index.json'])
                    index['manifests'][0]['size'] += 1
                    entries['index.json'] = json.dumps(index).encode()
                elif mutation == 'config':
                    entries['blobs/sha256/' + self.image_id[7:]] += b' '
                elif mutation == 'unrelated':
                    image_id = 'sha256:' + 'b' * 64
                else:
                    image_id = attestation['digest']
                self.write_archive(entries)
                with self.assertRaises(frontend.FrontendEnvironmentError):
                    artifact.validate_archive(self.bundle / artifact.ARCHIVE, IMAGE + ':' + SOURCE, image_id)

    def test_oci_rejects_wrong_platform_and_different_docker_compatibility_config(self):
        for configuration in ({'architecture': 'arm64', 'os': 'linux', 'config': {}},
                              {'architecture': 'amd64', 'os': 'linux', 'config': {'Env': ['OTHER=true']}}):
            image_id, entries, _ = self.oci_entries(config=json.dumps(configuration).encode())
            if configuration['architecture'] == 'amd64':
                entries['blobs/sha256/' + self.image_id[7:]] = self.config
                manifest = json.loads(entries['manifest.json'])
                manifest[0]['Config'] = 'blobs/sha256/' + self.image_id[7:]
                entries['manifest.json'] = json.dumps(manifest).encode()
            self.write_archive(entries)
            with self.assertRaises(frontend.FrontendEnvironmentError):
                artifact.validate_archive(self.bundle / artifact.ARCHIVE, IMAGE + ':' + SOURCE, image_id)

    def test_cleanup_refuses_unrelated_directory_or_unexpected_files(self):
        unrelated = self.root / 'unrelated'; unrelated.mkdir()
        with self.assertRaises(frontend.FrontendEnvironmentError):
            artifact.cleanup(unrelated)
        (self.bundle / 'preserve').write_text('keep')
        with self.assertRaises(frontend.FrontendEnvironmentError):
            artifact.cleanup(self.bundle)
        self.assertTrue((self.bundle / 'preserve').exists())
        (self.bundle / 'preserve').unlink()
        self.pack()
        artifact.cleanup(self.bundle)
        self.assertFalse(self.bundle.exists())


class MainWorkflowTest(unittest.TestCase):
    def job_enabled(self, job, ref, event, operation, deploy_enabled='false', bootstrap_enabled='false'):
        """워크플로우의 실제 조건을 제한된 비교식으로 평가해 서버 실행 경계를 확인합니다."""
        workflow = (ROOT / '.github/workflows/frontend-main-server.yml').read_text()
        section = workflow.split('  ' + job + ':\n', 1)[1]
        match = re.search(r'^    if: (.+)(?:\n|$)', section, re.MULTILINE)
        self.assertIsNotNone(match)
        condition = match[1]
        if condition == '>-':
            lines = []
            for line in section[match.end():].splitlines():
                if not line.startswith('      '):
                    break
                lines.append(line.strip())
            condition = ' '.join(lines)
        values = {
            'github.ref': ref, 'github.event_name': event, 'inputs.operation': operation,
            'vars.MAIN_DEPLOY_ENABLED': deploy_enabled,
            'vars.MAIN_BOOTSTRAP_ENABLED': bootstrap_enabled,
        }
        for name, value in values.items():
            condition = condition.replace(name, repr(value))
        expression = ast.parse(condition.replace('&&', ' and ').replace('||', ' or '), mode='eval')
        allowed = (ast.Expression, ast.BoolOp, ast.And, ast.Or, ast.Compare, ast.Eq, ast.Constant)
        self.assertTrue(all(isinstance(node, allowed) for node in ast.walk(expression)))
        return eval(compile(expression, '<workflow-condition>', 'eval'), {'__builtins__': {}})

    def test_non_main_refs_only_allow_manual_build_on_the_reviewed_branch(self):
        branch = 'refs/heads/infra/IEUM-FE-95'
        refs = (branch, 'refs/heads/dev', 'refs/heads/infra/IEUM-FE-96', 'refs/tags/main')
        events = ('workflow_dispatch', 'push', 'pull_request')
        operations = ('build', 'configure-frontend', 'stage-bootstrap', 'deploy', '')
        for ref, event, operation in itertools.product(refs, events, operations):
            with self.subTest(ref=ref, event=event, operation=operation):
                expected = ref == branch and event == 'workflow_dispatch' and operation == 'build'
                self.assertEqual(self.job_enabled('build', ref, event, operation), expected)
                self.assertFalse(self.job_enabled('deploy', ref, event, operation, 'true', 'true'))

    def test_main_build_preserves_explicit_deployment_and_bootstrap_gates(self):
        scenarios = (('push', ''), ('workflow_dispatch', 'build'),
                     ('workflow_dispatch', 'configure-frontend'),
                     ('workflow_dispatch', 'stage-bootstrap'), ('workflow_dispatch', 'deploy'))
        for (event, operation), deploy, bootstrap in itertools.product(scenarios, ('false', 'true'), ('false', 'true')):
            with self.subTest(event=event, operation=operation, deploy=deploy, bootstrap=bootstrap):
                self.assertTrue(self.job_enabled('build', 'refs/heads/main', event, operation, deploy, bootstrap))
                expected = (event == 'push' or operation == 'deploy') and deploy == 'true' or \
                    operation in ('configure-frontend', 'stage-bootstrap') and bootstrap == 'true'
                self.assertEqual(self.job_enabled('deploy', 'refs/heads/main', event, operation, deploy, bootstrap), expected)

    def test_ci_and_server_deploy_have_separate_trust_and_execution_boundaries(self):
        workflow = (ROOT / '.github/workflows/frontend-main-server.yml').read_text()
        build, deploy = workflow.split('  deploy:\n', 1)
        self.assertIn('runs-on: ubuntu-latest', build)
        self.assertIn('npm run lint', build)
        self.assertIn('npm test -- --run', build)
        self.assertIn('npx --no-install tsc -b --noEmit', build)
        self.assertIn('frontend_smoke.py', build)
        self.assertIn("vars.MAIN_DEPLOY_ENABLED == 'true'", deploy)
        self.assertIn("vars.MAIN_BOOTSTRAP_ENABLED == 'true'", deploy)
        self.assertIn('default: build', build)
        self.assertIn('stage-bootstrap', deploy)
        self.assertIn('group: ieum_main_server', deploy)
        self.assertIn('labels: [self-hosted, linux, x64, ieum-frontend, main, deploy]', deploy)
        self.assertNotIn('npm ', deploy)
        self.assertNotIn('pytest', deploy)
        self.assertIn('artifact-ids: ${{ needs.build.outputs.artifact_id }}', deploy)
        self.assertEqual(workflow.count('ref: ${{ github.sha }}'), 2)
        self.assertIn('IEUM_DEPLOY_ENVIRONMENT=main', deploy)
        self.assertIn('/home/kwung/deploy/bluegreen-main/bluegreen.py', deploy)
        self.assertIn('/usr/local/sbin/ieum-main-bluegreen-nginx', deploy)
        self.assertIn('MAIN_BLUEGREEN_CONTROLLER_SHA256', deploy)
        self.assertIn('--image "$IMAGE_ID"', deploy)
        self.assertNotIn('secrets.AWS_', workflow)
        self.assertNotIn('secrets.DEV_', workflow)
        upload = workflow.split('uses: actions/upload-artifact@v4', 1)[1].split('      - name:', 1)[0]
        self.assertNotIn('frontend.env', upload)
        self.assertNotIn('frontend-deployment.json', upload)


if __name__ == '__main__':
    unittest.main()
