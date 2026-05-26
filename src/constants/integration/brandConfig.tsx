import { BookOpen, Code2, FileSpreadsheet, FileText, Globe, Hash, LayoutGrid, Mail, Sparkles, Webhook } from 'lucide-react'
import type { IntegrationBrand, IntegrationBrandConfig } from '../../types/integration'

export const INTEGRATION_BRAND_CONFIG: Record<IntegrationBrand, IntegrationBrandConfig> = {
	slack: { bg: '#006a4e', fg: '#ffffff', tint: '#e8f5f0', icon: <Hash size={18} />, label: 'Slack' },
	notion: { bg: '#111111', fg: '#ffffff', tint: '#f0f0f0', icon: <FileText size={18} />, label: 'Notion' },
	github: { bg: '#24292f', fg: '#ffffff', tint: '#eef0f2', icon: <Code2 size={18} />, label: 'GitHub' },
	openai: { bg: '#0c1117', fg: '#ffffff', tint: '#e8eaed', icon: <Sparkles size={18} />, label: 'OpenAI' },
	gmail: { bg: '#c5221f', fg: '#ffffff', tint: '#fce8e6', icon: <Mail size={18} />, label: 'Gmail' },
	sheets: { bg: '#0f9d58', fg: '#ffffff', tint: '#e6f4ea', icon: <FileSpreadsheet size={18} />, label: 'Sheets' },
	jira: { bg: '#0052cc', fg: '#ffffff', tint: '#e8f0fe', icon: <LayoutGrid size={18} />, label: 'Jira' },
	webhook: { bg: '#4f5d75', fg: '#ffffff', tint: '#eef0f3', icon: <Webhook size={18} />, label: 'Webhook' },
	airtable: { bg: '#fcb400', fg: '#3f2e00', tint: '#fff8e1', icon: <BookOpen size={18} />, label: 'Airtable' },
	discord: { bg: '#5865f2', fg: '#ffffff', tint: '#eef0ff', icon: <Globe size={18} />, label: 'Discord' },
	linear: { bg: '#5e6ad2', fg: '#ffffff', tint: '#eef0ff', icon: <LayoutGrid size={18} />, label: 'Linear' },
	google: { bg: '#4285f4', fg: '#ffffff', tint: '#e8f0fe', icon: <Globe size={18} />, label: 'Google' },
}

export const getBrandConfig = (brand: IntegrationBrand): IntegrationBrandConfig => INTEGRATION_BRAND_CONFIG[brand]
