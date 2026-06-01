import { useMutation } from '@tanstack/react-query'
import { login } from '@/api/auth'

export const useLoginMutation = () => {
	return useMutation({
		mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
	})
}
