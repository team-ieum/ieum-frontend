import { useResetOnClose } from '@/hooks/user/useResetOnClose'
import { useWithdrawAccount } from '@/hooks/user/useWithdrawAccount'
import type { WithdrawFormViewModel } from '@/types/user'

export const useWithdrawFormViewModel = (isOpen: boolean): WithdrawFormViewModel => {
	const withdrawal = useWithdrawAccount()
	// 다시 펼쳤을 때 이전 동의가 남아 바로 탈퇴되지 않도록 닫히면 비운다.
	useResetOnClose(isOpen, withdrawal.reset)

	return {
		agreed: withdrawal.agreed,
		error: withdrawal.error,
		isAgreeDisabled: withdrawal.isPending,
		isWithdrawDisabled: !withdrawal.agreed || withdrawal.isPending,
		withdrawLabel: withdrawal.isPending ? '탈퇴 처리 중...' : '회원 탈퇴',
		handleAgreedChange: withdrawal.handleAgreedChange,
		handleWithdraw: () => void withdrawal.handleWithdraw(),
	}
}
