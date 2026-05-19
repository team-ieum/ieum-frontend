import { useState } from 'react'
import { useNavigate } from 'react-router'

export const useWorkflowToolbar = (defaultTitle: string) => {
	const navigate = useNavigate()
	const [title, setTitle] = useState(defaultTitle)

	const handleBack = () => navigate(-1)

	return { title, setTitle, handleBack }
}
