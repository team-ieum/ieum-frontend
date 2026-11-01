import { useEffect, useRef } from 'react'
import type { VerificationStep } from '@/types/authFlow'

type AuthFlowHeaderProps = { title: string; step: VerificationStep; finalLabel: string }
const AuthFlowHeader = ({ title, step, finalLabel }: AuthFlowHeaderProps) => {
	const heading = useRef<HTMLHeadingElement>(null)
	const steps = [
		{ id: 'email', label: '이메일' },
		{ id: 'code', label: '코드 인증' },
		{ id: 'details', label: finalLabel },
	]
	useEffect(() => {
		heading.current?.focus()
	}, [step])
	return (
		<header className='text-center'>
			<h1
				ref={heading}
				tabIndex={-1}
				className='typo-title2_bold rounded-brand-sm text-main-deep-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-main-blue'
			>
				{title}
			</h1>
			<ol aria-label='진행 단계' className='mt-5 flex justify-center gap-2 sm:gap-4'>
				{steps.map((item, index) => (
					<li
						key={item.id}
						aria-current={step === item.id ? 'step' : undefined}
						className={
							step === item.id ? 'typo-caption1_bold text-main-deep-blue' : 'typo-caption1_regular text-neutral-500'
						}
					>
						<span aria-hidden='true'>{index + 1}. </span>
						{item.label}
					</li>
				))}
			</ol>
			<p className='mt-4 text-balance typo-body2_regular text-neutral-500'>
				{step === 'email'
					? '인증코드를 받을 이메일을 입력해주세요.'
					: step === 'code'
						? '이메일로 받은 6자리 인증코드를 입력해주세요.'
						: '이메일 인증을 마쳤습니다. 아래 정보를 입력해주세요.'}
			</p>
		</header>
	)
}
export default AuthFlowHeader
