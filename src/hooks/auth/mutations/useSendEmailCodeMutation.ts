import { useMutation } from '@tanstack/react-query'
import { sendEmailCode } from '@/api/auth'

export const useSendEmailCodeMutation = () => useMutation({ mutationFn: sendEmailCode, retry: false })
