import { create } from 'zustand'

/** 확인형 모달을 확인으로 닫았을 때의 결과. 체크 칸을 띄우지 않았으면 `isChecked`는 항상 false다. */
type ConfirmResult = { isChecked: boolean }

type ConfirmOptions = {
	title: string
	message: string
	confirmText?: string
	cancelText?: string
	/** danger: 삭제·해제 등 파괴적 동작용 빨간 확인 버튼 */
	variant?: 'default' | 'danger'
	/** 설정하면 버튼 위에 이 문구의 체크 칸을 띄운다(예: '다시 묻지 않기'). 체크 여부는 `onConfirm`으로만 받는다. */
	checkboxLabel?: string
	onConfirm: (result: ConfirmResult) => void
	/** 확인하지 않고 닫힐 때(취소·닫기·Escape·배경 클릭·다른 모달로 바뀜) 한 번 부른다. */
	onCancel?: () => void
}

interface ModalState {
	isOpen: boolean
	title: string
	message: string
	confirmText: string
	cancelText: string
	variant: 'default' | 'danger'
	checkboxLabel?: string
	isChecked: boolean
	/** 설정되어 있으면 확인/취소형 모달로 동작 */
	onConfirm?: (result: ConfirmResult) => void
	onCancel?: () => void
	open: (title: string, message: string) => void
	openConfirm: (options: ConfirmOptions) => void
	setChecked: (isChecked: boolean) => void
	/** 확인형 모달을 닫고 `onConfirm`을 부른다. `onCancel`은 부르지 않는다. */
	confirm: () => void
	/** 모달을 닫는다. 확인형 모달이 열려 있었으면 `onCancel`을 부른다. */
	close: () => void
}

export const useModalStore = create<ModalState>((set, get) => {
	// 열린 확인형 모달이 확인 없이 사라지면 기다리는 쪽에 알린다. 콜백이 새 모달을 열 수 있어 상태를 바꾼 뒤 부른다.
	const replace = (next: Partial<ModalState>) => {
		const { isOpen, onCancel } = get()
		set(next)
		if (isOpen) onCancel?.()
	}

	return {
		isOpen: false,
		title: '',
		message: '',
		confirmText: '확인',
		cancelText: '취소',
		variant: 'default',
		checkboxLabel: undefined,
		isChecked: false,
		onConfirm: undefined,
		onCancel: undefined,
		open: (title, message) =>
			replace({
				isOpen: true,
				title,
				message,
				confirmText: '확인',
				variant: 'default',
				checkboxLabel: undefined,
				isChecked: false,
				onConfirm: undefined,
				onCancel: undefined,
			}),
		openConfirm: ({
			title,
			message,
			confirmText = '확인',
			cancelText = '취소',
			variant = 'default',
			checkboxLabel,
			onConfirm,
			onCancel,
		}) =>
			replace({
				isOpen: true,
				title,
				message,
				confirmText,
				cancelText,
				variant,
				checkboxLabel,
				isChecked: false,
				onConfirm,
				onCancel,
			}),
		setChecked: isChecked => set({ isChecked }),
		confirm: () => {
			const { onConfirm, isChecked } = get()
			// 닫히는 애니메이션 동안 버튼 구성이 바뀌지 않게 onConfirm은 남기고 onCancel만 비운다.
			set({ isOpen: false, onCancel: undefined })
			onConfirm?.({ isChecked })
		},
		close: () => replace({ isOpen: false, onCancel: undefined }),
	}
})
