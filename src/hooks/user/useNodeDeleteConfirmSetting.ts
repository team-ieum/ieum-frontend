import { useState } from 'react'
import { getShouldConfirmNodeDelete, setShouldConfirmNodeDelete } from '@/utils/workflow/nodeDeleteConfirmStorage'

type UseNodeDeleteConfirmSettingResult = {
	shouldConfirm: boolean
	/** 저장소에 쓸 수 없어 설정을 바꾸지 못했을 때의 안내. */
	errorMessage: string | null
	handleToggle: () => void
}

/** 계정 설정 화면에서 캔버스 노드 삭제 확인 창 설정을 켜고 끈다. 값은 이 브라우저에만 저장된다. */
export const useNodeDeleteConfirmSetting = (): UseNodeDeleteConfirmSettingResult => {
	const [shouldConfirm, setShouldConfirm] = useState(getShouldConfirmNodeDelete)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const handleToggle = () => {
		const next = !shouldConfirm
		if (!setShouldConfirmNodeDelete(next)) {
			setErrorMessage('이 브라우저에서는 설정을 저장할 수 없어요.')
			return
		}
		setErrorMessage(null)
		setShouldConfirm(next)
	}

	return { shouldConfirm, errorMessage, handleToggle }
}
