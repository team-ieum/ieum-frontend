import { getBezierPath, type EdgeProps } from '@xyflow/react'
import { motion } from 'framer-motion'

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
}: EdgeProps) => {
	const [edgePath] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	})

	const flowing = Boolean(data?.flowing)

	return (
		<motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
			<motion.path
				id={id}
				d={edgePath}
				fill='none'
				className='react-flow__edge-path'
				style={{ stroke: '#007ba7', strokeWidth: 1.5, ...style }}
				markerEnd={markerEnd}
				initial={{ pathLength: 0 }}
				animate={{ pathLength: 1 }}
				transition={{ duration: 0.6, ease: 'easeInOut' }}
			/>
			{flowing && (
				<motion.path
					d={edgePath}
					fill='none'
					style={{ stroke: '#007ba7', strokeWidth: 2.5, strokeDasharray: '6 8', strokeLinecap: 'round' }}
					initial={{ strokeDashoffset: 28 }}
					animate={{ strokeDashoffset: 0 }}
					transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
				/>
			)}
		</motion.g>
	)
}

export default AnimatedEdge
