import { parseServerDateTime } from '@/utils/workflow/parseServerDateTime'

const SEOUL_TIME_ZONE = 'Asia/Seoul'

const seoulFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: SEOUL_TIME_ZONE,
	month: 'numeric',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
})

/**
 * 서버 시각 문자열을 브라우저 시간대와 상관없이 한국 시각 `11월 9일 14:30`으로 보여 준다.
 * 서버는 `…Z`(UTC) 문자열을 보낸다. 오프셋 없는 옛 형식은 이미 한국 시각이라 보고 숫자를 그대로 쓴다.
 * 읽지 못하면 받은 값을 그대로 쓴다.
 */
export const formatServerDateTime = (value: string) => {
	const time = parseServerDateTime(value)
	if (Number.isNaN(time)) return value
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		seoulFormatter.formatToParts(time).find(item => item.type === type)?.value
	return `${part('month')}월 ${part('day')}일 ${part('hour')}:${part('minute')}`
}
