import { describe, expect, it } from 'vitest'
import { isAppEventTriggerId } from '@/constants/workflow/workflowTrigger'

describe('isAppEventTriggerId', () => {
	it.each([
		['gmailNewEmail', true],
		['githubNewIssue', true],
		['manual', false],
		['event', false],
		['GMAIL_NEW_EMAIL', false],
	])('%s는 앱 트리거 id 여부가 %s다', (value, expected) => {
		expect(isAppEventTriggerId(value)).toBe(expected)
	})
})
