import { useState } from 'react'
import { useCurrentUserQuery } from '@/hooks/user/queries/useCurrentUserQuery'
import { useProfileNameForm, type ProfileNameSaveFeedback } from '@/hooks/user/useProfileNameForm'
import { PROFILE_NAME_RULE_MESSAGE } from '@/schemas/user'
import type { AccountSection, ProfileNameMessage, UserPageViewModel } from '@/types/user'

/** 검증 오류, 저장 결과, 입력 규칙 순으로 하나만 골라 입력 아래 한 줄의 높이가 바뀌지 않게 한다. */
const toProfileNameMessage = (error: string, feedback: ProfileNameSaveFeedback): ProfileNameMessage => {
	if (error) return { text: error, tone: 'error' }
	if (feedback?.type === 'error') return { text: feedback.message, tone: 'error', role: 'alert' }
	if (feedback?.type === 'success') return { text: feedback.message, tone: 'success', role: 'status' }
	return { text: PROFILE_NAME_RULE_MESSAGE, tone: 'hint' }
}

export const useUserPageViewModel = (): UserPageViewModel => {
	const userQuery = useCurrentUserQuery()
	const user = userQuery.data
	const nameForm = useProfileNameForm(user?.name)
	// 비밀번호 변경·회원 탈퇴는 한 번에 하나만 펼친다.
	const [openSection, setOpenSection] = useState<AccountSection | null>(null)

	const toggleSection = (section: AccountSection) => () => setOpenSection(current => (current === section ? null : section))

	return {
		profileResource: {
			// 오프라인 등으로 요청이 대기 중이어도 내 정보가 오기 전에는 skeleton을 유지한다.
			isLoading: userQuery.isPending,
			isRefetching: userQuery.isRefetching,
			isLoadingError: userQuery.isLoadingError,
			isRefetchError: userQuery.isRefetchError,
			retry: () => void userQuery.refetch(),
		},
		email: user?.email ?? '',
		nameField: {
			value: nameForm.name,
			hasError: Boolean(nameForm.error),
			message: toProfileNameMessage(nameForm.error, nameForm.feedback),
			isInputDisabled: nameForm.isPending,
			isSubmitDisabled: !nameForm.isDirty || nameForm.isPending,
			submitLabel: nameForm.isPending ? '변경 중...' : '닉네임 변경',
			handleChange: nameForm.handleNameChange,
			handleSubmit: event => void nameForm.handleSubmit(event),
		},
		isProfileCollapsed: openSection !== null,
		passwordSection: {
			isOpen: openSection === 'password',
			// 가입 방식을 알기 전에는 펼칠 내용을 정할 수 없다.
			isToggleDisabled: !user,
			canChangePassword: user?.provider === 'LOCAL',
			handleToggle: toggleSection('password'),
		},
		withdrawSection: {
			isOpen: openSection === 'withdraw',
			isToggleDisabled: !user,
			handleToggle: toggleSection('withdraw'),
		},
	}
}
