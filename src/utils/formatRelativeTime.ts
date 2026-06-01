import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export const formatRelativeTime = (isoDate: string): string =>
	formatDistanceToNow(new Date(isoDate), { addSuffix: true, locale: ko })
