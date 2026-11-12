import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTimeZoneChoices } from '@/utils/workflow/getTimeZoneChoices'

// 실행 환경의 시간대·IANA 목록에 따라 결과가 달라지지 않게 두 값을 고정한다.
const stubBrowserTimeZone = (timeZone: string) =>
	vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
		...new Intl.DateTimeFormat().resolvedOptions(),
		timeZone,
	})

describe('getTimeZoneChoices', () => {
	afterEach(() => vi.restoreAllMocks())

	it('브라우저 시간대·Asia/Seoul·UTC를 먼저 두고 IANA 목록을 중복 없이 잇는다', () => {
		stubBrowserTimeZone('Europe/Paris')
		vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue(['Africa/Abidjan', 'Asia/Seoul', 'Europe/Paris'])

		expect(getTimeZoneChoices()).toEqual([
			{ id: 'Europe/Paris', name: 'Europe/Paris (브라우저 시간대)' },
			{ id: 'Asia/Seoul', name: 'Asia/Seoul' },
			{ id: 'UTC', name: 'UTC' },
			{ id: 'Africa/Abidjan', name: 'Africa/Abidjan' },
		])
	})

	it('브라우저 시간대가 자주 쓰는 시간대와 같으면 한 번만 두고 브라우저 시간대라고 표시한다', () => {
		stubBrowserTimeZone('Asia/Seoul')
		vi.spyOn(Intl, 'supportedValuesOf').mockReturnValue(['Asia/Seoul'])

		expect(getTimeZoneChoices()).toEqual([
			{ id: 'Asia/Seoul', name: 'Asia/Seoul (브라우저 시간대)' },
			{ id: 'UTC', name: 'UTC' },
		])
	})

	it('IANA 목록을 줄 수 없는 브라우저에서는 앞의 시간대만 돌려준다', () => {
		stubBrowserTimeZone('Asia/Seoul')
		vi.spyOn(Intl, 'supportedValuesOf').mockImplementation(() => {
			throw new RangeError('unsupported')
		})

		expect(getTimeZoneChoices().map(choice => choice.id)).toEqual(['Asia/Seoul', 'UTC'])
	})
})
