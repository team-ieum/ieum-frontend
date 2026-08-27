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
