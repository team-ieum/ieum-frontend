import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useWorkflowListUiState } from '@/hooks/workflow/useWorkflowListUiState'

const renderUiState = (initialEntry = '/workflow') =>
	renderHook(() => ({ ui: useWorkflowListUiState(), location: useLocation() }), {
		wrapper: ({ children }: PropsWithChildren) => <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>,
	})

describe('useWorkflowListUiState', () => {
	it('검색과 필터는 비어 있고 최근순 및 카드 보기로 시작한다', () => {
		const { result } = renderUiState()

		expect(result.current.ui).toMatchObject({
			search: '',
			sort: 'recent',
			view: 'card',
			filters: { services: [], categories: [], statuses: [] },
		})
	})

	it('필터를 같은 렌더에서 연속 추가하고 다시 선택한 값만 제거한다', () => {
		const { result } = renderUiState()

		act(() => {
			result.current.ui.toggleService('slack')
			result.current.ui.toggleService('notion')
			result.current.ui.toggleCategory('ops')
			result.current.ui.toggleCategory('dev')
			result.current.ui.toggleStatus('active')
			result.current.ui.toggleStatus('paused')
		})

		expect(result.current.ui.filters).toEqual({
			services: ['slack', 'notion'],
			categories: ['ops', 'dev'],
			statuses: ['active', 'paused'],
		})

		act(() => {
			result.current.ui.toggleService('slack')
			result.current.ui.toggleCategory('ops')
			result.current.ui.toggleStatus('active')
		})

		expect(result.current.ui.filters).toEqual({
			services: ['notion'],
			categories: ['dev'],
			statuses: ['paused'],
		})
	})

	it('선택한 필터 종류와 값만 제거한다', () => {
		const { result } = renderUiState()

		act(() => {
			result.current.ui.toggleService('slack')
			result.current.ui.toggleService('notion')
			result.current.ui.toggleCategory('ops')
			result.current.ui.toggleStatus('active')
		})

		act(() => result.current.ui.removeFilter({ kind: 'services', id: 'slack', label: 'Slack' }))

		expect(result.current.ui.filters).toEqual({
			services: ['notion'],
			categories: ['ops'],
			statuses: ['active'],
		})
	})

	it('검색과 필터를 초기화해도 정렬과 URL 보기 및 다른 query는 유지한다', () => {
		const { result } = renderUiState('/workflow?view=row&source=test')

		act(() => {
			result.current.ui.onSearchChange('고객')
			result.current.ui.onSortChange('name')
			result.current.ui.toggleService('slack')
			result.current.ui.toggleCategory('ops')
			result.current.ui.toggleStatus('active')
		})
		act(() => result.current.ui.clearFilters())

		expect(result.current.ui).toMatchObject({
			search: '',
			sort: 'name',
			view: 'row',
			filters: { services: [], categories: [], statuses: [] },
		})
		expect(result.current.location.search).toBe('?view=row&source=test')
	})

	it('검색·정렬·필터 변경은 URL을 수정하지 않고 보기 전환 후에도 로컬 상태를 유지한다', () => {
		const { result } = renderUiState('/workflow?source=test')
		const initialLocationKey = result.current.location.key

		act(() => {
			result.current.ui.onSearchChange('고객')
			result.current.ui.onSortChange('status')
			result.current.ui.toggleService('slack')
		})

		expect(result.current.location.search).toBe('?source=test')
		expect(result.current.location.key).toBe(initialLocationKey)

		act(() => result.current.ui.onViewChange('row'))

		expect(result.current.location.search).toBe('?source=test&view=row')
		expect(result.current.ui).toMatchObject({
			search: '고객',
			sort: 'status',
			view: 'row',
			filters: { services: ['slack'], categories: [], statuses: [] },
		})
		const rowLocationKey = result.current.location.key

		act(() => result.current.ui.onViewChange('row'))

		expect(result.current.location.key).toBe(rowLocationKey)
	})
})
