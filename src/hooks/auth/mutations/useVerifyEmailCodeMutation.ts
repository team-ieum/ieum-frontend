import { useMutation } from '@tanstack/react-query'
import { verifyEmailCode } from '@/api/auth'

export const useVerifyEmailCodeMutation = () => useMutation({ mutationFn: verifyEmailCode, retry: false })
