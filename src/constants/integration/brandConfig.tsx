import type { IntegrationBrand, IntegrationBrandConfig } from '../../types/integration'

import AirtableIcon from '../../assets/serviceIcon/airtable.png'
import GithubIcon from '../../assets/serviceIcon/github.png'
import GmailIcon from '../../assets/serviceIcon/gmail.png'
import JiraIcon from '../../assets/serviceIcon/jira.png'
import LinearIcon from '../../assets/serviceIcon/linear.png'
import NotionIcon from '../../assets/serviceIcon/notion.png'
import GoogleSheetsIcon from '../../assets/serviceIcon/googlesheets.png'
import SlackIcon from '../../assets/serviceIcon/slack.png'
import WebhookIcon from '../../assets/serviceIcon/webhook.png'
import DiscordIcon from '../../assets/serviceIcon/discord.png'
import GoogleDriveIcon from '../../assets/serviceIcon/googledrive.png'

const brandLogo = (src: string, alt: string) => (
	<img src={src} alt={alt} className='h-[24px] w-[24px] object-contain' loading='lazy' />
)

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

export const getBrandConfig = (brand: IntegrationBrand): IntegrationBrandConfig => INTEGRATION_BRAND_CONFIG[brand]
