export const LOCAL_STORAGE_KEY = {
	ACCESS_TOKEN: 'accessToken',
	REFRESH_TOKEN: 'refreshToken',
	/** 값이 'true'면 캔버스에서 노드를 지울 때 확인 창을 띄우지 않는다. 계정이 아니라 브라우저 단위 설정이다. */
	SKIP_NODE_DELETE_CONFIRM: 'ieum-skip-node-delete-confirm',
} as const
