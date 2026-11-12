import type { NodeCatalogChoice } from '@/types/nodeCatalog'

// 브라우저 시간대 다음에 둘 자주 쓰는 시간대. UTC는 엔진에 따라 supportedValuesOf 목록에 없어 직접 넣는다.
const COMMON_TIME_ZONES = ['Asia/Seoul', 'UTC']

const getBrowserTimeZone = () => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
	} catch {
		return undefined
	}
}

const getSupportedTimeZones = (): string[] => {
	// 2022년 이전 브라우저에는 supportedValuesOf가 없다.
	if (typeof Intl.supportedValuesOf !== 'function') return []
	try {
		return Intl.supportedValuesOf('timeZone')
	} catch {
		return []
	}
}

/**
 * 시간대 선택 상자의 선택지. 브라우저 시간대(라벨에 표시)·자주 쓰는 시간대를 먼저 두고 IANA 전체 목록을 중복 없이 잇는다.
 * IANA 목록을 줄 수 없는 브라우저에서는 앞의 시간대만 돌려준다.
 */
export const getTimeZoneChoices = (): NodeCatalogChoice[] => {
	const browserTimeZone = getBrowserTimeZone()
	const ids = [...new Set([browserTimeZone, ...COMMON_TIME_ZONES, ...getSupportedTimeZones()].filter(id => id !== undefined))]
	return ids.map(id => ({ id, name: id === browserTimeZone ? `${id} (브라우저 시간대)` : id }))
}
