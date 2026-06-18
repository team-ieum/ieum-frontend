// SSE 프레임 파싱 순수 유틸. 네트워크 사이드이펙트(구독)는 src/api/sse.ts가 담당한다.

/** 하나의 SSE 프레임에서 data: 라인만 모아 합친다 (event:/id: 라인은 무시). */
export const parseDataLines = (frame: string): string | null => {
	const data = frame
		.split('\n')
		.filter(line => line.startsWith('data:'))
		.map(line => line.slice(5).replace(/^ /, ''))
		.join('\n')

	return data.length > 0 ? data : null
}
