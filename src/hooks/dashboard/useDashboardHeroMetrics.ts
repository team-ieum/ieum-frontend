import type { HourlyExecution, UseDashboardHeroMetricsResult } from '../../types/dashboard'

const MOCK_HERO = {
	totalRuns: 1240,
	changePercent: 12,
	avgDuration: '1.6s',
	successRate: '97.8%',
}

const MOCK_HOURLY_EXECUTIONS: HourlyExecution[] = [
	{ t: '00', count: 28 },
	{ t: '02', count: 14 },
	{ t: '04', count: 9 },
	{ t: '06', count: 32 },
	{ t: '08', count: 86 },
	{ t: '10', count: 142 },
	{ t: '12', count: 168 },
	{ t: '14', count: 195 },
	{ t: '16', count: 224 },
	{ t: '18', count: 162 },
	{ t: '20', count: 98 },
	{ t: '22', count: 82 },
	{ t: '24', count: 54 },
]

export const useDashboardHeroMetrics = (): UseDashboardHeroMetricsResult => ({
	hero: MOCK_HERO,
	hourlyExecutions: MOCK_HOURLY_EXECUTIONS,
})
