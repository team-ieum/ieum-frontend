import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { queryKeys } from '@/constants/queryKeys'
import { useModalStore } from '@/stores/useModalStore'
import {
	getGithubAppSetupReturnMessage,
	isGithubAppSetupReturnSearchParams,
	removeGithubAppSetupReturnSearchParams,
} from '@/utils/integration/githubAppSetupReturn'
import {
	detectOAuthProvider,
	getOAuthReturnMessage,
	isOAuthReturnSearchParams,
	removeOAuthReturnSearchParams,
} from '@/utils/integration/integrationOAuthReturn'

/**
 * 외부 연결 화면(OAuth 인가, GitHub App 설치)에서 연동 화면으로 돌아온 쿼리를 지우고,
 * 바뀌었을 수 있는 연결 목록을 다시 읽은 뒤 결과를 안내한다.
 */
export const useIntegrationOAuthReturn = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const queryClient = useQueryClient()
	const openModal = useModalStore(state => state.open)

	const handleOAuthReturn = useCallback(
		async (params: URLSearchParams, pathname = '') => {
			const provider = detectOAuthProvider(pathname, params)
			await queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list() })

			const modalMessage = getOAuthReturnMessage(params, provider)
			if (modalMessage) openModal(modalMessage.title, modalMessage.message)
		},
		[openModal, queryClient]
	)

	const handleGithubAppSetupReturn = useCallback(
		async (params: URLSearchParams) => {
			// 설치 화면에서 전체 페이지로 돌아오므로 레포 options 캐시는 비어 있다. 연결 목록만 다시 읽는다.
			await queryClient.invalidateQueries({ queryKey: queryKeys.oauthConnections.list() })
			const modalMessage = getGithubAppSetupReturnMessage(params)
			openModal(modalMessage.title, modalMessage.message)
		},
		[openModal, queryClient]
	)

	useEffect(() => {
		const isOAuthReturn = isOAuthReturnSearchParams(searchParams)
		const isGithubAppSetupReturn = isGithubAppSetupReturnSearchParams(searchParams)
		if (!isOAuthReturn && !isGithubAppSetupReturn) return

		const returnSearchParams = new URLSearchParams(searchParams)
		// 두 종류의 쿼리를 한 번에 지운다. setSearchParams를 따로 두 번 부르면 앞의 변경이 덮일 수 있다.
		setSearchParams(current => removeGithubAppSetupReturnSearchParams(removeOAuthReturnSearchParams(current)), {
			replace: true,
		})
		const handleReturn = isOAuthReturn ? handleOAuthReturn : handleGithubAppSetupReturn
		void handleReturn(returnSearchParams).catch(() => undefined)
	}, [handleGithubAppSetupReturn, handleOAuthReturn, searchParams, setSearchParams])
}
