import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NodeDeleteConfirmSetting from '@/components/user/NodeDeleteConfirmSetting'
import { getShouldConfirmNodeDelete, setShouldConfirmNodeDelete } from '@/utils/workflow/nodeDeleteConfirmStorage'

describe('NodeDeleteConfirmSetting', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('확인 창 설정을 켜진 상태로 보여 주고, 누를 때마다 끄고 켠 값을 브라우저에 저장한다', async () => {
		const user = userEvent.setup()
		render(<NodeDeleteConfirmSetting />)
		const toggle = screen.getByRole('switch', { name: '노드 삭제 전에 확인하기' })
		expect(toggle).toBeChecked()

		await user.click(toggle)
		expect(toggle).not.toBeChecked()
		expect(getShouldConfirmNodeDelete()).toBe(false)

		await user.click(toggle)
		expect(toggle).toBeChecked()
		expect(getShouldConfirmNodeDelete()).toBe(true)
	})

	it('캔버스 확인 창에서 다시 묻지 않기로 끈 설정을 꺼진 상태로 보여 준다', () => {
		setShouldConfirmNodeDelete(false)

		render(<NodeDeleteConfirmSetting />)

		expect(screen.getByRole('switch', { name: '노드 삭제 전에 확인하기' })).not.toBeChecked()
	})

	it('저장소에 쓸 수 없으면 값을 바꾸지 않고 안내한다', async () => {
		const user = userEvent.setup()
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError')
		})
		render(<NodeDeleteConfirmSetting />)
		const toggle = screen.getByRole('switch', { name: '노드 삭제 전에 확인하기' })

		await user.click(toggle)

		expect(toggle).toBeChecked()
		expect(screen.getByRole('alert')).toHaveTextContent('이 브라우저에서는 설정을 저장할 수 없어요.')
	})
})
