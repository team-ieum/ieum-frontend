import type { AppFieldRuleGetter } from '@/utils/workflow/getAppFieldRule'
import { isEmptyFieldValue, type NodeFieldNotice } from '@/utils/workflow/nodeFieldValue'

const CHANNEL_FIELD_KEY = 'channel'

// 봇 scope에 chat:write.public이 있어 초대 없이 공개 채널에 보낸다. 비공개 채널·DM은 서버가 실패시킨다(명세).
const PUBLIC_CHANNEL_NOTICE: NodeFieldNotice = {
	tone: 'info',
	message:
		'공개 채널에만 보낼 수 있어요. 봇을 채널에 초대하지 않아도 공개 채널에는 보내져요. 비공개 채널·DM에는 보낼 수 없어요.',
}

// 도구 채널을 비우면 LLM이 채널을 고르므로, 프롬프트 인젝션으로 다른 공개 채널에 쓸 수 있다(명세: 고정 권장).
const AI_CHANNEL_NOTICE: NodeFieldNotice = {
	tone: 'warning',
	message:
		'채널을 골라 고정해 두는 걸 권장해요. 비우면 AI가 채널을 고르는데, 프롬프트에 섞인 지시에 따라 다른 공개 채널에 쓸 수도 있어요.',
}

/**
 * Slack 봇 노드(`slack_bot.*`)의 칸 규칙. 채널 칸에만 안내를 붙인다.
 * - 노드 폼과 값을 고른 AI 도구 칸: 공개 채널 안내
 * - 비운 AI 도구 칸: 채널 고정 권장 경고(필수로 막지는 않는다)
 * 채널 드롭다운은 선택 전용이라 참조식 전환을 쓰지 않는다.
 */
export const getSlackBotFieldRule: AppFieldRuleGetter = (_entryId, field, value, context) => {
	if (field.key !== CHANNEL_FIELD_KEY) return { field, canUseOptionsReference: false, notice: null }
	const notice = context.target === 'aiTool' && isEmptyFieldValue(value) ? AI_CHANNEL_NOTICE : PUBLIC_CHANNEL_NOTICE
	return { field, canUseOptionsReference: false, notice }
}
