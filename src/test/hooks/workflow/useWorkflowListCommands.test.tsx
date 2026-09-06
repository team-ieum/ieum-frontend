import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowListCommands } from '@/hooks/workflow/useWorkflowListCommands'
import { useModalStore } from '@/stores/useModalStore'
import { ApiError } from '@/utils/ApiError'

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	delete: vi.fn(),
}))

vi.mock('@/hooks/workflow/mutations/useCreateWorkflowMutation', () => ({
	useCreateWorkflowMutation: () => ({ mutateAsync: mocks.create }),
}))

vi.mock('@/hooks/workflow/mutations/useDeleteWorkflowMutation', () => ({
	useDeleteWorkflowMutation: () => ({ mutateAsync: mocks.delete }),
}))

const renderCommands = () =>
	renderHook(() => ({ commands: useWorkflowListCommands(), location: useLocation() }), {
		wrapper: ({ children }: PropsWithChildren) => (
			<MemoryRouter initialEntries={['/workflow?view=row']}>{children}</MemoryRouter>
		),
	})

describe('useWorkflowListCommands', () => {
	beforeEach(() => {
		mocks.create.mockReset()
		mocks.delete.mockReset()
	})

	it('기본 수동 워크플로우를 생성한 뒤 응답 ID의 상세 경로로 이동한다', async () => {
		mocks.create.mockResolvedValue({ data: { id: 'created-workflow' } })
		const { result } = renderCommands()

		await act(async () => {
			await result.current.commands.handleCreateWorkflow()
		})

		expect(mocks.create).toHaveBeenCalledExactlyOnceWith({
			name: '새 워크플로우',
			nodes: [],
			edges: [],
			triggerType: 'MANUAL',
		})
		expect(result.current.location.pathname).toBe('/workflow/created-workflow')
		expect(useModalStore.getState().isOpen).toBe(false)
	})

	it('워크플로우를 열 때 이름을 navigation state로 전달한다', () => {
		const { result } = renderCommands()

		act(() => result.current.commands.handleOpenWorkflow('workflow-1', '고객 문의 분류'))

		expect(result.current.location.pathname).toBe('/workflow/workflow-1')
		expect(result.current.location.state).toEqual({ name: '고객 문의 분류' })
		expect(mocks.create).not.toHaveBeenCalled()
		expect(mocks.delete).not.toHaveBeenCalled()
	})

	it('선택한 ID를 삭제하고 목록 경로와 보기를 유지한다', async () => {
		mocks.delete.mockResolvedValue(undefined)
		const { result } = renderCommands()

		await act(async () => {
			await result.current.commands.handleDeleteWorkflow('workflow-1')
		})

		expect(mocks.delete).toHaveBeenCalledExactlyOnceWith('workflow-1')
		expect(result.current.location.pathname).toBe('/workflow')
		expect(result.current.location.search).toBe('?view=row')
		expect(useModalStore.getState().isOpen).toBe(false)
	})

	it.each([
		{
			error: new ApiError('INVALID_WORKFLOW', '워크플로우 구성을 확인해주세요.'),
			message: '워크플로우 구성을 확인해주세요.',
		},
		{
			error: new Error('network error'),
			message: '워크플로우 생성에 실패했어요. 다시 시도해주세요.',
		},
	])('생성 실패 시 "$message" 모달을 표시하고 이동하지 않는다', async ({ error, message }) => {
		mocks.create.mockRejectedValue(error)
		const { result } = renderCommands()

		await act(async () => {
			await result.current.commands.handleCreateWorkflow()
		})

		expect(useModalStore.getState()).toMatchObject({ isOpen: true, title: '오류', message })
		expect(result.current.location.pathname).toBe('/workflow')
		expect(result.current.location.search).toBe('?view=row')
	})

	it.each([
		{
			error: new ApiError('WORKFLOW_NOT_FOUND', '삭제할 워크플로우가 없습니다.'),
			message: '삭제할 워크플로우가 없습니다.',
		},
		{
			error: new Error('network error'),
			message: '워크플로우 삭제에 실패했어요. 다시 시도해주세요.',
		},
	])('삭제 실패 시 "$message" 모달을 표시하고 이동하지 않는다', async ({ error, message }) => {
		mocks.delete.mockRejectedValue(error)
		const { result } = renderCommands()

		await act(async () => {
			await result.current.commands.handleDeleteWorkflow('workflow-1')
		})

		expect(useModalStore.getState()).toMatchObject({ isOpen: true, title: '삭제 오류', message })
		expect(result.current.location.pathname).toBe('/workflow')
		expect(result.current.location.search).toBe('?view=row')
	})
})
