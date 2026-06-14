export type TeamSummary = {
  team_id: string
  name: string
  fifa_code: string
  confederation: string
}

export type MatchLocation = {
  location_id: string
  name: string
  country: string
  timezone: string
}

export type MatchSummary = {
  match_id: string
  kickoff_date: string
  status: string
  neutral: boolean
  home_is_tournament_host: boolean
  away_is_tournament_host: boolean
  competition: {
    competition_id: string
    name: string
    type: string
    organizer_scope: string
    importance_level: number | null
  }
  location: MatchLocation
  home_team: TeamSummary
  away_team: TeamSummary
}

export type MatchListResponse = {
  date: string
  matches: MatchSummary[]
}

export type MatchDetail = MatchSummary & {
  feature_snapshot?: {
    elo: {
      home_pre: number
      away_pre: number
      difference_pre: number
    }
    fifa: {
      home_points_pre: number
      away_points_pre: number
      points_difference_pre: number
      home_rank_pre: number
      away_rank_pre: number
    }
    form: {
      home_points_avg_weighted: number
      away_points_avg_weighted: number
      home_win_rate_weighted: number
      away_win_rate_weighted: number
    }
    attack_defense: {
      home_attack_adjusted_elo_avg_weighted: number
      home_defense_adjusted_elo_avg_weighted: number
      away_attack_adjusted_elo_avg_weighted: number
      away_defense_adjusted_elo_avg_weighted: number
    }
  }
}

export type MatchDetailResponse = {
  match: MatchDetail
}

export type MatchPrediction = {
  match_id: string
  model_version: string
  lambdas: {
    home: number
    away: number
    total: number
  }
  outcome_probabilities: {
    home_win: number
    draw: number
    away_win: number
  }
  top_scoreline: {
    score: string
    probability: number
  }
  top_scorelines: Array<{
    score: string
    probability: number
  }>
  score_matrix: {
    labels: string[]
    matrix: number[][]
  }
}

export type MatchPredictionResponse = {
  prediction: MatchPrediction
}

export type GroupFixturePrediction = {
  model_version: string
  home_win_probability: number
  draw_probability: number
  away_win_probability: number
  top_scoreline: string
  top_scoreline_probability: number
}

export type GroupFixture = {
  match_id: string
  matchday: number
  kickoff_date: string
  status: string
  location: MatchLocation
  home_team: TeamSummary
  away_team: TeamSummary
  prediction: GroupFixturePrediction | null
}

export type GroupStandingSeed = {
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

export type GroupTeam = {
  position_seed: number
  team: TeamSummary
  table: GroupStandingSeed
}

export type WorldCupGroup = {
  group_code: string
  teams: GroupTeam[]
  fixtures: GroupFixture[]
}

export type GroupsResponse = {
  competition_id: string
  groups: WorldCupGroup[]
}
