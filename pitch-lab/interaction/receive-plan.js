import {resolveBall, stateAt, metres, RECEIVE_REACH} from '../core/simulation-engine.js';
import {DUR} from './click-tool.js';

const RUN_SPEED = 6; // m/s

// Events for "player takes the loose ball at t": a run to the ball first when the player is out of reach.
export function planReceive(setup, events, actor, t) {
  const {ball} = resolveBall(setup, events, t);
  if (ball.status !== 'loose') return {error: 'The ball is not loose at this time. Go to when it lands, then click the receiver.'};
  const me = stateAt(setup, events, t).players.find(p => p.id === actor);
  const d = metres(setup, me, ball);
  if (d <= RECEIVE_REACH) return {events: [{type: 'receive', actor, t, dur: DUR.receive}]};
  const run = d / RUN_SPEED;
  return {events: [{type: 'move', actor, to: {x: ball.x, y: ball.y}, t, dur: run}, {type: 'receive', actor, t: t + run, dur: DUR.receive}]};
}
