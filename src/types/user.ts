import type { FormEventHandler } from 'react'
import type { ChangePasswordValues } from '@/schemas/user'
import type { ApiResponse } from '@/types/api'
import type { AsyncResourceState } from '@/types/asyncResource'

type UserAuthProvider = 'LOCAL' | 'GOOGLE'

export interface CurrentUser {
	id: string
	email: string
	name: string
	provider: UserAuthProvider
	createdAt: string
}

export type CurrentUserResponse = ApiResponse<CurrentUser>

export interface UpdateCurrentUserBody {
	name: string
}

export interface ChangePasswordBody {
	currentPassword: string
	newPassword: string
}

export type AccountSection = 'password' | 'withdraw'

/** 닉네임 입력 아래 한 줄에 보여 줄 문구. 검증 오류, 저장 결과, 입력 규칙 중 하나다. */
export type ProfileNameMessage = {
	text: string
	tone: 'hint' | 'error' | 'success'
	role?: 'alert' | 'status'
}

type ProfileNameFieldViewModel = {
	value: string
	hasError: boolean
	message: ProfileNameMessage
	isInputDisabled: boolean
	isSubmitDisabled: boolean
	submitLabel: string
	handleChange: (value: string) => void
	handleSubmit: FormEventHandler<HTMLFormElement>
}

type AccountSectionState = {
	isOpen: boolean
	isToggleDisabled: boolean
	handleToggle: () => void
}

export type UserPageViewModel = {
	profileResource: AsyncResourceState
	email: string
	nameField: ProfileNameFieldViewModel
	/** 비밀번호 변경·회원 탈퇴 중 하나를 펼치면 카드가 화면 높이를 넘지 않도록 프로필 정보 제목만 남기고 접는다. */
	isProfileCollapsed: boolean
	passwordSection: AccountSectionState & {
		/** 이메일 가입(LOCAL) 계정만 비밀번호를 바꿀 수 있다. */
		canChangePassword: boolean
	}
	withdrawSection: AccountSectionState
}

export type ChangePasswordField = keyof ChangePasswordValues
export type ChangePasswordErrors = Partial<Record<ChangePasswordField, string>>

export type PasswordChangeFormViewModel = {
	values: ChangePasswordValues
	errors: ChangePasswordErrors
	formError: string
	/** 새 비밀번호 오류가 있으면 입력 아래 오류가 규칙을 대신 안내하므로 규칙 문구를 숨긴다. */
	isRuleVisible: boolean
	isInputDisabled: boolean
	isSubmitDisabled: boolean
	submitLabel: string
	handleChange: (field: ChangePasswordField) => (value: string) => void
	handleSubmit: FormEventHandler<HTMLFormElement>
}

export type WithdrawFormViewModel = {
	agreed: boolean
	error: string
	isAgreeDisabled: boolean
	isWithdrawDisabled: boolean
	withdrawLabel: string
	handleAgreedChange: (agreed: boolean) => void
	handleWithdraw: () => void
}
