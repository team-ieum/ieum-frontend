import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDashboardHeroMetrics } from '../../hooks/dashboard/useDashboardHeroMetrics'
import type { DashboardChartTooltipProps, DashboardMiniStatProps } from '../../types/dashboard'
import DashboardIcon from './DashboardIcon'

const ChartTooltip = ({ active, payload, label }: DashboardChartTooltipProps) => {
	if (!active || !payload?.length) return null

	return (
		<div className='rounded-lg border border-neutral-200 bg-neutral-white px-3 py-2 shadow-md'>
			<p className='typo-caption1_semibold text-neutral-900'>{label}시</p>
			<p className='typo-caption1_regular text-neutral-600'>실행 {payload[0]?.value?.toLocaleString()}회</p>
		</div>
	)
}

const MiniStat = ({ label, value }: DashboardMiniStatProps) => (
	<div className='flex flex-col gap-0.5'>
		<span className='typo-caption1_medium text-main-light-blue'>{label}</span>
		<span className='typo-title2_bold tabular-nums text-neutral-white'>{value}</span>
	</div>
)

const DashboardHeroSection = () => {
	const { hero, hourlyExecutions } = useDashboardHeroMetrics()

	return (
		<div className='relative grid items-stretch gap-6 overflow-hidden rounded-brand-md bg-main-deep-blue p-6 text-neutral-white shadow-md lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-0 lg:p-8'>
			<div className='flex flex-col gap-4 lg:border-r lg:border-main-blue lg:pr-8'>
				<span className='typo-caption1_semibold tracking-wide text-main-light-blue'>오늘 총 실행</span>
				<div className='typo-display3_bold leading-none text-neutral-white tabular-nums'>
					{hero.totalRuns.toLocaleString()}
					<span className='typo-title2_medium ml-2 text-main-light-blue'>회</span>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<span className='inline-flex items-center gap-1 rounded-full bg-main-blue px-2.5 py-1 typo-caption1_semibold text-neutral-white'>
						<DashboardIcon name='arrow_upward' size={12} className='text-neutral-white' />+{hero.changePercent}%
					</span>
					<span className='typo-caption1_medium text-main-light-blue'>어제 대비</span>
				</div>
				<div className='flex gap-6 pt-2 lg:mt-auto lg:pt-4'>
					<MiniStat label='평균 시간' value={hero.avgDuration} />
					<MiniStat label='성공률' value={hero.successRate} />
				</div>
			</div>

			<div className='flex min-w-0 flex-col lg:pl-8'>
				<div className='mb-3 flex items-center justify-between gap-2'>
					<span className='typo-caption1_semibold tracking-wide text-main-light-blue'>시간대별 실행 (24시간)</span>
					<span className='inline-flex items-center gap-1.5 rounded-full bg-main-blue px-2.5 py-1 typo-caption1_medium text-neutral-white'>
						<span className='h-1.5 w-1.5 rounded-full bg-main-light-blue' aria-hidden />
						실시간
					</span>
				</div>
				<div
					className='min-h-[200px] w-full overflow-visible text-main-light-blue [&_.recharts-cartesian-axis-tick-value]:fill-current [&_.recharts-cartesian-axis-tick-value]:text-[11px] [&_.recharts-cartesian-grid_line]:stroke-main-blue [&_.recharts-area-curve]:stroke-main-light-blue'
					style={{ fontFamily: 'inherit' }}
				>
					<ResponsiveContainer width='100%' height={200}>
						<AreaChart data={hourlyExecutions} margin={{ top: 12, right: 16, left: 8, bottom: 0 }}>
							<defs>
								<linearGradient id='dashboardAreaGradient' className='text-main-light-blue'>
									<stop offset='0%' stopColor='currentColor' stopOpacity={0.7} />
									<stop offset='100%' stopColor='currentColor' stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray='2 4' vertical={false} />
							<XAxis
								dataKey='t'
								axisLine={false}
								tickLine={false}
								interval={0}
								padding={{ left: 0, right: 8 }}
								tick={{ fill: 'currentColor', fontSize: 11 }}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								width={52}
								tickMargin={4}
								tick={{ fill: 'currentColor', fontSize: 11 }}
							/>
							<Tooltip cursor={{ stroke: 'currentColor', strokeDasharray: '3 3' }} content={<ChartTooltip />} />
							<Area type='monotone' dataKey='count' strokeWidth={2.5} fill='url(#dashboardAreaGradient)' />
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	)
}

export default DashboardHeroSection
