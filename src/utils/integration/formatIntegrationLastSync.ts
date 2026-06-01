import { formatRelativeTime } from '@/utils/formatRelativeTime'

export const formatIntegrationLastSync = (isoDate: string): string => formatRelativeTime(isoDate)
