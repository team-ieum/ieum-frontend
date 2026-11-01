import { useMutation } from '@tanstack/react-query'
import { register } from '@/api/auth'

export const useRegisterMutation = () => useMutation({ mutationFn: register })
