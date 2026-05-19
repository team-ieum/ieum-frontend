import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { AlertCircle, AlertTriangle, CheckSquare, FileText, Filter, Hash, Sparkles, Webhook } from 'lucide-react'

export type WorkflowNodeData = {
	brand: 'webhook' | 'openai' | 'filter' | 'slack' | 'notion' | 'warning'
	title: string
	method: string
	url: string
	check?: boolean
	warn?: boolean
}

export type WorkflowNodeType = Node<WorkflowNodeData, 'workflowNode'>

type BrandConfig = {
	bg: string
	fg: string
	icon: React.ReactNode
	name: string
}

const BRAND_CONFIG: Record<WorkflowNodeData['brand'], BrandConfig> = {
	webhook: {
		bg: '#4f5d75',
		fg: '#ffffff',
		icon: <Webhook size={16} />,
		name: 'Webhook',
	},
	openai: {
		bg: '#0C1117',
		fg: '#ffffff',
		icon: <Sparkles size={16} />,
		name: 'OpenAI',
	},
	filter: {
		bg: '#F2C94C',
		fg: '#3F2E00',
		icon: <Filter size={16} />,
		name: 'Filter',
	},
	slack: {
		bg: '#006a4e',
		fg: '#ffffff',
		icon: <Hash size={16} />,
		name: 'Slack',
	},
	notion: {
		bg: '#111111',
		fg: '#ffffff',
		icon: <FileText size={16} />,
		name: 'Notion',
	},
	warning: {
		bg: '#e2725b',
		fg: '#ffffff',
		icon: <AlertTriangle size={16} />,
		name: 'Email',
	},
}

const WorkflowNode = ({ data, selected }: NodeProps<WorkflowNodeType>) => {
	const brand = BRAND_CONFIG[data.brand]

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
			<div
				style={{
					padding: '12px 14px',
					background: '#fff',
					display: 'flex',
					flexDirection: 'column',
					gap: 6,
				}}
			>
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
