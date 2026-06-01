import LandingCta from '@/components/landing/LandingCta'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingFooter from '@/components/landing/LandingFooter'
import LandingHero from '@/components/landing/LandingHero'
import LandingIntegrations from '@/components/landing/LandingIntegrations'
import LandingNav from '@/components/landing/LandingNav'

const LandingPage = () => (
	<div className='min-h-screen bg-neutral-white'>
		<LandingNav />
		<main>
			<LandingHero />
			<LandingFeatures />
			<LandingIntegrations />
			<LandingCta />
		</main>
		<LandingFooter />
	</div>
)

export default LandingPage
