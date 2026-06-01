import { useMutation } from '@tanstack/react-query'
import { register } from '../../../api/auth'
import type { RequestRegisterDto } from '../../../types/auth'

export const useRegisterMutation = () => {
	return useMutation({
		mutationFn: (data: RequestRegisterDto) => register(data),
	})
}
