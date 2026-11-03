import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCurrentUser } from '@/api/user'
import { queryKeys } from '@/constants/queryKeys'

export const useUpdateCurrentUserMutation = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: updateCurrentUser,
		// 수정 응답이 갱신된 내 정보 전체이므로 다시 조회하지 않고 cache를 바로 바꾼다.
		onSuccess: response => {
			queryClient.setQueryData(queryKeys.users.me(), response)
		},
	})
}
