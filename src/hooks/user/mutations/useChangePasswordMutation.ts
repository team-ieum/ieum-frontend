import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@/api/user'

export const useChangePasswordMutation = () => useMutation({ mutationFn: changePassword })
