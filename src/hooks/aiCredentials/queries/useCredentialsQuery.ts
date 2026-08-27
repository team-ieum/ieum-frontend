import { useQuery } from '@tanstack/react-query'
import { credentialsQueryOptions } from '@/hooks/aiCredentials/queries/aiCredentialsQueryOptions'

export const useCredentialsQuery = () => useQuery(credentialsQueryOptions())
