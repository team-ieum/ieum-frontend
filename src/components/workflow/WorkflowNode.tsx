import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
	AlertCircle,
	AlertTriangle,
	Blocks,
	CheckSquare,
	Disc3,
	FileText,
	Filter,
	GitBranch,
	Globe2,
	Hash,
	KanbanSquare,
	Mail,
	Sparkles,
	Table2,
	Webhook,
} from 'lucide-react'
import type { WorkflowNodeBrand, WorkflowNodeType } from '@/types/workflow'

type BrandConfig = {
	bg: string
	fg: string
	icon: React.ReactNode
	name: string
}

const BRAND_CONFIG: Record<WorkflowNodeBrand, BrandConfig> = {
	webhook: { bg: '#4f5d75', fg: '#ffffff', icon: <Webhook size={16} />, name: 'Webhook' },
	openai: { bg: '#0C1117', fg: '#ffffff', icon: <Sparkles size={16} />, name: 'OpenAI' },
	filter: { bg: '#F2C94C', fg: '#3F2E00', icon: <Filter size={16} />, name: 'Filter' },
	slack: { bg: '#006a4e', fg: '#ffffff', icon: <Hash size={16} />, name: 'Slack' },
	notion: { bg: '#111111', fg: '#ffffff', icon: <FileText size={16} />, name: 'Notion' },
	warning: { bg: '#e2725b', fg: '#ffffff', icon: <AlertTriangle size={16} />, name: 'Email' },
	github: { bg: '#24292F', fg: '#ffffff', icon: <GitBranch size={16} />, name: 'GitHub' },
	google: { bg: '#4285F4', fg: '#ffffff', icon: <Globe2 size={16} />, name: 'Google' },
	gmail: { bg: '#EA4335', fg: '#ffffff', icon: <Mail size={16} />, name: 'Gmail' },
	sheets: { bg: '#0F9D58', fg: '#ffffff', icon: <Table2 size={16} />, name: 'Sheets' },
	jira: { bg: '#0052CC', fg: '#ffffff', icon: <KanbanSquare size={16} />, name: 'Jira' },
	airtable: { bg: '#F2C94C', fg: '#3F2E00', icon: <Blocks size={16} />, name: 'Airtable' },
	discord: { bg: '#5865F2', fg: '#ffffff', icon: <Disc3 size={16} />, name: 'Discord' },
	linear: { bg: '#5E6AD2', fg: '#ffffff', icon: <KanbanSquare size={16} />, name: 'Linear' },
}

const getBrandConfig = (brand: unknown): BrandConfig => {
	if (typeof brand === 'string' && brand in BRAND_CONFIG) {
		return BRAND_CONFIG[brand as WorkflowNodeBrand]
	}

	return BRAND_CONFIG.webhook
}

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeType>) => {
	const brand = getBrandConfig(data.brand)

	return (
		<div
			style={{
				width: 270,
				borderRadius: 14,
				overflow: 'hidden',
				background: '#fff',
				border: selected ? '2px solid #007ba7' : '2px solid transparent',
				boxShadow: selected
					? '0 0 0 4px rgba(0,123,167,.15), 0 12px 24px -8px rgba(16,24,40,.18)'
					: '0 1px 2px rgba(16,24,40,.05), 0 12px 24px -10px rgba(16,24,40,.18)',
			}}
		>
			<Handle
				type='target'
				position={Position.Left}
				style={{
					width: 10,
					height: 10,
					background: '#fff',
					border: `1.5px solid ${brand.bg}`,
					borderRadius: '50%',
					boxShadow: '0 1px 2px rgba(16,24,40,.08)',
				}}
			/>
			<Handle
				type='source'
				position={Position.Right}
				style={{
					width: 10,
					height: 10,
					background: '#fff',
					border: `1.5px solid ${brand.bg}`,
					borderRadius: '50%',
					boxShadow: '0 1px 2px rgba(16,24,40,.08)',
				}}
			/>

			{/* Header */}
			<div
				style={{
					background: brand.bg,
					color: brand.fg,
					padding: '10px 14px',
					display: 'flex',
					alignItems: 'center',
					gap: 10,
				}}
			>
				<span
					style={{
						width: 24,
						height: 24,
						borderRadius: 6,
						background: 'rgba(255,255,255,.18)',
						display: 'grid',
						placeItems: 'center',
						flexShrink: 0,
					}}
				>
					{brand.icon}
				</span>
				<span
					style={{
						flex: 1,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						fontSize: 14,
						fontWeight: 700,
						lineHeight: 1.2,
					}}
				>
					{brand.name}: {data.title}
				</span>
				{data.check && <CheckSquare size={16} />}
				{data.warn && <AlertCircle size={16} />}
			</div>

			{/* Body */}
			<div style={{ padding: '12px 14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6 }}>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						paddingBottom: 6,
						borderBottom: '1px dashed #cccccc',
						fontFamily: 'monospace',
						fontSize: 12,
						lineHeight: 1.4,
					}}
				>
					<span style={{ color: '#959595' }}>Method</span>
					<span style={{ fontWeight: 700, color: '#191919' }}>{data.method}</span>
				</div>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						gap: 8,
						fontFamily: 'monospace',
						fontSize: 12,
						lineHeight: 1.4,
					}}
				>
					<span style={{ color: '#959595', flexShrink: 0 }}>URL</span>
					<span
						style={{
							color: '#191919',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							maxWidth: 180,
						}}
					>
						{data.url}
					</span>
				</div>
			</div>
		</div>
	)
}

export default WorkflowNode
