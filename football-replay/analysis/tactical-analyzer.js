// Combines exact and approximate metrics into one plain-JSON object.
import * as sp from './spatial-analysis.js';
import {passEvents, passMatrix, passSequence, laneRisk, possessionShare} from './passing-analysis.js';

const NOTE = 'Approximate: lane risk uses straight-line distance of opponents to the pass segment and ignores ball speed and movement; possession is sampled over time, so short possessions can be missed.';

const teamMetrics = (state, team, aspect) => ({
  centroid: sp.teamCentroid(state, team),
  width: sp.teamWidth(state, team, aspect),
  depth: sp.teamDepth(state, team),
  lineHeights: sp.lineHeights(state, team),
  compactness: sp.compactness(state, team, aspect),
  spaceBetweenLines: sp.spaceBetweenLines(state, team),
});

export function analyze({state, events = [], aspect, t = 0, stateAt, duration = 0}) {
  const passes = passEvents(events);
  const last = passes.filter(e => e.t <= t).sort((a, b) => a.t - b.t).pop();
  return {
    exact: {
      team0: teamMetrics(state, 0, aspect),
      team1: teamMetrics(state, 1, aspect),
      ball: {owner: state.ball.owner ?? null, status: state.ball.status ?? null},
    },
    approximate: {
      possession: stateAt && duration > 0 ? possessionShare(stateAt, duration) : null,
      laneRisks: last ? [{eventId: last.id, from: last.actor, to: last.target, ...laneRisk(state, last.actor, last.target, aspect)}] : [],
      note: NOTE,
    },
    passes: {
      counts: {team0: passMatrix(events, 0, state.players), team1: passMatrix(events, 1, state.players)},
      sequences: passSequence(events).map(s => s.map(e => e.id)),
    },
  };
}
