import type { ReactNode } from 'react'
import { UserRound } from 'lucide-react'
import { cn } from '@/utils/cn'

type DefaultProfileImageProps = {
	/** 원의 크기와 테두리 */
	className: string
	iconClassName: string
	/** 원 위에 겹쳐 둘 요소(예: 이미지 변경 버튼) */
	children?: ReactNode
}

/** 프로필 이미지 등록 기능이 생기기 전까지 모든 사용자에게 보여 주는 기본 프로필 이미지. */
const DefaultProfileImage = ({ className, iconClassName, children }: DefaultProfileImageProps) => (
	<div
		className={cn(
			'relative flex items-center justify-center rounded-full bg-linear-to-b from-neutral-50 to-main-gray/10 text-neutral-400',
			className
		)}
	>
		<UserRound aria-hidden='true' className={iconClassName} strokeWidth={1.25} />
		{children}
	</div>
)

export default DefaultProfileImage
