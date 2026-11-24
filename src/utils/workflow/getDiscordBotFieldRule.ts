import type { AppFieldRuleGetter } from '@/utils/workflow/getAppFieldRule'
import { isEmptyFieldValue, type NodeFieldNotice } from '@/utils/workflow/nodeFieldValue'

const CHANNEL_FIELD_KEY = 'channel_id'

// 도구 채널을 비우면 LLM이 채널을 고르므로, 프롬프트 인젝션으로 내 다른 서버 채널에 쓸 수 있다(명세: 고정 권장).
const AI_CHANNEL_NOTICE: NodeFieldNotice = {
	tone: 'warning',
	message:
		'채널을 골라 고정해 두는 걸 권장해요. 비우면 AI가 채널을 고르는데, 프롬프트에 섞인 지시에 따라 연결한 다른 서버의 채널에 쓸 수도 있어요.',
}

/**
 * Discord 봇 노드(`discord_bot.*`)의 칸 규칙. 채널 칸에만 적용한다.
 * - 노드 폼: 채널 드롭다운에 값/참조식 전환을 둔다. 서버 칸이 비면 드롭다운이 막히므로 앞 노드 출력은 참조식 방식으로 넣는다.
 *   채널 ID 직접 입력은 하지 않는다(참조식 칸은 `{{…}}` 형식만 받는다).
 * - AI 도구 카드: 드롭다운만 두고, 채널이 비면 고정 권장 경고를 띄운다(필수로 막지는 않는다).
 *   도구 config의 참조식을 서버가 풀어 주는지 확인하지 않아 참조식 전환은 두지 않는다.
 */
export const getDiscordBotFieldRule: AppFieldRuleGetter = (_entryId, field, value, context) => {
	if (field.key !== CHANNEL_FIELD_KEY) return { field, canUseOptionsReference: false, notice: null }
	if (context.target === 'aiTool') {
		return { field, canUseOptionsReference: false, notice: isEmptyFieldValue(value) ? AI_CHANNEL_NOTICE : null }
	}
	return { field, canUseOptionsReference: true, notice: null }
}
