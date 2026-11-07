import {FORMATS, BALL_TYPES} from './match-rules.js';
import {stateAt, duration, malformed} from './simulation-engine.js';

// matchFlow(setup, events) -> {score:[a,b], restarts:[{t, kind, team, at}], substitutions:[{t, team, off, on}]}
// Pure and deterministic. Semantics:
// - The ball is sampled from stateAt every STEP seconds over 0..duration (APPROXIMATE: t is the first
//   sample outside the pitch, up to STEP late; a crossing that re-enters within one step is missed).
// - Each inside->outside transition (x or y outside 0..1) is one out-of-play, reported once. Restarts are
//   not simulated (the ball is not put back), so play after a restart is not re-checked.
// - Past a goal line with y inside the goal mouth (rules.goalHalf) = goal for the team that attacks that
//   end (team 0 attacks x=1); restart = kick-off at centre by the conceding team. Bar height (z) ignored.
// - Past a goal line elsewhere: last toucher is the defender -> corner for the attackers (nearer corner);
//   last toucher is the attacker -> goal kick for the defenders (at rules.goalKickX, y .5).
// - Past a touchline: throw-in for the team opposite the last toucher, at the exit point on the line.
// - Last toucher (APPROXIMATE) = actor of the latest ball event started at or before the exit time
//   (initial owner if none).
// - Substitutions are read from events {type:'sub', t, team, off, on}. stateAt ignores them as malformed,
//   so they do not affect positions. Accepted in time order up to rules.maxSubs per team; extras dropped.
// - Offside is not evaluated (rules.offside is false for 7v7).
const STEP = .05;
const EPS = 1e-9;
const outside = b => b.x < 0 || b.x > 1 || b.y < 0 || b.y > 1;
const clamp01 = v => Math.min(1, Math.max(0, v));

export function matchFlow(setup, events) {
  const rules = FORMATS[setup.format];
  const teamOf = id => setup.players.find(p => p.id === id).team;
  const ballEvs = events.filter(e => !malformed(setup, e) && BALL_TYPES.includes(e.type))
    .sort((a, b) => a.t - b.t || a.id - b.id);
  const score = [0, 0];
  const restarts = [];
  let wasOut = outside(stateAt(setup, events, 0).ball);

  for (let t = STEP; t <= duration(events) + EPS; t += STEP) {
    const b = stateAt(setup, events, t).ball;
    const isOut = outside(b);
    if (isOut && !wasOut) {
      const last = ballEvs.filter(e => e.t <= t).pop();
      const toucher = last ? teamOf(last.actor) : (setup.ball.owner != null ? teamOf(setup.ball.owner) : 0);
      const at = {x: clamp01(b.x), y: clamp01(b.y)};
      if (b.x < 0 || b.x > 1) {
        const attacker = b.x > 1 ? 0 : 1;
        if (Math.abs(b.y - .5) <= rules.goalHalf) {
          score[attacker]++;
          restarts.push({t, kind: 'kickoff', team: 1 - attacker, at: {x: .5, y: .5}});
        } else if (toucher !== attacker) {
          restarts.push({t, kind: 'corner', team: attacker, at: {x: at.x, y: b.y < .5 ? 0 : 1}});
        } else {
          const x = b.x > 1 ? 1 - rules.goalKickX : rules.goalKickX;
          restarts.push({t, kind: 'goal-kick', team: 1 - attacker, at: {x, y: .5}});
        }
      } else {
        restarts.push({t, kind: 'throw-in', team: 1 - toucher, at});
      }
    }
    wasOut = isOut;
  }

  const used = [0, 0];
  const substitutions = events.filter(e => e?.type === 'sub' && Number.isFinite(e.t) && (e.team === 0 || e.team === 1))
    .sort((a, b) => a.t - b.t)
    .filter(e => used[e.team] < rules.maxSubs && ++used[e.team])
    .map(({t, team, off, on}) => ({t, team, off, on}));
  return {score, restarts, substitutions};
}
