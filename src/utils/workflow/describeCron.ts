import cronstrue from 'cronstrue'
import 'cronstrue/locales/ko'

/** cron 표현식을 한국어 문장으로 바꾼다. 해석할 수 없으면 원문을 그대로 돌려준다. */
export const describeCron = (expression: string): string => {
	try {
		return cronstrue.toString(expression, { locale: 'ko' })
	} catch {
		return expression
	}
}
