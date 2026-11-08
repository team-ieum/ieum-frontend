import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { executeWorkflow } from '@/api/workflow'
import { useWorkflowValidation } from '@/hooks/workflow/useWorkflowValidation'
import { workflowValidationErrorsFixture } from '@/mocks/fixtures/workflowValidation'
import { server } from '@/mocks/server'
import {
	createWorkflowExecuteValidationFailedHandler,
	createWorkflowValidateHandler,
	createWorkflowValidateProviderErrorHandler,
	WORKFLOW_VALIDATE_PATH,
} from '@/mocks/workflowValidationHandlers'
import { createTestQueryClient } from '@/test/createTestQueryClient'
import type { WorkflowNodeDto } from '@/types/workflowList'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { ApiError } from '@/utils/ApiError'

const channelError: WorkflowValidationErrorDto = {
	nodeId: 'slack-1',
	field: 'config.channel',
	code: 'REQUIRED',
	message: '채널을 골라 주세요.',
}

const createWrapper = (queryClient: QueryClient) =>
	function QueryWrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

type RenderValidationProps = { hasUnsavedChanges: boolean; serverNodes?: WorkflowNodeDto[] }

const renderValidation = (initialProps: RenderValidationProps = { hasUnsavedChanges: false }) =>
	renderHook(
		({ hasUnsavedChanges, serverNodes }: RenderValidationProps) =>
			useWorkflowValidation({ workflowId: 'workflow-1', hasUnsavedChanges, serverNodes }),
		{ initialProps, wrapper: createWrapper(createTestQueryClient()) }
	)

const createToolNode = (toolNames: string[]): WorkflowNodeDto => ({
	id: 'agent-1',
	type: 'AI',
	event: 'ai.agent',
	label: '에이전트',
	config: { tools: toolNames.map(name => ({ name, config: {} })) },
})

describe('useWorkflowValidation', () => {
	it('마운트하면 저장된 버전을 한 번 검사하고 valid가 아니라 errors로 문제를 판정한다', async () => {
		const onRequest = vi.fn()
		server.use(
			http.post(WORKFLOW_VALIDATE_PATH, ({ params }) => {
				onRequest(params.workflowId)
				// 서버가 valid를 잘못 보내도 errors가 있으면 문제로 본다.
				return HttpResponse.json({
					success: true,
					data: { valid: true, errors: [channelError] },
					message: 'OK',
					code: 'OK',
				})
			})
		)
		const { result } = renderValidation()

		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 1건'))
		expect(onRequest).toHaveBeenCalledExactlyOnceWith('workflow-1')
		expect(result.current.errorsByNodeId.get('slack-1')).toEqual([channelError])
		expect(result.current.globalErrors).toEqual([])
	})

	it('미저장 변경이 생겨도 결과를 숨기지 않고 저장된 버전 기준임을 알린다', async () => {
		server.use(createWorkflowValidateHandler([channelError]))
		const { result, rerender } = renderValidation()
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 1건'))

		rerender({ hasUnsavedChanges: true })

		expect(result.current.statusView?.detail).toBe('저장된 버전 기준')
		expect(result.current.errorsByNodeId.get('slack-1')).toEqual([channelError])
	})

	it('다시 검사가 502 PROVIDER_ERROR로 실패해도 이전 결과를 지우지 않는다', async () => {
		server.use(createWorkflowValidateHandler(workflowValidationErrorsFixture))
		const { result } = renderValidation()
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 4건'))

		server.use(createWorkflowValidateProviderErrorHandler())
		act(() => result.current.handleRevalidate())

		await waitFor(() => expect(result.current.statusView?.label).toBe('지금은 검사할 수 없어요'))
		expect(result.current.statusView?.detail).toBe('이전 결과 문제 4건')
		expect(result.current.errorsByNodeId.get('http-1')).toHaveLength(2)
		expect(result.current.globalErrors).toHaveLength(1)
	})

	it('revalidate는 문제 수를 돌려주고, 검사 요청이 실패하면 unavailable을 돌려준다', async () => {
		server.use(createWorkflowValidateHandler([channelError]))
		const { result } = renderValidation()
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 1건'))

		await act(async () => expect(await result.current.revalidate()).toEqual({ status: 'ok', errorCount: 1 }))

		server.use(createWorkflowValidateProviderErrorHandler())
		await act(async () => expect(await result.current.revalidate()).toEqual({ status: 'unavailable' }))
	})

	it('수동 실행 검증 실패를 검사 결과로 반영하고, 다음 검사 결과가 오면 실행 문구를 숨긴다', async () => {
		const { result } = renderValidation()
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 없음'))
		const executionError = new ApiError('WORKFLOW_VALIDATION_FAILED', '검증 실패 1건: 채널을 골라 주세요.', {
			data: { errors: [channelError] },
			status: 400,
		})

		act(() => result.current.applyExecutionError('workflow-1', executionError))

		expect(result.current.statusView?.label).toBe('검증 실패 1건: 채널을 골라 주세요.')
		expect(result.current.errorsByNodeId.get('slack-1')).toEqual([channelError])

		await act(async () => {
			await result.current.revalidate()
		})
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 없음'))
		expect(result.current.errorsByNodeId.size).toBe(0)
	})

	it('검증 실패가 아닌 실행 오류는 반영하지 않는다', async () => {
		server.use(createWorkflowValidateHandler([channelError]))
		const { result } = renderValidation()
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 1건'))

		act(() => result.current.applyExecutionError('workflow-1', new ApiError('WORKFLOW_NOT_FOUND', '없음')))

		expect(result.current.statusView?.label).toBe('문제 1건')
	})

	it('execute API의 400 WORKFLOW_VALIDATION_FAILED 응답을 그대로 받아 검사 결과로 반영한다', async () => {
		server.use(createWorkflowExecuteValidationFailedHandler([channelError]))
		const { result } = renderValidation()
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 없음'))
		const executionError = await executeWorkflow('workflow-1').catch((error: unknown) => error)

		act(() => result.current.applyExecutionError('workflow-1', executionError))

		expect(result.current.statusView?.label).toBe('검증 실패 1건: 채널을 골라 주세요.')
		expect(result.current.errorsByNodeId.get('slack-1')).toEqual([channelError])
	})

	it('결과를 받은 때의 저장본 노드를 기억해, 저장 뒤 다시 검사가 실패하면 이전 결과의 저장본을 유지한다', async () => {
		const beforeSave = [createToolNode(['A', 'B'])]
		const afterSave = [createToolNode(['B', 'C'])]
		server.use(createWorkflowValidateHandler([channelError]))
		const { result, rerender } = renderValidation({ hasUnsavedChanges: false, serverNodes: beforeSave })
		await waitFor(() => expect(result.current.validatedNodes).toBe(beforeSave))

		// 저장 성공으로 상세가 먼저 새 버전이 되어도, 검사 결과가 같으면 출처는 이전 저장본이다.
		rerender({ hasUnsavedChanges: false, serverNodes: afterSave })
		expect(result.current.validatedNodes).toBe(beforeSave)

		server.use(createWorkflowValidateProviderErrorHandler())
		act(() => result.current.handleRevalidate())
		await waitFor(() => expect(result.current.statusView?.label).toBe('지금은 검사할 수 없어요'))
		expect(result.current.validatedNodes).toBe(beforeSave)

		server.use(createWorkflowValidateHandler([]))
		act(() => result.current.handleRevalidate())
		await waitFor(() => expect(result.current.validatedNodes).toBe(afterSave))
	})

	it('상세보다 검사 결과가 먼저 오면 처음 받은 상세를 그 결과의 저장본으로 채운다', async () => {
		const nodes = [createToolNode(['A'])]
		const { result, rerender } = renderValidation({ hasUnsavedChanges: false, serverNodes: undefined })
		await waitFor(() => expect(result.current.statusView?.label).toBe('문제 없음'))
		expect(result.current.validatedNodes).toBeUndefined()

		rerender({ hasUnsavedChanges: false, serverNodes: nodes })

		expect(result.current.validatedNodes).toBe(nodes)
	})
})
