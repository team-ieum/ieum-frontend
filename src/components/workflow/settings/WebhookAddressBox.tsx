import SkeletonPulse from '@/components/common/SkeletonPulse'
import { useWebhookToken } from '@/hooks/workflow/useWebhookToken'
import { cn } from '@/utils/cn'

type WebhookAddressBoxProps = {
	workflowId: string
}

const LINK_BUTTON_CLASS =
	'shrink-0 rounded-md px-1.5 py-0.5 typo-caption1_semibold text-main-deep-blue hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-blue'

/**
 * `webhook.catch` 테스트 영역 위의 수신 주소 칸.
 * 평문 주소는 발급한 화면에서만 보이고, 새로고침 뒤에는 새 주소를 만들어야 다시 볼 수 있다.
 */
const WebhookAddressBox = ({ workflowId }: WebhookAddressBoxProps) => {
	const { state, url, issuedAtLabel, isIssuing, issueErrorMessage, copyState, retry, handleIssue, handleCopy } =
		useWebhookToken(workflowId)

	const renderBody = () => {
		if (state === 'loading') {
			return (
				<div role='status' aria-label='수신 주소 확인 중' aria-busy='true'>
					<SkeletonPulse className='h-7 w-full rounded-md bg-neutral-200' />
				</div>
			)
		}
		if (state === 'error') {
			return (
				<div role='alert' className='flex items-center gap-2 typo-caption1_regular text-neutral-600'>
					<p className='m-0'>수신 주소를 확인하지 못했어요.</p>
					<button type='button' onClick={retry} className={LINK_BUTTON_CLASS}>
						다시 시도
					</button>
				</div>
			)
		}
		if (state === 'notIssued') {
			return (
				<div className='flex items-center justify-between gap-2'>
					<p className='m-0 typo-caption1_regular text-neutral-600'>외부 서비스가 요청을 보낼 주소가 아직 없어요.</p>
					<button type='button' onClick={handleIssue} disabled={isIssuing} className={LINK_BUTTON_CLASS}>
						{isIssuing ? '만드는 중…' : '수신 주소 만들기'}
					</button>
				</div>
			)
		}
		return (
			<div className='flex flex-col gap-1.5'>
				{url ? (
					<>
						<div className='flex items-center gap-1.5'>
							<input
								readOnly
								value={url}
								aria-label='수신 주소'
								onFocus={event => event.currentTarget.select()}
								className='min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 typo-mono-caption1_regular text-neutral-700 focus-visible:outline-2 focus-visible:outline-main-blue'
							/>
							<button type='button' onClick={() => void handleCopy()} className={LINK_BUTTON_CLASS}>
								복사
							</button>
						</div>
						<p aria-live='polite' className='m-0 typo-caption2_regular text-neutral-500'>
							{copyState === 'copied' ? '주소를 복사했어요. ' : null}
							{copyState === 'failed' ? '복사하지 못했어요. 주소를 직접 선택해 복사해 주세요. ' : null}이 주소는
							지금만 볼 수 있어요. 새로고침하면 다시 볼 수 없어요.
						</p>
					</>
				) : (
					<p className='m-0 typo-caption1_regular text-neutral-600'>
						{issuedAtLabel ? `${issuedAtLabel}에 주소를 만들었어요. ` : '주소를 만들었어요. '}
						주소는 만들 때만 보여 줘요.
					</p>
				)}
				<button type='button' onClick={handleIssue} disabled={isIssuing} className={cn('self-start', LINK_BUTTON_CLASS)}>
					{isIssuing ? '만드는 중…' : '새 주소 만들기'}
				</button>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-1.5 rounded-lg border border-neutral-200 p-2'>
			<h4 className='m-0 typo-caption1_bold text-neutral-700'>수신 주소</h4>
			{renderBody()}
			{issueErrorMessage ? (
				<p role='alert' className='m-0 typo-caption1_regular text-danger-700'>
					{issueErrorMessage}
				</p>
			) : null}
		</div>
	)
}

export default WebhookAddressBox
