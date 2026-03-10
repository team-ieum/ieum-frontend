import { create } from "zustand"

interface ModalState {
    isOpen: boolean
    title: string
    content: string
    onClose: () => void
}

export const useModal = create<ModalState>((set) => ({
    isOpen: false,
    title: '',
    content: '',
    onClose: () => set({ isOpen: false }),
}))