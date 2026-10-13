type DayOfWeekBase = 'quartz' | 'unix'

type CronFields = {
	minute: string
	hour: string
	dayOfMonth: string
	month: string
	dayOfWeek: string
	dayOfWeekBase: DayOfWeekBase
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const DAY_ALIASES: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }
const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKEND = [6, 0]

const isAny = (field: string) => field === '*' || field === '?'

const toInt = (value: string): number | null => (/^\d+$/.test(value) ? Number(value) : null)

const inRange = (value: number | null, min: number, max: number): value is number =>
	value !== null && value >= min && value <= max

const parseStep = (field: string): number | null => {
	const match = /^(?:\*|0)\/(\d+)$/.exec(field)
	return match ? Number(match[1]) : null
}

/** 5필드는 Unix(0·7=일요일), 6·7필드는 Quartz(1=일요일) 요일 번호로 해석한다. */
const parseFields = (expression: string): CronFields | null => {
	const parts = expression.trim().split(/\s+/)

	if (parts.length === 5) {
		const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
		return { minute, hour, dayOfMonth, month, dayOfWeek, dayOfWeekBase: 'unix' }
	}

	if (parts.length === 6 || parts.length === 7) {
		const [second, minute, hour, dayOfMonth, month, dayOfWeek, year] = parts
		if (toInt(second) === null) return null
		if (year !== undefined && !isAny(year)) return null
		return { minute, hour, dayOfMonth, month, dayOfWeek, dayOfWeekBase: 'quartz' }
	}

	return null
}

const parseDayOfWeek = (value: string, base: DayOfWeekBase): number | null => {
	const alias = DAY_ALIASES[value.toUpperCase()]
	if (alias !== undefined) return alias

	const day = toInt(value)
	if (base === 'quartz') return inRange(day, 1, 7) ? day - 1 : null
	return inRange(day, 0, 7) ? day % 7 : null
}

const parseDaysOfWeek = (field: string, base: DayOfWeekBase): number[] | null => {
	const days = new Set<number>()

	for (const part of field.split(',')) {
		const [startValue, endValue, ...rest] = part.split('-')
		if (rest.length > 0) return null

		const start = parseDayOfWeek(startValue, base)
		if (start === null) return null
		if (endValue === undefined) {
			days.add(start)
			continue
		}

		const end = parseDayOfWeek(endValue, base)
		if (end === null) return null
		for (let day = start; ; day = (day + 1) % 7) {
			days.add(day)
			if (day === end) break
		}
	}

	return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
}

const isSameDays = (days: number[], target: number[]) => days.length === target.length && target.every(day => days.includes(day))

const formatDaysOfWeek = (days: number[]): string | null => {
	if (days.length === 7) return null
	if (isSameDays(days, WEEKDAYS)) return '평일'
	if (isSameDays(days, WEEKEND)) return '주말'

	const mondayFirst = days.map(day => (day + 6) % 7)
	const isContinuous = mondayFirst.every((day, index) => index === 0 || day === mondayFirst[index - 1] + 1)
	if (days.length >= 3 && isContinuous) {
		return `${DAY_NAMES[days[0]]}~${DAY_NAMES[days[days.length - 1]]}`
	}

	return days.map(day => DAY_NAMES[day]).join('·')
}

const formatDate = ({ dayOfMonth, month, dayOfWeek, dayOfWeekBase }: CronFields): string | null => {
	const isEveryMonth = isAny(month)
	const monthValue = toInt(month)
	if (!isEveryMonth && !inRange(monthValue, 1, 12)) return null

	if (isAny(dayOfMonth)) {
		if (!isEveryMonth) return null
		if (isAny(dayOfWeek)) return '매일'

		const days = parseDaysOfWeek(dayOfWeek, dayOfWeekBase)
		if (!days) return null
		return formatDaysOfWeek(days) ?? '매일'
	}

	if (!isAny(dayOfWeek)) return null

	const dayLabel = dayOfMonth === 'L' ? '마지막 날' : inRange(toInt(dayOfMonth), 1, 31) ? `${toInt(dayOfMonth)}일` : null
	if (!dayLabel) return null

	return isEveryMonth ? `매월 ${dayLabel}` : `매년 ${monthValue}월 ${dayLabel}`
}

const formatClock = (hour: number, minute: number) => (minute === 0 ? `${hour}시` : `${hour}시 ${minute}분`)

type TimeLabel = { text: string; isRepeating: boolean }

const formatTime = ({ minute, hour }: CronFields): TimeLabel | null => {
	const minuteValue = toInt(minute)
	const minuteStep = parseStep(minute)
	const hourStep = parseStep(hour)

	if (isAny(hour)) {
		if (minute === '*') return { text: '1분마다', isRepeating: true }
		if (minuteStep) return { text: `${minuteStep}분마다`, isRepeating: true }
		if (inRange(minuteValue, 0, 59)) {
			return { text: minuteValue === 0 ? '매시 정각' : `매시 ${minuteValue}분`, isRepeating: true }
		}
		return null
	}

	if (!inRange(minuteValue, 0, 59)) return null
	if (hourStep) return { text: `${hourStep}시간마다`, isRepeating: true }

	const hours = hour.split(',').map(toInt)
	if (!hours.every(value => inRange(value, 0, 23))) return null

	return { text: hours.map(value => formatClock(value as number, minuteValue)).join(', '), isRepeating: false }
}

/**
 * cron 표현식을 "금 17시"처럼 읽을 수 있는 문구로 변환한다.
 * 해석할 수 없는 표현식이면 null을 반환한다.
 */
export const formatCronExpression = (expression: string): string | null => {
	const fields = parseFields(expression)
	if (!fields) return null

	const date = formatDate(fields)
	const time = formatTime(fields)
	if (!date || !time) return null

	if (time.isRepeating && date === '매일') return time.text
	return `${date} ${time.text}`
}
