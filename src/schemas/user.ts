import { z } from 'zod'

export const PROFILE_NAME_RULE_MESSAGE = '2~20자로 입력해 주세요.'

export const profileNameSchema = z.string().trim().min(2, PROFILE_NAME_RULE_MESSAGE).max(20, PROFILE_NAME_RULE_MESSAGE)
