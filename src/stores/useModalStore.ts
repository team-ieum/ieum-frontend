import { create } from 'zustand'

interface ModalState {
	isOpen: boolean
	title: string
	message: string
	open: (title: string, message: string) => void
	close: () => void
}

export const useModalStore = create<ModalState>(set => ({
	isOpen: false,
	title: '',
	message: '',
	open: (title, message) => set({ isOpen: true, title, message }),
	close: () => set({ isOpen: false }),
}))
