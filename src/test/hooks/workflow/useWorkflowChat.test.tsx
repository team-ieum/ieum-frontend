import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowChat } from '@/hooks/workflow/useWorkflowChat'
import { useAuthStore } from '@/stores/useAuthStore'
import type { WorkflowEdgeDto, WorkflowNodeDto } from '@/types/workflowList'

// 활성화하면 바로 연결된 것처럼 onConnect를 부르고, 보낸 프레임은 publish mock으로 확인한다.
const mocks = vi.hoisted(() => ({
	publish: vi.fn(),
	credentialsData: undefined as unknown,
	providersData: undefined as unknown,
}))

vi.mock('@stomp/stompjs', () => ({
	Client: class {
		active = false
		connected = false
		private readonly onConnect: () => void
		constructor(options: { onConnect: () => void }) {
			this.onConnect = options.onConnect
		}
		activate() {
			this.active = true
			this.connected = true
			this.onConnect()
		}
		deactivate() {
			this.active = false
			return Promise.resolve()
		}
		subscribe() {
			return { unsubscribe: vi.fn() }
		}
		publish = mocks.publish
	},
}))
vi.mock('sockjs-client', () => ({ default: vi.fn() }))
vi.mock('@/hooks/aiCredentials/queries/useCredentialsQuery', () => ({
	useCredentialsQuery: () => ({ data: mocks.credentialsData }),
}))
vi.mock('@/hooks/aiCredentials/queries/useProvidersQuery', () => ({
	useProvidersQuery: () => ({ data: mocks.providersData }),
}))

const CLAUDE_CREDENTIAL_ID = 'credential-claude'

const givenClaudeCredentialWithModels = () => {
	mocks.credentialsData = {
		data: [{ id: CLAUDE_CREDENTIAL_ID, provider: 'CLAUDE', credentialType: 'API_KEY', displayName: '내 키', keyHint: '' }],
	}
	mocks.providersData = {
		data: {
			providers: [
				{
					provider: 'CLAUDE',
					models: [
						{ id: 'claude-sonnet-5-5', displayName: 'Claude Sonnet 5.5', default: true },
						{ id: 'claude-opus-5-5', displayName: 'Claude Opus 5.5' },
					],
				},
			],
		},
	}
}

const sendPrompt = async (result: { current: ReturnType<typeof useWorkflowChat> }) => {
	await waitFor(() => expect(result.current.connectionStatus).toBe('connected'))
	act(() => result.current.setInput('슬랙 알림 만들어 줘'))
	await act(() => result.current.handleSend())
	const frame = mocks.publish.mock.lastCall?.[0] as { body: string }
	return JSON.parse(frame.body) as Record<string, unknown>
}

describe('useWorkflowChat 요청 본문', () => {
	beforeEach(() => {
		vi.stubEnv('VITE_API_URL', 'https://api.test.invalid')
		vi.stubEnv('VITE_MEASUREMENT_MODE', 'false')
		useAuthStore.setState({ accessToken: 'test-access-token', refreshToken: 'test-refresh-token' })
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
		mocks.credentialsData = undefined
		mocks.providersData = undefined
	})

	it('currentNodes에 AI 노드 출력 칸과 시스템 메시지를 원형 그대로 싣는다', async () => {
		// 서버(agent)는 채팅 수정 요청의 이 값을 그대로 보존한다. FE가 빠뜨리면 채팅으로 수정할 때 출력 칸이 사라진다.
		const aiNode: WorkflowNodeDto = {
			id: 'ai-1',
			type: 'AI',
			event: 'ai.reasoning',
			label: '문의 분류',
			config: {
				agentType: 'simple',
				prompt: '분류해줘',
				systemMessage: '짧게 답해',
				outputFields: [
					{ key: 'urgent', type: 'boolean', description: '급한 문의인지' },
					{ key: 'category', type: 'text' },
				],
			},
		}
		const edges: WorkflowEdgeDto[] = []
		const { result } = renderHook(() => useWorkflowChat('workflow-id', [aiNode], edges))
		await waitFor(() => expect(result.current.connectionStatus).toBe('connected'))

		act(() => result.current.setInput('분류 칸을 하나 더 만들어줘'))
		await act(() => result.current.handleSend())

		expect(mocks.publish).toHaveBeenCalledTimes(1)
		const frame = mocks.publish.mock.lastCall?.[0] as { destination: string; body: string }
		expect(frame.destination).toBe('/app/chat/workflow-id')
		expect(JSON.parse(frame.body)).toMatchObject({ prompt: '분류 칸을 하나 더 만들어줘', currentNodes: [aiNode] })
	})

	it('자격 증명을 고르면 고른 모델이 없을 때 그 제공자의 기본 모델 ID를 싣는다', async () => {
		givenClaudeCredentialWithModels()
		localStorage.setItem('ieum-chat-credential-id', CLAUDE_CREDENTIAL_ID)
		const { result } = renderHook(() => useWorkflowChat('workflow-id', [], []))

		expect(result.current.selectedModelId).toBe('claude-sonnet-5-5')
		expect(await sendPrompt(result)).toMatchObject({ credentialId: CLAUDE_CREDENTIAL_ID, model: 'claude-sonnet-5-5' })
	})

	it('고른 모델을 기억해 요청에 싣는다', async () => {
		givenClaudeCredentialWithModels()
		localStorage.setItem('ieum-chat-credential-id', CLAUDE_CREDENTIAL_ID)
		const { result } = renderHook(() => useWorkflowChat('workflow-id', [], []))

		act(() => result.current.setSelectedModelId('claude-opus-5-5'))

		expect(localStorage.getItem('ieum-chat-model-id')).toBe('claude-opus-5-5')
		expect(await sendPrompt(result)).toMatchObject({ model: 'claude-opus-5-5' })
	})

	it('자격 증명을 고르지 않으면 모델 ID를 싣지 않는다', async () => {
		givenClaudeCredentialWithModels()
		const { result } = renderHook(() => useWorkflowChat('workflow-id', [], []))

		expect(await sendPrompt(result)).not.toHaveProperty('model')
	})
})
