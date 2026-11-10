/**
 * 서버 시각 문자열을 화면 시간대 기준 `11월 9일 14:30`으로 보여 준다.
 * 서버는 `…Z`(UTC) 문자열을 보내고, 오프셋 없는 옛 형식은 `Date.parse`가 화면 시간대로 읽어 숫자가 그대로 나온다.
 * 읽지 못하면 받은 값을 그대로 쓴다.
 */
export const formatServerDateTime = (value: string) => {
	const time = Date.parse(value)
	if (Number.isNaN(time)) return value
	const date = new Date(time)
	const pad = (unit: number) => String(unit).padStart(2, '0')
	return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
