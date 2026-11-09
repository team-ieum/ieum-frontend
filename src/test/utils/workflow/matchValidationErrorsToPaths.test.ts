import { describe, expect, it } from 'vitest'
import type { WorkflowValidationErrorDto } from '@/types/workflowValidation'
import { matchValidationErrorsToPaths } from '@/utils/workflow/matchValidationErrorsToPaths'

const createError = (field: string | null): WorkflowValidationErrorDto => ({
	nodeId: 'node-1',
	field,
	code: 'REQUIRED',
	message: `${field ?? '노드'} 오류`,
})

const PANEL_PATHS = [
	'config.channel',
	'config.attendees',
	'config.cron',
	'config.tools',
	'config.tools.0.config.query',
	'config.outputFields',
]

describe('matchValidationErrorsToPaths', () => {
	it.each([
		['config.channel', 'config.channel'],
		['config.attendees.2.email', 'config.attendees'],
		['config.cron', 'config.cron'],
		['config.tools.0.config.query', 'config.tools.0.config.query'],
		['config.tools.1.config.query', 'config.tools'],
		['config.tools', 'config.tools'],
		['config.outputFields.1.key', 'config.outputFields'],
	])('field %s는 칸 %s에 붙는다', (field, path) => {
		const error = createError(field)
		const { byPath, unmatched } = matchValidationErrorsToPaths([error], PANEL_PATHS)

		expect(byPath.get(path)).toEqual([error])
		expect(unmatched).toEqual([])
	})

	it('접두어만 같은 다른 칸 이름에는 붙이지 않는다', () => {
		const error = createError('config.channelName')
		const { byPath, unmatched } = matchValidationErrorsToPaths([error], PANEL_PATHS)

		expect(byPath.size).toBe(0)
		expect(unmatched).toEqual([error])
	})

	it('field가 없거나 그리는 칸이 없으면 맞지 않는 오류로 모은다', () => {
		const nodeError = createError(null)
		const fieldError = createError('config.channel')

		expect(matchValidationErrorsToPaths([nodeError], PANEL_PATHS).unmatched).toEqual([nodeError])
		expect(matchValidationErrorsToPaths([fieldError], []).unmatched).toEqual([fieldError])
	})

	it('같은 칸의 오류는 응답 순서대로 모은다', () => {
		const first = { ...createError('config.attendees.0.email'), message: '첫째' }
		const second = { ...createError('config.attendees'), message: '둘째' }

		expect(matchValidationErrorsToPaths([first, second], PANEL_PATHS).byPath.get('config.attendees')).toEqual([first, second])
	})
})
