import { useQuery } from '@tanstack/react-query'
import { providersQueryOptions } from '@/hooks/aiCredentials/queries/aiCredentialsQueryOptions'

export const useProvidersQuery = () => useQuery(providersQueryOptions())
