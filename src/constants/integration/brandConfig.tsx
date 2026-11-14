import type { ReactNode } from 'react'
import type { IntegrationBrand, IntegrationBrandConfig } from '@/types/integration'

import AirtableIcon from '@/assets/serviceIcon/airtable.png'
import GithubIcon from '@/assets/serviceIcon/github.png'
import GmailIcon from '@/assets/serviceIcon/gmail.png'
import JiraIcon from '@/assets/serviceIcon/jira.png'
import LinearIcon from '@/assets/serviceIcon/linear.png'
import NotionIcon from '@/assets/serviceIcon/notion.png'
import GoogleSheetsIcon from '@/assets/serviceIcon/googlesheets.png'
import SlackIcon from '@/assets/serviceIcon/slack.png'
import WebhookIcon from '@/assets/serviceIcon/webhook.png'
import DiscordIcon from '@/assets/serviceIcon/discord.png'
import GoogleDriveIcon from '@/assets/serviceIcon/googledrive.png'
import GoogleCalendarIcon from '@/assets/serviceIcon/googlecalendar.png'
import GoogleFormsIcon from '@/assets/serviceIcon/googleforms.png'

const brandLogo = (src: string, alt: string) => <img src={src} alt={alt} className='h-6 w-6 object-contain' loading='lazy' />

export const INTEGRATION_BRAND_CONFIG: Record<IntegrationBrand, IntegrationBrandConfig> = {
	slack: { tint: '#e8f5f0', icon: brandLogo(SlackIcon, 'Slack 로고'), label: 'Slack' },
	notion: { tint: '#f0f0f0', icon: brandLogo(NotionIcon, 'Notion 로고'), label: 'Notion' },
	github: { tint: '#eef0f2', icon: brandLogo(GithubIcon, 'GitHub 로고'), label: 'GitHub' },
	gmail: { tint: '#fce8e6', icon: brandLogo(GmailIcon, 'Gmail 로고'), label: 'Gmail' },
	sheets: { tint: '#e6f4ea', icon: brandLogo(GoogleSheetsIcon, 'Google Sheets 로고'), label: 'Sheets' },
	jira: { tint: '#e8f0fe', icon: brandLogo(JiraIcon, 'Jira 로고'), label: 'Jira' },
	webhook: { tint: '#eef0f3', icon: brandLogo(WebhookIcon, 'Webhook 로고'), label: 'Webhook' },
	airtable: { tint: '#fff8e1', icon: brandLogo(AirtableIcon, 'Airtable 로고'), label: 'Airtable' },
	discord: { tint: '#eef0ff', icon: brandLogo(DiscordIcon, 'Discord 로고'), label: 'Discord' },
	linear: { tint: '#eef0ff', icon: brandLogo(LinearIcon, 'Linear 로고'), label: 'Linear' },
	google: { tint: '#e8f0fe', icon: brandLogo(GoogleDriveIcon, 'Google Drive 로고'), label: 'Google' },
}

// 서버 카탈로그는 Google Calendar·Drive·Forms를 모두 brand `google`로 보내므로, 카탈로그 `app` 키로 로고를 나눈다.
// 여기 없는 앱(google_drive 포함)은 brand 로고를 쓴다.
const APP_ICONS: Record<string, ReactNode> = {
	google_calendar: brandLogo(GoogleCalendarIcon, 'Google Calendar 로고'),
	google_forms: brandLogo(GoogleFormsIcon, 'Google Forms 로고'),
}

export const getBrandConfig = (brand: IntegrationBrand): IntegrationBrandConfig => INTEGRATION_BRAND_CONFIG[brand]

/** 노드·팔레트에 보여 줄 앱 로고를 고른다. `app`은 노드 카탈로그의 `app` 키이고, 앱별 로고가 없으면 brand 로고를 돌려준다. */
export const getAppIcon = (brand: IntegrationBrand, app?: string): ReactNode =>
	app && Object.hasOwn(APP_ICONS, app) ? APP_ICONS[app] : INTEGRATION_BRAND_CONFIG[brand].icon

export const isIntegrationBrand = (value: unknown): value is IntegrationBrand =>
	typeof value === 'string' && Object.hasOwn(INTEGRATION_BRAND_CONFIG, value)
