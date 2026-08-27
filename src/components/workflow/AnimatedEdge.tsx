import { EdgeToolbar, getBezierPath, type EdgeProps, useReactFlow } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { WORKFLOW_EDGE_ACTIVE_COLOR, WORKFLOW_EDGE_COLOR } from '@/constants/workflow/workflowEdge'

// 엣지가 그려지는(draw-in) 애니메이션. pathLength 0→1로 stroke를 점진적으로 채운다.
// data.flowing=true면 실행 중 데이터 흐름을 나타내는 대시 흐름을 위에 덧그린다.
const AnimatedEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	markerEnd,
	style,
	data,
	selected,
}: EdgeProps) => {
	const { deleteElements } = useReactFlow()
	const [edgePath, toolbarX, toolbarY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	})

	const flowing = Boolean(data?.flowing)

	return (
		<>
			<motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
				<motion.path
					id={id}
					d={edgePath}
					fill='none'
					className='react-flow__edge-path'
					style={{ stroke: WORKFLOW_EDGE_COLOR, ...style, strokeWidth: selected ? 2.5 : 1.5 }}
					markerEnd={markerEnd}
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ duration: 0.6, ease: 'easeInOut' }}
				/>
				{flowing && (
					<motion.path
						d={edgePath}
						fill='none'
						style={{
							stroke: WORKFLOW_EDGE_ACTIVE_COLOR,
							strokeWidth: 2.5,
							strokeDasharray: '6 8',
							strokeLinecap: 'round',
						}}
						initial={{ strokeDashoffset: 28 }}
						animate={{ strokeDashoffset: 0 }}
						transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
					/>
				)}
			</motion.g>
			<EdgeToolbar edgeId={id} x={toolbarX} y={toolbarY} isVisible={selected}>
				<button
					type='button'
					aria-label='연결 삭제'
					onClick={() => void deleteElements({ edges: [{ id }] })}
					className='nodrag nopan grid size-9 cursor-pointer place-items-center rounded-full border border-red-200 bg-white text-red-500 shadow-md transition-colors hover:bg-red-50'
				>
					<Trash2 size={16} aria-hidden='true' />
				</button>
			</EdgeToolbar>
		</>
	)
}

export default AnimatedEdge
