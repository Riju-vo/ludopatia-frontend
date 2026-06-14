import { useDeferredValue, useEffect, useState } from 'react'
import './App.css'
import {
  fetchHomePayload,
  fetchMatchPredictionPayload,
} from './lib/api'
import type {
  GroupFixture,
  MatchDetail,
  MatchPrediction,
  MatchSummary,
  WorldCupGroup,
} from './types'

type HomeState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      todayDate: string
      matches: MatchSummary[]
      groups: WorldCupGroup[]
    }

type DisplayStanding = {
  team_id: string
  name: string
  fifa_code: string
  confederation: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

type MatchPageState =
  | { status: 'idle' }
  | { status: 'loading'; matchId: string }
  | { status: 'error'; matchId: string; message: string }
  | {
      status: 'ready'
      matchId: string
      detail: MatchDetail
      prediction: MatchPrediction
    }

type RouteState =
  | { view: 'home' }
  | { view: 'match'; matchId: string }

function App() {
  const [state, setState] = useState<HomeState>({ status: 'loading' })
  const [activeGroupCode, setActiveGroupCode] = useState('A')
  const [route, setRoute] = useState<RouteState>(() => readRoute())
  const [matchPage, setMatchPage] = useState<MatchPageState>({ status: 'idle' })
  const deferredActiveGroupCode = useDeferredValue(activeGroupCode)

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        const payload = await fetchHomePayload(controller.signal)
        setState({
          status: 'ready',
          todayDate: payload.today.date,
          matches: payload.today.matches,
          groups: payload.groups.groups,
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la informacion inicial.'
        setState({ status: 'error', message })
      }
    })()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const onPopState = () => setRoute(readRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (route.view !== 'match') {
      setMatchPage({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setMatchPage({ status: 'loading', matchId: route.matchId })

    void (async () => {
      try {
        const payload = await fetchMatchPredictionPayload(route.matchId, controller.signal)
        setMatchPage({
          status: 'ready',
          matchId: route.matchId,
          detail: payload.detail.match,
          prediction: payload.prediction.prediction,
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el detalle del partido.'
        setMatchPage({ status: 'error', matchId: route.matchId, message })
      }
    })()

    return () => controller.abort()
  }, [route])

  const activeGroup =
    state.status === 'ready'
      ? (state.groups.find((group) => group.group_code === deferredActiveGroupCode) ??
        state.groups[0] ??
        null)
      : null

  const standings = activeGroup ? buildGroupStandings(activeGroup) : []

  function navigateToMatch(matchId: string) {
    const nextPath = `/match/${matchId}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
    setRoute({ view: 'match', matchId })
  }

  function navigateHome() {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/')
    }
    setRoute({ view: 'home' })
  }

  if (route.view === 'match') {
    return <MatchPage matchPage={matchPage} onBack={navigateHome} />
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Ludopatia</p>
          <h1>Predicciones del Mundial con una lectura probabilística clara.</h1>
          <p className="hero-text">
            Modelo base Poisson reforzado con ranking FIFA, Elo, forma reciente
            y señales de ataque y defensa para proyectar resultados y marcadores.
          </p>
          <p className="hero-joke">Si la prediccion falla es culpa de Joel.</p>
        </div>
      </section>

      {state.status === 'loading' ? <LoadingView /> : null}

      {state.status === 'error' ? <ErrorView message={state.message} /> : null}

      {state.status === 'ready' ? (
        <>
          <section className="section-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Partidos del dia</p>
                <h2>{formatReadableDate(state.todayDate)}</h2>
              </div>
            </div>

            <div className="matches-grid">
              {state.matches.map((match) => (
                <button
                  className="match-card match-card--button"
                  key={match.match_id}
                  type="button"
                  onClick={() => navigateToMatch(match.match_id)}
                >
                  <div className="match-card__header">
                    <span className="pill">{match.competition.name}</span>
                    <span className="match-location">
                      {match.location.name}, {match.location.country}
                    </span>
                  </div>

                  <div className="match-card__teams">
                    <TeamLine team={match.home_team} side="home" />
                    <div className="match-vs">vs</div>
                    <TeamLine team={match.away_team} side="away" />
                  </div>

                  <div className="match-card__footer">
                    <span>{humanizeStatus(match.status)}</span>
                    <span>{match.location.timezone}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="section-block groups-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Fase de grupos</p>
                <h2>Explorador de grupos</h2>
              </div>
            </div>

            <div className="group-tabs" role="tablist" aria-label="Grupos del Mundial">
              {state.groups.map((group) => (
                <button
                  key={group.group_code}
                  type="button"
                  className={
                    group.group_code === deferredActiveGroupCode
                      ? 'group-tab group-tab--active'
                      : 'group-tab'
                  }
                  onClick={() => setActiveGroupCode(group.group_code)}
                >
                  Grupo {group.group_code}
                </button>
              ))}
            </div>

            {activeGroup ? (
              <div className="group-panel">
                <div className="group-overview">
                  <article className="card">
                    <div className="card-header">
                      <h3>Tabla del grupo {activeGroup.group_code}</h3>
                    </div>

                    <div className="standings-table">
                      <div className="standings-head">
                        <span>#</span>
                        <span>Equipo</span>
                        <span>PJ</span>
                        <span>DG</span>
                        <span>PTS</span>
                      </div>

                      {standings.map((team, index) => (
                        <div className="standings-row" key={team.team_id}>
                          <span>{index + 1}</span>
                          <div className="standings-team">
                            <strong>{team.name}</strong>
                            <p>
                              {team.fifa_code} · {team.confederation}
                            </p>
                          </div>
                          <span>{team.played}</span>
                          <span>{team.goal_difference}</span>
                          <span>{team.points}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="card">
                    <div className="card-header">
                      <h3>Lectura rapida</h3>
                    </div>

                    <ul className="insight-list">
                      <li>
                        {countPredictedFixtures(activeGroup.fixtures)} partidos con
                        prediccion precalculada.
                      </li>
                      <li>
                        {countFinishedFixtures(activeGroup.fixtures)} partidos ya
                        cargados como finalizados.
                      </li>
                      <li>
                        Proximo cruce: {describeNextFixture(activeGroup.fixtures)}
                      </li>
                      <li>
                        Favorito del siguiente partido:{' '}
                        {describeNextFavorite(activeGroup.fixtures)}
                      </li>
                    </ul>
                  </article>
                </div>

                <article className="card fixtures-card">
                  <div className="fixtures-card__heading">
                    <h3>Calendario del grupo {activeGroup.group_code}</h3>
                    <p>Con resumen probabilistico cuando existe prediccion.</p>
                  </div>

                  <div className="fixture-list">
                    {activeGroup.fixtures.map((fixture) => (
                      <GroupFixtureCard
                        fixture={fixture}
                        key={fixture.match_id}
                        onOpen={() => navigateToMatch(fixture.match_id)}
                      />
                    ))}
                  </div>
                </article>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  )
}

function MatchPage({
  matchPage,
  onBack,
}: {
  matchPage: MatchPageState
  onBack: () => void
}) {
  return (
    <main className="app-shell app-shell--detail">
      <section className="detail-hero">
        <button className="back-button" type="button" onClick={onBack}>
          Volver a la home
        </button>
        <div className="hero-panel hero-panel--detail">
          <p className="panel-label">Ludopatia</p>
          <h2 className="detail-title">Detalle probabilístico del partido</h2>
          <p className="detail-subtitle">
            Probabilidades 1X2, matriz de marcador y señales previas del modelo.
          </p>
        </div>
      </section>

      {matchPage.status === 'loading' ? (
        <section className="section-block state-card">
          <p className="eyebrow">Cargando</p>
          <h2>Recuperando detalle del partido</h2>
          <p>Estamos trayendo la matriz de probabilidad y el snapshot previo.</p>
        </section>
      ) : null}

      {matchPage.status === 'error' ? (
        <section className="section-block state-card state-card--error">
          <p className="eyebrow">Error</p>
          <h2>No se pudo cargar el partido</h2>
          <p>{matchPage.message}</p>
        </section>
      ) : null}

      {matchPage.status === 'ready' ? (
        <div className="detail-layout">
          <section className="modal-card modal-card--hero">
            <div className="modal-matchline">
              <div>
                <strong>{matchPage.detail.home_team.name}</strong>
                <p>{matchPage.detail.home_team.fifa_code}</p>
              </div>
              <span>vs</span>
              <div>
                <strong>{matchPage.detail.away_team.name}</strong>
                <p>{matchPage.detail.away_team.fifa_code}</p>
              </div>
            </div>
            <div className="modal-meta">
              <span>{matchPage.detail.location.name}</span>
              <span>{formatReadableDate(matchPage.detail.kickoff_date)}</span>
              <span>{humanizeStatus(matchPage.detail.status)}</span>
            </div>
          </section>

          <div className="modal-grid">
            <section className="modal-card">
              <h3>Probabilidades 1X2</h3>
              <div className="odds-grid">
                <ProbabilityTile
                  label="1"
                  team={matchPage.detail.home_team.name}
                  value={matchPage.prediction.outcome_probabilities.home_win}
                />
                <ProbabilityTile
                  label="X"
                  team="Empate"
                  value={matchPage.prediction.outcome_probabilities.draw}
                />
                <ProbabilityTile
                  label="2"
                  team={matchPage.detail.away_team.name}
                  value={matchPage.prediction.outcome_probabilities.away_win}
                />
              </div>
            </section>

            <section className="modal-card">
              <h3>Indicadores del modelo</h3>
              <div className="metrics-grid">
                <MetricRow
                  label="Lambda local"
                  value={matchPage.prediction.lambdas.home.toFixed(2)}
                />
                <MetricRow
                  label="Lambda visitante"
                  value={matchPage.prediction.lambdas.away.toFixed(2)}
                />
                <MetricRow
                  label="Goles esperados"
                  value={matchPage.prediction.lambdas.total.toFixed(2)}
                />
                <MetricRow
                  label="Marcador top"
                  value={`${matchPage.prediction.top_scoreline.score} (${toPercent(
                    matchPage.prediction.top_scoreline.probability
                  )})`}
                />
              </div>
            </section>
          </div>

          <div className="modal-grid">
            <section className="modal-card">
              <h3>Top 5 marcadores</h3>
              <div className="top-scorelines">
                {matchPage.prediction.top_scorelines.map((item) => (
                  <div className="top-scoreline-row" key={item.score}>
                    <strong>{item.score}</strong>
                    <span>{toPercent(item.probability)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="modal-card">
              <h3>Snapshot prepartido</h3>
              {matchPage.detail.feature_snapshot ? (
                <div className="feature-sections">
                  <FeatureBlock
                    title="Elo"
                    rows={[
                      ['Local', matchPage.detail.feature_snapshot.elo.home_pre.toFixed(1)],
                      ['Visitante', matchPage.detail.feature_snapshot.elo.away_pre.toFixed(1)],
                      [
                        'Diferencia',
                        matchPage.detail.feature_snapshot.elo.difference_pre.toFixed(1),
                      ],
                    ]}
                  />
                  <FeatureBlock
                    title="FIFA"
                    rows={[
                      ['Rank local', String(matchPage.detail.feature_snapshot.fifa.home_rank_pre)],
                      [
                        'Rank visitante',
                        String(matchPage.detail.feature_snapshot.fifa.away_rank_pre),
                      ],
                      [
                        'Dif. puntos',
                        matchPage.detail.feature_snapshot.fifa.points_difference_pre.toFixed(1),
                      ],
                    ]}
                  />
                  <FeatureBlock
                    title="Forma"
                    rows={[
                      [
                        'Pts local',
                        matchPage.detail.feature_snapshot.form.home_points_avg_weighted.toFixed(2),
                      ],
                      [
                        'Pts visitante',
                        matchPage.detail.feature_snapshot.form.away_points_avg_weighted.toFixed(2),
                      ],
                      [
                        'Win rate local',
                        toPercent(matchPage.detail.feature_snapshot.form.home_win_rate_weighted),
                      ],
                    ]}
                  />
                </div>
              ) : (
                <p>Este partido no trae snapshot de features.</p>
              )}
            </section>
          </div>

          <section className="modal-card">
            <h3>Matriz de probabilidad de marcador</h3>
            <ScoreMatrix prediction={matchPage.prediction} />
          </section>
        </div>
      ) : null}
    </main>
  )
}

function TeamLine({
  team,
  side,
}: {
  team: MatchSummary['home_team']
  side: 'home' | 'away'
}) {
  return (
    <div className="team-line">
      <span className={`team-badge team-badge--${side}`}>{team.fifa_code}</span>
      <div>
        <strong>{team.name}</strong>
        <p>{team.confederation}</p>
      </div>
    </div>
  )
}

function GroupFixtureCard({
  fixture,
  onOpen,
}: {
  fixture: GroupFixture
  onOpen: () => void
}) {
  return (
    <button className="fixture-card fixture-card--button" type="button" onClick={onOpen}>
      <div className="fixture-card__meta">
        <span className="pill">Fecha {fixture.matchday}</span>
        <span>
          {formatReadableDate(fixture.kickoff_date)} · {fixture.location.name}
        </span>
      </div>

      <div className="fixture-card__body">
        <div className="fixture-team">
          <strong>{fixture.home_team.name}</strong>
          <span>{fixture.home_team.fifa_code}</span>
        </div>
        <span className="fixture-separator">vs</span>
        <div className="fixture-team fixture-team--away">
          <strong>{fixture.away_team.name}</strong>
          <span>{fixture.away_team.fifa_code}</span>
        </div>
      </div>

      <div className="fixture-card__footer">
        <span>{humanizeStatus(fixture.status)}</span>
        {fixture.prediction ? (
          <div className="probability-strip">
            <span>1 {toPercent(fixture.prediction.home_win_probability)}</span>
            <span>X {toPercent(fixture.prediction.draw_probability)}</span>
            <span>2 {toPercent(fixture.prediction.away_win_probability)}</span>
            <span>Top {fixture.prediction.top_scoreline}</span>
          </div>
        ) : (
          <span>Sin prediccion almacenada</span>
        )}
      </div>
    </button>
  )
}

function ProbabilityTile({
  label,
  team,
  value,
}: {
  label: string
  team: string
  value: number
}) {
  return (
    <div className="probability-tile">
      <span>{label}</span>
      <strong>{toPercent(value)}</strong>
      <p>{team}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function FeatureBlock({
  title,
  rows,
}: {
  title: string
  rows: Array<[string, string]>
}) {
  return (
    <div className="feature-block">
      <h4>{title}</h4>
      {rows.map(([label, value]) => (
        <div className="metric-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function ScoreMatrix({ prediction }: { prediction: MatchPrediction }) {
  const labels = prediction.score_matrix.labels
  const rows = prediction.score_matrix.matrix.slice(0, 6)
  const cols = labels.slice(0, 6)

  return (
    <div className="matrix-wrapper">
      <div className="matrix-grid matrix-grid--header">
        <span className="matrix-corner">L\V</span>
        {cols.map((label) => (
          <span className="matrix-head" key={label}>
            {label}
          </span>
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div className="matrix-grid" key={labels[rowIndex]}>
          <span className="matrix-head">{labels[rowIndex]}</span>
          {row.slice(0, 6).map((cell, colIndex) => (
            <span
              className="matrix-cell"
              key={`${labels[rowIndex]}-${cols[colIndex]}`}
              style={{
                backgroundColor:
                  cell > 0.1
                    ? 'rgba(15, 106, 92, 0.32)'
                    : `rgba(15, 106, 92, ${0.08 + cell * 2})`,
              }}
            >
              {toPercent(cell)}
            </span>
          ))}
        </div>
      ))}
      <p className="matrix-note">
        Vista compacta 0-5. La API entrega matriz completa hasta 10+ goles.
      </p>
    </div>
  )
}

function LoadingView() {
  return (
    <section className="section-block state-card">
      <p className="eyebrow">Cargando</p>
      <h2>Recuperando partidos y grupos desde la API</h2>
      <p>En cuanto responda el backend, la home mostrara los datos reales.</p>
    </section>
  )
}

function ErrorView({ message }: { message: string }) {
  return (
    <section className="section-block state-card state-card--error">
      <p className="eyebrow">Error</p>
      <h2>No se pudo construir la home</h2>
      <p>{message}</p>
    </section>
  )
}

function formatReadableDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parsed)
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function humanizeStatus(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Programado'
    case 'finished':
      return 'Finalizado'
    default:
      return status
  }
}

function countPredictedFixtures(fixtures: GroupFixture[]): number {
  return fixtures.filter((fixture) => fixture.prediction !== null).length
}

function countFinishedFixtures(fixtures: GroupFixture[]): number {
  return fixtures.filter((fixture) => fixture.status === 'finished').length
}

function describeNextFixture(fixtures: GroupFixture[]): string {
  const next = fixtures.find((fixture) => fixture.status !== 'finished')
  if (!next) {
    return 'grupo completado'
  }
  return `${next.home_team.name} vs ${next.away_team.name}`
}

function describeNextFavorite(fixtures: GroupFixture[]): string {
  const next = fixtures.find(
    (fixture) => fixture.status !== 'finished' && fixture.prediction !== null
  )
  if (!next?.prediction) {
    return 'sin datos'
  }

  const { home_win_probability, away_win_probability } = next.prediction
  return home_win_probability >= away_win_probability
    ? `${next.home_team.name} (${toPercent(home_win_probability)})`
    : `${next.away_team.name} (${toPercent(away_win_probability)})`
}

function buildGroupStandings(group: WorldCupGroup): DisplayStanding[] {
  return group.teams
    .map((entry) => ({
      team_id: entry.team.team_id,
      name: entry.team.name,
      fifa_code: entry.team.fifa_code,
      confederation: entry.team.confederation,
      played: entry.table.played,
      wins: entry.table.wins,
      draws: entry.table.draws,
      losses: entry.table.losses,
      goals_for: entry.table.goals_for,
      goals_against: entry.table.goals_against,
      goal_difference: entry.table.goal_difference,
      points: entry.table.points,
    }))
    .sort((left, right) => {
      return (
        right.points - left.points ||
        right.goal_difference - left.goal_difference ||
        right.goals_for - left.goals_for ||
        left.name.localeCompare(right.name)
      )
    })
}

function readRoute(): RouteState {
  const prefix = '/match/'
  const pathname = window.location.pathname
  if (pathname.startsWith(prefix)) {
    const matchId = pathname.slice(prefix.length).trim()
    if (matchId) {
      return { view: 'match', matchId }
    }
  }
  return { view: 'home' }
}

export default App
