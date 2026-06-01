import github from '@/assets/serviceIcon/github.png'
import slack from '@/assets/serviceIcon/slack.png'
import notion from '@/assets/serviceIcon/notion.png'
import openai from '@/assets/serviceIcon/openai.png'
import gmail from '@/assets/serviceIcon/gmail.png'
import discord from '@/assets/serviceIcon/discord.png'

const INTEGRATIONS = [
	{ name: 'Slack', icon: slack },
	{ name: 'GitHub', icon: github },
	{ name: 'Notion', icon: notion },
	{ name: 'OpenAI', icon: openai },
	{ name: 'Gmail', icon: gmail },
	{ name: 'Discord', icon: discord },
] as const

const LandingIntegrations = () => (
	<section id='integrations' className='bg-main-deep-blue py-16 text-neutral-white'>
		<div className='mx-auto max-w-6xl px-5 text-center lg:px-8'>
			<h2 className='typo-title3_semibold m-0'>자주 쓰는 도구와 바로 연결</h2>
			<p className='typo-body3_regular m-0 mt-2 text-main-light-blue'>더 많은 연동이 계속 추가됩니다.</p>

			<div className='mt-10 flex flex-wrap items-center justify-center gap-4'>
				{INTEGRATIONS.map(({ name, icon }) => (
					<div
						key={name}
						className='flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm'
					>
						<img src={icon} alt='' className='h-7 w-7 object-contain' />
						<span className='typo-body3_semibold'>{name}</span>
					</div>
				))}
			</div>
		</div>
	</section>
)

export default LandingIntegrations
