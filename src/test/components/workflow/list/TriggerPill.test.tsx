import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TriggerPill } from '@/components/workflow/list/WorkflowListPrimitives'

describe('TriggerPill', () => {
	it.each([
		['gmailNewEmail', 'Gmail 메일', 'Gmail 로고'],
		['githubNewIssue', 'GitHub 이슈', 'GitHub 로고'],
	] as const)('%s 앱 트리거는 브랜드 로고와 라벨을 표시한다', (trigger, label, logoName) => {
		render(<TriggerPill trigger={trigger} />)

		expect(screen.getByText(label)).toBeInTheDocument()
		expect(screen.getByRole('img', { hidden: true, name: logoName }).closest('[aria-hidden="true"]')).not.toBeNull()
	})

	it('수동·웹훅·스케줄·이벤트 트리거는 로고 없이 기존 라벨을 표시한다', () => {
		render(<TriggerPill trigger='manual' />)

		expect(screen.getByText('수동')).toBeInTheDocument()
		expect(screen.queryByRole('img', { hidden: true, name: /로고/ })).not.toBeInTheDocument()
	})
})
