// TODO: 임시 노드 데이터 - 워크플로우 생성 API 테스트용, 추후 삭제
import type { CreateWorkflowNodeDto } from '@/types/workflow'

export const TEMP_INITIAL_NODES: CreateWorkflowNodeDto[] = [
	{
		id: 'node-1',
		type: 'TRIGGER',
		label: '매주 금요일 오후 5시 트리거',
		config: {
			triggerType: 'SCHEDULE',
			cron: '0 17 * * 5',
			credentialId: '',
		},
	},
	{
		id: 'node-2',
		type: 'AI',
		label: 'GitHub PR 목록 조회',
		config: {
			llmProvider: 'GEMINI',
			credentialId: '42a230ce-32a4-4f99-aaed-da00dc85c2a8',
			prompt: 'team-ieum/ieum-backend 저장소의 PR을 최신순 1페이지(per_page=30, page=1, sort=created, direction=desc)만 조회하고, 그 중 최근 7일 내 생성된 것만 골라 각 PR에서 number, title, html_url, created_at 필드만 JSON 배열로 반환해줘. 값은 임의로 요약/변경하지 마.',
			agentType: 'react',
			tools: [],
		},
	},
	{
		id: 'node-3',
		type: 'AI',
		label: 'Discord 주간 리포트 발송',
		config: {
			llmProvider: 'GEMINI',
			credentialId: '42a230ce-32a4-4f99-aaed-da00dc85c2a8',
			prompt: "다음 GitHub PR 목록을 보기 좋게 정리해서 Discord 채널에 '주간 리포트 완료' 메시지로 발송해줘: {{nodes.node-2.output.output}}",
			agentType: 'react',
			tools: [
				{
					name: 'discord',
					config: { webhookCredentialId: '614ac2ef-2624-4715-ac0c-58e840990dd9' },
				},
			],
		},
	},
]
