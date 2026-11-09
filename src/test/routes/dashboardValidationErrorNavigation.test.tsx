import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { dashboardErrorsWithValidationFailureResponse } from '@/mocks/fixtures/dashboard'
import { WORKFLOW_FIXTURE_ID } from '@/mocks/fixtures/workflows'
import { server } from '@/mocks/server'
import { createWorkflowValidateHandler } from '@/mocks/workflowValidationHandlers'
import { renderAppRoute } from '@/test/renderAppRoute'

describe('대시보드 검증 실패 오류', () => {
	it('문제 보기를 누르면 그 워크플로우 편집 화면으로 이동해 저장된 버전을 검사한다', async () => {
		const onValidate = vi.fn()
		server.use(
			http.get('*/api/v1/workflows/dashboard/errors', () =>
				HttpResponse.json(dashboardErrorsWithValidationFailureResponse)
			),
			createWorkflowValidateHandler([], onValidate)
		)
		const user = userEvent.setup()
		renderAppRoute('/main')

		expect(await screen.findByText('검증 실패 2건: 메시지를 보낼 채널을 골라 주세요.')).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: /문제 보기/ })).toHaveLength(1)
		expect(onValidate).not.toHaveBeenCalled()

		await user.click(screen.getByRole('button', { name: '고객 문의 자동 분류 문제 보기' }))

		expect(await screen.findByRole('textbox', { name: '워크플로우 제목' })).toHaveValue('고객 문의 자동 분류')
		expect(await screen.findByText('문제 없음')).toBeInTheDocument()
		expect(onValidate).toHaveBeenCalledWith(WORKFLOW_FIXTURE_ID)
	})
})
