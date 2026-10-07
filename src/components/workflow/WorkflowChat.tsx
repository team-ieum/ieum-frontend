import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Check, ChevronDown, Sparkles, X } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import symbolLogo from '@/assets/symbolNoLine.png'
import { CHAT_SCROLLBAR_FADE_MS, CHAT_STAGE_FALLBACK_LABEL, CHAT_STAGE_LABEL } from '@/constants/workflow/workflowChat'
import { useWorkflowChatViewModel } from '@/hooks/workflow/useWorkflowChatViewModel'
import { cn } from '@/utils/cn'

const MODEL_MENU_ID = 'workflow-chat-model-menu'

type ModelMenuItemProps = {
	label: string
	isSelected: boolean
	leading: ReactNode
	onSelect: () => void
}

const ModelMenuItem = ({ label, isSelected, leading, onSelect }: ModelMenuItemProps): ReactElement => (
	<button
		type='button'
		role='menuitemradio'
		aria-checked={isSelected}
		onClick={onSelect}
		className={cn(
			'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left typo-body3_regular transition-colors',
			isSelected ? 'bg-main-light-blue text-main-deep-blue' : 'text-neutral-700 hover:bg-neutral-50'
		)}
	>
		<span className='grid h-3 w-3 shrink-0 place-items-center'>{leading}</span>
		<span className='flex-1'>{label}</span>
		{isSelected && <Check size={14} className='shrink-0' />}
	</button>
)

type TypingIndicatorProps = {
	stage?: string | null
}

const TypingIndicator = ({ stage }: TypingIndicatorProps): ReactElement => {
	const stageLabel = stage ? (CHAT_STAGE_LABEL[stage] ?? CHAT_STAGE_FALLBACK_LABEL) : null

	return (
		<motion.div
			className='flex gap-2 items-start'
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 6 }}
			transition={{ duration: 0.2 }}
		>
			<span className='w-7 h-7 rounded-lg shrink-0 grid place-items-center select-none' style={{ background: '#e0f6ff' }}>
				<img src={symbolLogo} alt='이음' draggable={false} className='pointer-events-none w-4 h-4 object-contain' />
			</span>
			<div
				className='rounded-[0_14px_14px_14px] px-4 py-3.5 flex items-center gap-2 max-w-[280px] flex-wrap'
				style={{ background: '#F0F4FC' }}
			>
				<div className='flex items-center gap-1.5'>
					{[0, 1, 2].map(i => (
						<motion.span
							key={i}
							className='block w-1.5 h-1.5 rounded-full bg-main-blue'
							animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
							transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
						/>
					))}
				</div>
				{stageLabel && <span className='typo-caption1_medium text-main-blue leading-none'>{stageLabel}</span>}
			</div>
		</motion.div>
	)
}

type WorkflowChatProps = {
	workflowId: string
	currentNodes: unknown[]
	currentEdges: unknown[]
	onCanvasUpdate?: (nodes: unknown[], edges: unknown[]) => void
}

const WorkflowChat = ({ workflowId, currentNodes, currentEdges, onCanvasUpdate }: WorkflowChatProps) => {
	const {
		isOpen,
		openChat,
		closeChat,
		messages,
		input,
		setInput,
		isTyping,
		handleSend,
		handleKeyDown,
		credentialOptions,
		selectedCredentialOption,
		selectedCredentialId,
		isModelMenuOpen,
		toggleModelMenu,
		selectCredential,
		onModelMenuKeyDown,
		modelMenuRef,
		currentStage,
		scrollbar,
		onChatBodyScroll,
		chatBodyRef,
		messagesEndRef,
		inputRef,
	} = useWorkflowChatViewModel({ workflowId, currentNodes, currentEdges, onCanvasUpdate })

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
						onClick={openChat}
						aria-label='채팅 열기'
						className='absolute top-4 right-4 w-12 h-12 rounded-full bg-main-deep-blue grid place-items-center cursor-pointer'
						style={{ zIndex: 10, boxShadow: '0 8px 24px -4px rgba(41,83,124,.45), 0 4px 8px -2px rgba(16,24,40,.1)' }}
					>
						<img
							src={symbolLogo}
							alt='이음'
							draggable={false}
							className='pointer-events-none w-7 h-7 object-contain'
						/>
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
								className='w-8 h-8 rounded-[10px] grid place-items-center select-none'
								style={{ background: 'rgba(255,255,255,.12)' }}
							>
								<img
									src={symbolLogo}
									alt='이음'
									draggable={false}
									className='pointer-events-none select-none w-5 h-5 object-contain'
								/>
							</div>
							<div className='flex-1'>
								<div className='text-sm font-semibold'>IEUM Assistant</div>
								<div className='text-xs' style={{ opacity: 0.7 }}>
									워크플로우 최적화 도우미
								</div>
							</div>
							<button
								onClick={closeChat}
								aria-label='채팅 닫기'
								className='w-7 h-7 rounded-lg grid place-items-center hover:opacity-80 transition-opacity cursor-pointer'
								style={{ background: 'rgba(255,255,255,.12)' }}
							>
								<X size={14} />
							</button>
						</div>

						{/* 채팅 바디 */}
						<div className='relative min-h-0 flex-1'>
							<div
								ref={chatBodyRef}
								onScroll={onChatBodyScroll}
								className={cn(
									'flex h-full flex-col gap-3 overflow-y-auto p-4',
									'[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
								)}
							>
								{messages.map((msg, i) =>
									msg.type === 'assistant' ? (
										<div key={i} className='flex gap-2 items-start'>
											<span
												className='w-7 h-7 rounded-lg shrink-0 grid place-items-center select-none'
												style={{ background: '#e0f6ff' }}
											>
												<img
													src={symbolLogo}
													alt='이음'
													draggable={false}
													className='pointer-events-none w-4 h-4 object-contain'
												/>
											</span>
											<div className='flex flex-col gap-2 max-w-[280px]'>
												<div
													className='rounded-[0_14px_14px_14px] px-3.5 py-2.5 text-sm leading-relaxed text-neutral-800'
													style={{ background: '#F0F4FC' }}
												>
													{msg.body}
												</div>
												{msg.actions?.map((action, j) => (
													<a
														key={j}
														href={action.oauthUrl}
														target='_blank'
														rel='noreferrer'
														className='inline-flex items-center justify-center gap-1.5 rounded-xl border border-main-blue px-3 py-2 text-xs font-semibold text-main-blue hover:bg-main-blue/5 transition-colors'
													>
														{action.label}
													</a>
												))}
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
								<AnimatePresence>{isTyping && <TypingIndicator stage={currentStage} />}</AnimatePresence>
								<div ref={messagesEndRef} />
							</div>

							{/* 커스텀 스크롤바 — opacity로 페이드 */}
							{scrollbar.heightPercent > 0 && (
								<div className='pointer-events-none absolute inset-y-3 right-1.5 w-1.5' aria-hidden>
									<div
										className={cn(
											'absolute w-full rounded-full bg-main-gray/40',
											scrollbar.isVisible ? 'opacity-100' : 'opacity-0'
										)}
										style={{
											top: `${scrollbar.topPercent}%`,
											height: `${scrollbar.heightPercent}%`,
											transition: `opacity ${CHAT_SCROLLBAR_FADE_MS}ms ease`,
										}}
									/>
								</div>
							)}
						</div>

						{/* 입력창 */}
						<div className='p-3 border-t border-neutral-200 bg-neutral-50 shrink-0 flex flex-col gap-2'>
							{credentialOptions.length > 0 && (
								<div ref={modelMenuRef} className='relative self-start' onKeyDown={onModelMenuKeyDown}>
									<button
										type='button'
										onClick={toggleModelMenu}
										aria-haspopup='menu'
										aria-expanded={isModelMenuOpen}
										aria-controls={MODEL_MENU_ID}
										aria-label='AI 모델 선택'
										className={cn(
											'inline-flex h-7 items-center gap-1.5 rounded-full border bg-white pr-2 pl-2.5 typo-caption1_medium transition-colors',
											isModelMenuOpen
												? 'border-main-blue text-main-deep-blue'
												: 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
										)}
									>
										{selectedCredentialOption ? (
											<span
												className='h-2 w-2 shrink-0 rounded-full'
												style={{ background: selectedCredentialOption.brandColor }}
											/>
										) : (
											<Sparkles size={12} className='shrink-0 text-neutral-400' />
										)}
										<span className={cn(!selectedCredentialOption && 'text-neutral-500')}>
											{selectedCredentialOption?.label ?? 'AI 모델 선택'}
										</span>
										<ChevronDown
											size={14}
											className={cn(
												'text-neutral-400 transition-transform duration-200',
												isModelMenuOpen && 'rotate-180'
											)}
										/>
									</button>

									<AnimatePresence>
										{isModelMenuOpen && (
											<motion.div
												id={MODEL_MENU_ID}
												role='menu'
												initial={{ opacity: 0, y: 4 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: 4 }}
												transition={{ duration: 0.15 }}
												className='absolute bottom-[calc(100%+6px)] left-0 z-20 w-44 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(16,24,40,.22)]'
											>
												<p className='px-2.5 pt-1 pb-1.5 typo-caption1_semibold text-neutral-400'>
													AI 모델
												</p>
												<ModelMenuItem
													label='선택 안 함'
													isSelected={selectedCredentialId === null}
													onSelect={() => selectCredential(null)}
													leading={<Sparkles size={12} className='text-neutral-400' />}
												/>
												{credentialOptions.map(option => (
													<ModelMenuItem
														key={option.id}
														label={option.label}
														isSelected={option.id === selectedCredentialId}
														onSelect={() => selectCredential(option.id)}
														leading={
															<span
																className='h-2 w-2 rounded-full'
																style={{ background: option.brandColor }}
															/>
														}
													/>
												))}
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							)}
							<div className='flex items-end gap-2 bg-white border border-neutral-200 rounded-[14px] px-3 py-2'>
								<textarea
									ref={inputRef}
									value={input}
									onChange={e => setInput(e.target.value)}
									onKeyDown={handleKeyDown}
									aria-label='메시지 입력'
									placeholder='메시지를 입력하세요…'
									rows={1}
									className='flex-1 max-h-28 resize-none overflow-y-auto text-sm leading-5 outline-none bg-transparent py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
								/>
								<button
									type='button'
									onClick={handleSend}
									disabled={isTyping || !input.trim()}
									aria-label='메시지 전송'
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
