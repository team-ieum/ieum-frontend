import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useUpdateCurrentUserMutation } from '@/hooks/user/mutations/useUpdateCurrentUserMutation'
import { profileNameSchema } from '@/schemas/user'
import { isApiError } from '@/utils/ApiError'

type SaveFeedback = { type: 'success' | 'error'; message: string } | null

/** `savedName`은 서버의 현재 닉네임이다. 입력하지 않은 동안은 이 값을 그대로 보여 준다. */
export const useProfileNameForm = (savedName: string | undefined) => {
	const { mutateAsync, isPending } = useUpdateCurrentUserMutation()
	// null이면 아직 수정하지 않은 상태다. 저장에 성공하면 다시 null로 돌려 갱신된 서버 값을 따른다.
	const [draft, setDraft] = useState<string | null>(null)
	const [error, setError] = useState('')
	const [feedback, setFeedback] = useState<SaveFeedback>(null)

	const name = draft ?? savedName ?? ''
	const isDirty = draft !== null && draft.trim() !== savedName

	const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
		setDraft(event.target.value)
		setError('')
		setFeedback(null)
	}

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!isDirty || isPending) return

		const parsed = profileNameSchema.safeParse(name)
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? '')
			return
		}

		try {
			await mutateAsync({ name: parsed.data })
			setDraft(null)
			setFeedback({ type: 'success', message: '변경사항을 저장했어요.' })
		} catch (saveError) {
			setFeedback({
				type: 'error',
				message: isApiError(saveError) ? saveError.message : '변경사항을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
			})
		}
	}

	return { name, error, feedback, isDirty, isPending, onNameChange, onSubmit }
}
