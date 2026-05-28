import { useCallback, useState } from 'react'

export const useIntegrationConnect = () => {
	const [connectingId, setConnectingId] = useState<string | null>(null)

	const connect = useCallback(async (serviceId: string) => {
		setConnectingId(serviceId)
		try {
			await new Promise(resolve => setTimeout(resolve, 400))
			// TODO: 실제 OAuth/연결 API 붙이면 여기서 redirect 또는 mutation 처리
		} finally {
			setConnectingId(null)
		}
	}, [])

	return { connect, connectingId, isConnecting: connectingId !== null }
}
