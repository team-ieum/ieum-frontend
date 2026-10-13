import { Braces, Cable, Clock3, GitBranch, MessageCircle, Send, Settings, Sparkles } from 'lucide-react'
import type { ReactElement } from 'react'
import symbolNoLine from '@/assets/symbolNoLine.png'
import '@/styles/UserPage.css'

const PatternBackground = (): ReactElement => (
	<div className='account-pattern-drift pointer-events-none absolute inset-0 text-sub-blue' aria-hidden='true'>
		<GitBranch className='absolute left-[5%] top-[12%] h-8 w-8 rotate-12 opacity-[0.16]' strokeWidth={1.35} />
		<Send className='absolute left-[18%] top-[42%] h-9 w-9 -rotate-12 opacity-[0.14]' strokeWidth={1.3} />
		<Braces className='absolute left-[9%] top-[72%] h-8 w-8 opacity-[0.13]' strokeWidth={1.3} />
		<Sparkles className='absolute left-[37%] top-[9%] h-6 w-6 opacity-[0.14]' strokeWidth={1.35} />
		<Settings className='absolute right-[31%] top-[14%] h-8 w-8 rotate-12 opacity-[0.13]' strokeWidth={1.3} />
		<Cable className='absolute right-[16%] top-[46%] h-9 w-9 opacity-[0.15]' strokeWidth={1.3} />
		<Clock3 className='absolute right-[7%] top-[16%] h-8 w-8 -rotate-6 opacity-[0.15]' strokeWidth={1.3} />
		<MessageCircle className='absolute right-[5%] top-[76%] h-9 w-9 rotate-6 opacity-[0.13]' strokeWidth={1.3} />
		<div className='absolute left-[4%] top-[29%] h-20 w-36 rounded-[50%] border-t border-dashed border-sub-blue/20' />
		<div className='absolute bottom-[12%] left-[21%] h-16 w-32 -rotate-6 rounded-[50%] border-t border-dashed border-sub-blue/20' />
		<div className='absolute right-[7%] top-[33%] h-20 w-40 -rotate-6 rounded-[50%] border-t border-dashed border-sub-blue/20' />
		<img
			src={symbolNoLine}
			alt=''
			className='absolute bottom-[10%] right-[27%] h-10 w-10 rotate-[-10deg] object-contain opacity-[0.09]'
		/>
	</div>
)

export default PatternBackground
