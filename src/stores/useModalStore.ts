import { create } from 'zustand'

type ConfirmOptions = {
	title: string
	message: string
	confirmText?: string
	cancelText?: string
	/** danger: 삭제·해제 등 파괴적 동작용 빨간 확인 버튼 */
	variant?: 'default' | 'danger'
	onConfirm: () => void
}

interface ModalState {
	isOpen: boolean
	title: string
	message: string
	confirmText: string
	cancelText: string
	variant: 'default' | 'danger'
	/** 설정되어 있으면 확인/취소형 모달로 동작 */
	onConfirm?: () => void
	open: (title: string, message: string) => void
	openConfirm: (options: ConfirmOptions) => void
	close: () => void
}

export const useModalStore = create<ModalState>(set => ({
	isOpen: false,
	title: '',
	message: '',
	confirmText: '확인',
	cancelText: '취소',
	variant: 'default',
	onConfirm: undefined,
	open: (title, message) =>
		set({ isOpen: true, title, message, confirmText: '확인', variant: 'default', onConfirm: undefined }),
	openConfirm: ({ title, message, confirmText = '확인', cancelText = '취소', variant = 'default', onConfirm }) =>
		set({ isOpen: true, title, message, confirmText, cancelText, variant, onConfirm }),
	close: () => set({ isOpen: false }),
}))
