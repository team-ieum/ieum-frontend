/** `Z` 또는 `±hh:mm` 오프셋 없이 끝나는 날짜+시각 문자열인지. */
const isOffsetlessDateTime = (value: string) => /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(value)

/**
 * 서버 시각 문자열을 epoch ms로 읽는다. 읽지 못하면 `NaN`이다.
 * 서버는 `…Z`(UTC)를 보내고, 오프셋 없는 옛 형식은 브라우저 시간대가 아니라 한국 시각으로 본다.
 */
export const parseServerDateTime = (value: string) => Date.parse(isOffsetlessDateTime(value) ? `${value}+09:00` : value)
