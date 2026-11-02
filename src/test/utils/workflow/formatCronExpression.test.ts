import { describe, expect, it } from 'vitest'
import { formatCronExpression } from '@/utils/workflow/formatCronExpression'

describe('formatCronExpression', () => {
	it.each([
		['0 0 17 ? * 6', '금 17시'],
		['0 0 17 ? * FRI', '금 17시'],
		['0 0 9 * * *', '매일 9시'],
		['0 30 9 * * ?', '매일 9시 30분'],
		['0 0 0 * * ?', '매일 0시'],
		['0 0 12 * * ?', '매일 12시'],
		['0 0 9 ? * 2-6', '평일 9시'],
		['0 0 10 ? * 1,7', '주말 10시'],
		['0 0 9 ? * MON-WED', '월~수 9시'],
		['0 0 9 ? * 2,4', '월·수 9시'],
		['0 0 9,18 * * ?', '매일 9시, 18시'],
		['0 0 9 1 * ?', '매월 1일 9시'],
		['0 0 9 L * ?', '매월 마지막 날 9시'],
		['0 0 9 25 12 ?', '매년 12월 25일 9시'],
		['0 */5 * * * ?', '5분마다'],
		['0 0 */2 * * ?', '2시간마다'],
		['0 0 * * * ?', '매시 정각'],
		['0 0 9 ? * 2-6 *', '평일 9시'],
	])('Quartz 형식 %s 를 "%s"로 표시한다', (expression, expected) => {
		expect(formatCronExpression(expression)).toBe(expected)
	})

	it.each([
		['0 17 * * 5', '금 17시'],
		['0 9 * * 0', '일 9시'],
		['0 9 * * 7', '일 9시'],
		['0 9 * * 1-5', '평일 9시'],
		['*/15 * * * *', '15분마다'],
	])('Unix 형식 %s 를 "%s"로 표시한다', (expression, expected) => {
		expect(formatCronExpression(expression)).toBe(expected)
	})

	it.each(['', 'invalid', '0 0 9 ? * 2#1', '0 0 25 * * ?', '0 0 9 1 * MON', '0 0 9 * * ? 2027'])(
		'해석할 수 없는 표현식 "%s"은 null을 반환한다',
		expression => {
			expect(formatCronExpression(expression)).toBeNull()
		}
	)
})
