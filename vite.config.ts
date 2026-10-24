import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	const apiTarget = env.VITE_API_URL?.replace(/\/$/, '')

	return {
		define: {
			global: 'globalThis',
		},
		plugins: [
			react({
				babel: {
					plugins: ['babel-plugin-react-compiler'],
				},
			}),
			tailwindcss(),
		],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: './src/test/setup.ts',
			// self-hosted CI에서 전체 병렬 실행 시 route 테스트가 로컬보다 약 3배 느리고, 서버 부하에 따라 기본값 5초를 넘는다.
			// 테스트가 끝나면 바로 종료되므로 정상 실행 시간은 늘지 않는다.
			testTimeout: 15_000,
		},
		server: apiTarget
			? {
					proxy: {
						'/api': {
							target: apiTarget,
							changeOrigin: true,
							secure: true,
						},
					},
				}
			: undefined,
	}
})
