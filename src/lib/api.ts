import type {
  GroupsResponse,
  MatchDetailResponse,
  MatchListResponse,
  MatchPredictionResponse,
} from '../types'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.toString() ?? 'http://127.0.0.1:8000'

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal })

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${path}`)
  }

  return (await response.json()) as T
}

export async function fetchHomePayload(signal?: AbortSignal): Promise<{
  today: MatchListResponse
  groups: GroupsResponse
}> {
  const [today, groups] = await Promise.all([
    requestJson<MatchListResponse>('/matches/today', signal),
    requestJson<GroupsResponse>('/groups', signal),
  ])

  return { today, groups }
}

export async function fetchMatchPredictionPayload(
  matchId: string,
  signal?: AbortSignal
): Promise<{
  detail: MatchDetailResponse
  prediction: MatchPredictionResponse
}> {
  const [detail, prediction] = await Promise.all([
    requestJson<MatchDetailResponse>(`/matches/${matchId}`, signal),
    requestJson<MatchPredictionResponse>(`/matches/${matchId}/prediction`, signal),
  ])

  return { detail, prediction }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL
}
