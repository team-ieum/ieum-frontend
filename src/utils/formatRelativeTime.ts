import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export const formatRelativeTime = (isoDate: string): string => {
	const date = new Date(isoDate)
	if (!Number.isFinite(date.getTime())) return '–'

	return formatDistanceToNow(date, { addSuffix: true, locale: ko })
}
