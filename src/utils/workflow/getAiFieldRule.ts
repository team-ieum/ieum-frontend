import type { AppFieldRuleGetter } from '@/utils/workflow/getAppFieldRule'
import { isEmptyFieldValue, type NodeFieldNotice } from '@/utils/workflow/nodeFieldValue'

const CREDENTIAL_FIELD_KEY = 'credentialId'

// 카탈로그는 이 칸을 필수로 두지 않고 서버도 빈 값을 통과시킨다(IEUM-AI-85). 서버는 빈 키를 ADMIN·TESTER면 자체 LLM,
// 베타 자격이면 플랫폼 키로 실행하고 그 밖에는 MISSING_CREDENTIAL로 실패시킨다. 화면은 자격을 알 수 없어 항상 경고만 한다.
const EMPTY_CREDENTIAL_NOTICE: NodeFieldNotice = {
	tone: 'warning',
	message:
		'비워 두면 베타 플랫폼 키나 자체 LLM을 쓸 수 있는 계정에서만 실행돼요. 그 밖의 계정은 실행이 실패하니 등록한 API 키를 골라 주세요.',
}

/**
 * AI 노드(`ai.*`)의 칸 규칙. 노드 폼의 API 키 칸(`credentialId`)이 비면 경고를 붙인다. 저장·실행은 막지 않는다.
 */
export const getAiFieldRule: AppFieldRuleGetter = (_entryId, field, value, context) => {
	const isEmptyCredential = context.target === 'node' && field.key === CREDENTIAL_FIELD_KEY && isEmptyFieldValue(value)
	return { field, canUseOptionsReference: false, notice: isEmptyCredential ? EMPTY_CREDENTIAL_NOTICE : null }
}
