import { useNavigate } from 'react-router'

export const useWorkflowToolbar = () => {
	const navigate = useNavigate()

	const handleBack = () => navigate(-1)

	return { handleBack }
}
