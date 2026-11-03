import { useMutation } from '@tanstack/react-query'
import { deleteCurrentUser } from '@/api/user'

export const useDeleteCurrentUserMutation = () => useMutation({ mutationFn: deleteCurrentUser })
