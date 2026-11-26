export type OAuthDisconnectProvider = 'GITHUB' | 'NOTION'

export type OAuthDisconnectImpact = {
	totalCount: number
	noticeMode: 'individual' | 'summary'
	/** 화면에 생략된 항목을 포함해 해제 후에도 자동 실행을 시도하는 수 */
	automaticCount: number
	/** 서버 순서로 표시할 처음 세 워크플로우 */
	workflows: {
		id: string
		name: string
		statusLabel: '자동 실행 중' | '활성' | '일시정지'
		triggerLabel: string
		automaticNotice: string | null
	}[]
}
