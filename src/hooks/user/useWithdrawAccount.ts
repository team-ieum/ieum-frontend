import { useState } from 'react'
import { useDeleteCurrentUserMutation } from '@/hooks/user/mutations/useDeleteCurrentUserMutation'
import { useSignOutToLogin } from '@/hooks/user/useSignOutToLogin'
import { isApiError } from '@/utils/ApiError'

export const useWithdrawAccount = () => {
	const signOutToLogin = useSignOutToLogin()
	const { mutateAsync, isPending } = useDeleteCurrentUserMutation()
	// 되돌릴 수 없는 삭제이므로 안내를 확인했다고 직접 체크해야 탈퇴할 수 있다.
	const [agreed, setAgreed] = useState(false)
	const [error, setError] = useState('')

	const handleAgreedChange = (value: boolean) => {
		setAgreed(value)
		setError('')
	}

	const reset = () => {
		setAgreed(false)
		setError('')
	}

	const handleWithdraw = async () => {
		if (!agreed || isPending) return

		try {
			await mutateAsync()
		} catch (deleteError) {
			// 서버 정리 중 오류가 나면 전부 롤백되어 계정이 그대로 남는다.
			setError(
				isApiError(deleteError) && deleteError.message
					? deleteError.message
					: '회원 탈퇴를 처리하지 못했어요. 계정은 그대로 남아 있으니 잠시 후 다시 시도해 주세요.'
			)
			return
		}

		await signOutToLogin({
			title: '회원 탈퇴 완료',
			message: '계정과 모든 데이터를 삭제했어요. 그동안 이용해 주셔서 감사합니다.',
		})
	}

	return { agreed, error, isPending, handleAgreedChange, reset, handleWithdraw }
}
