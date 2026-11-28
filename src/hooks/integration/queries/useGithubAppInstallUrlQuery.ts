import { useQuery } from '@tanstack/react-query'
import { githubAppInstallUrlQueryOptions } from './githubAppInstallUrlQueryOptions'

export const useGithubAppInstallUrlQuery = (enabled: boolean) => useQuery({ ...githubAppInstallUrlQueryOptions(), enabled })
