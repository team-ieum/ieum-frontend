import type { IntegrationBrand } from '@/types/integration'
import type { IntegrationServiceType } from '@/types/integrationWorkflows'

const BRAND_TO_SERVICE_TYPE: Partial<Record<IntegrationBrand, IntegrationServiceType>> = {
	slack: 'SLACK',
	discord: 'DISCORD',
	google: 'GOOGLE',
	gmail: 'GOOGLE',
	sheets: 'GOOGLE',
	github: 'GITHUB',
	notion: 'NOTION',
}

export const getIntegrationServiceType = (brand: IntegrationBrand): IntegrationServiceType | null =>
	BRAND_TO_SERVICE_TYPE[brand] ?? null
