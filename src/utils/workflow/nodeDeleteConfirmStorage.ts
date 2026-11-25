import { LOCAL_STORAGE_KEY } from '@/constants/key'

const SKIPPED_VALUE = 'true'

/** 노드를 지우기 전에 확인 창을 띄울지. 저장소를 읽을 수 없으면 안전하게 띄우는 쪽(true)으로 본다. */
export const getShouldConfirmNodeDelete = (): boolean => {
	try {
		return window.localStorage.getItem(LOCAL_STORAGE_KEY.SKIP_NODE_DELETE_CONFIRM) !== SKIPPED_VALUE
	} catch {
		return true
	}
}

/** 노드 삭제 확인 설정을 저장한다. 저장소에 쓸 수 없으면(비공개 모드 등) 조용히 무시하고 false를 돌려준다. */
export const setShouldConfirmNodeDelete = (shouldConfirm: boolean): boolean => {
	try {
		if (shouldConfirm) window.localStorage.removeItem(LOCAL_STORAGE_KEY.SKIP_NODE_DELETE_CONFIRM)
		else window.localStorage.setItem(LOCAL_STORAGE_KEY.SKIP_NODE_DELETE_CONFIRM, SKIPPED_VALUE)
		return true
	} catch {
		return false
	}
}
