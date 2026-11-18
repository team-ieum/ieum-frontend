import { describe, expect, it } from 'vitest'
import { formatAffectedWorkflowsNotice } from '@/utils/integration/formatAffectedWorkflowsNotice'

describe('formatAffectedWorkflowsNotice', () => {
	it.each([
		[{ names: [], hasMore: false }, '이 연결을 쓰는 워크플로우는 없어요.'],
		[{ names: ['일정 알림'], hasMore: false }, '이 연결을 쓰는 워크플로우 1개는 실행할 때 실패해요: 일정 알림.'],
		[{ names: ['A', 'B', 'C'], hasMore: false }, '이 연결을 쓰는 워크플로우 3개는 실행할 때 실패해요: A, B, C.'],
		[
			{ names: ['A', 'B', 'C', 'D', 'E'], hasMore: false },
			'이 연결을 쓰는 워크플로우 5개는 실행할 때 실패해요: A, B, C 외 2개.',
		],
		// 서버가 전체 개수를 주지 않으므로 다음 페이지가 있으면 받은 수를 하한으로만 보여 준다.
		[{ names: ['A', 'B', 'C', 'D'], hasMore: true }, '이 연결을 쓰는 워크플로우 4개 이상은 실행할 때 실패해요: A, B, C 등.'],
	])('%o이면 "%s"를 만든다', (affected, expected) => {
		expect(formatAffectedWorkflowsNotice(affected)).toBe(expected)
	})

	it('조회에 실패하면 확인하지 못했다고 안내한다', () => {
		expect(formatAffectedWorkflowsNotice(null)).toBe('이 연결을 쓰는 워크플로우를 확인하지 못했어요.')
	})
})
