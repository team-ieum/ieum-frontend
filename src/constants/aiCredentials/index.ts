import type { AiProvider, IntegrationTabItem } from '@/types/aiCredentials'

export const AI_PROVIDERS: AiProvider[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		desc: 'GPT-4o · GPT-4.1 · o3 · DALL·E 등 OpenAI 모델 호출',
		methods: ['apikey'],
		brand: '#10A37F',
		tint: '#E6F4EE',
		state: {
			apikey: { status: 'empty' },
		},
	},
	{
		id: 'anthropic',
		name: 'Anthropic Claude',
		desc: 'Claude Sonnet 4.5 · Claude Opus 4 · Claude Haiku',
		methods: ['apikey', 'oauth'],
		brand: '#D97757',
		tint: '#FAEEE6',
		state: {
			apikey: { status: 'empty' },
			oauth: { status: 'empty' },
		},
	},
	{
		id: 'gemini',
		name: 'Google Gemini',
		desc: 'Gemini 2.5 Pro / Flash · Vertex AI 연동',
		methods: ['oauth'],
		brand: '#4285F4',
		tint: '#E8F0FE',
		state: {
			oauth: { status: 'empty' },
		},
	},
	{
		id: 'azure',
		name: 'Azure OpenAI',
		desc: '엔터프라이즈 배포의 GPT 모델 (deployment 이름 필요)',
		methods: ['apikey'],
		brand: '#0078D4',
		tint: '#E3F0FC',
		state: {
			apikey: { status: 'empty' },
		},
	},
	{
		id: 'cohere',
		name: 'Cohere',
		desc: 'Command R+ · Rerank · Embed 모델',
		methods: ['apikey', 'oauth'],
		brand: '#39594D',
		tint: '#E6ECEA',
		state: {
			apikey: { status: 'empty' },
			oauth: { status: 'empty' },
		},
	},
]

export const INTEGRATION_TABS: IntegrationTabItem[] = [
	{ id: 'connected', label: '연결된 서비스', icon: 'cable' },
	{ id: 'ai-creds', label: 'AI 자격 증명', icon: 'vpn_key' },
	{ id: 'browser', label: '통합 모듈 브라우저', icon: 'travel_explore' },
]
