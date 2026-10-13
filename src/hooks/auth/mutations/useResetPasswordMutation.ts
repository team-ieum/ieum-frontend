import { useMutation } from '@tanstack/react-query'
import { resetPassword } from '@/api/auth'

export const useResetPasswordMutation = () => useMutation({ mutationFn: resetPassword, retry: false })
