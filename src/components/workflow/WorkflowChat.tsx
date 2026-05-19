import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, X } from 'lucide-react'
import { useState } from 'react'
import symbolLogo from '@/assets/symbolNoLine.png'
import { useWorkflowChat } from '@/hooks/workflow/useWorkflowChat'

const TypingIndicator = () => (
	<motion.div
		className='flex gap-2 items-start'
		initial={{ opacity: 0, y: 6 }}
		animate={{ opacity: 1, y: 0 }}
		exit={{ opacity: 0, y: 6 }}
		transition={{ duration: 0.2 }}
	>
		<span className='w-7 h-7 rounded-lg shrink-0 grid place-items-center' style={{ background: '#e0f6ff' }}>
			<img src={symbolLogo} alt='이음' className='w-4 h-4 object-contain' />
		</span>
		<div className='rounded-[0_14px_14px_14px] px-4 py-3.5 flex items-center gap-1.5' style={{ background: '#F0F4FC' }}>
			{[0, 1, 2].map(i => (
				<motion.span
					key={i}
					className='block w-1.5 h-1.5 rounded-full bg-main-blue'
					animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
					transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
				/>
			))}
		</div>
	</motion.div>
)

const WorkflowChat = () => {
	const [isOpen, setIsOpen] = useState(false)
	const { messages, input, setInput, isTyping, handleSend, handleKeyDown, bodyRef } = useWorkflowChat()

	return (
		<>
			{/* 닫힌 상태 — 원형 FAB */}
			<AnimatePresence>
				{!isOpen && (
					<motion.button
						key='fab'
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 300, damping: 22 }}
						onClick={() => setIsOpen(true)}
						className='absolute top-4 right-4 w-12 h-12 rounded-full bg-main-deep-blue grid place-items-center cursor-pointer'
						style={{ zIndex: 10, boxShadow: '0 8px 24px -4px rgba(41,83,124,.45), 0 4px 8px -2px rgba(16,24,40,.1)' }}
					>
						<img src={symbolLogo} alt='이음' className='w-7 h-7 object-contain' />
					</motion.button>
				)}
			</AnimatePresence>

			{/* 열린 상태 — 채팅 패널 */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						key='panel'
						initial={{ x: 16, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: 16, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 280, damping: 26 }}
						className='absolute top-4 right-4 bottom-4 w-[380px] bg-white rounded-2xl border border-neutral-200 flex flex-col overflow-hidden'
						style={{
							zIndex: 10,
							boxShadow: '0 24px 48px -8px rgba(16,24,40,.18), 0 8px 16px -4px rgba(16,24,40,.1)',
						}}
					>
						{/* 헤더 */}
						<div className='flex items-center gap-3 px-4 py-3.5 bg-main-deep-blue text-white shrink-0'>
							<div
								className='w-8 h-8 rounded-[10px] grid place-items-center'
								style={{ background: 'rgba(255,255,255,.12)' }}
							>
								<img src={symbolLogo} alt='이음' className='w-5 h-5 object-contain' />
							</div>
							<div className='flex-1'>
								<div className='text-sm font-semibold'>IEUM Assistant</div>
								<div className='text-xs' style={{ opacity: 0.7 }}>
									워크플로우 최적화 도우미
								</div>
							</div>
							<button
								onClick={() => setIsOpen(false)}
								className='w-7 h-7 rounded-lg grid place-items-center hover:opacity-80 transition-opacity cursor-pointer'
								style={{ background: 'rgba(255,255,255,.12)' }}
							>
								<X size={14} />
							</button>
						</div>

						{/* 채팅 바디 */}
						<div ref={bodyRef} className='flex-1 overflow-y-auto p-4 flex flex-col gap-3'>
							{messages.map((msg, i) =>
								msg.type === 'assistant' ? (
									<div key={i} className='flex gap-2 items-start'>
										<span
											className='w-7 h-7 rounded-lg shrink-0 grid place-items-center'
											style={{ background: '#e0f6ff' }}
										>
											<img src={symbolLogo} alt='이음' className='w-4 h-4 object-contain' />
										</span>
										<div
											className='rounded-[0_14px_14px_14px] px-3.5 py-2.5 text-sm leading-relaxed text-neutral-800 max-w-[280px]'
											style={{ background: '#F0F4FC' }}
										>
											{msg.body}
										</div>
									</div>
								) : (
									<div key={i} className='flex justify-end'>
										<div className='rounded-[14px_14px_4px_14px] px-3.5 py-2.5 text-sm leading-relaxed text-white max-w-[280px] bg-main-blue'>
											{msg.body}
										</div>
									</div>
								)
							)}
							<AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
						</div>

						{/* 입력창 */}
						<div className='p-3 border-t border-neutral-200 bg-neutral-50 shrink-0'>
							<div className='flex items-center gap-2 bg-white border border-neutral-200 rounded-[14px] px-3 py-2'>
								<input
									value={input}
									onChange={e => setInput(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder='메시지를 입력하세요…'
									className='flex-1 text-sm outline-none bg-transparent'
									disabled={isTyping}
								/>
								<button
									type='button'
									onClick={handleSend}
									disabled={isTyping || !input.trim()}
									className='w-7 h-7 rounded-[10px] bg-main-deep-blue grid place-items-center shrink-0 cursor-pointer disabled:opacity-40 transition-opacity'
								>
									<ArrowUp size={14} className='text-white' />
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	)
}

export default WorkflowChat
