// Two-click tools (pass/cross/shot/dribble/move/tackle): given the pending actor id (or null),
// the player under the cursor (or undefined) and the clicked spot, return the next pending id,
// a status message, and the event to add (without t).
export const DUR = {pass: .8, cross: 1.2, shot: .7, dribble: 1, move: 1, save: .4, tackle: .5, receive: .5};

export function nextClick(tool, pending, p, spot) {
  if (pending === null) {
    if (!p) return {pending, msg: 'Click the player who performs the action.'};
    return {pending: p.id, msg: tool === 'move' || tool === 'dribble' ? 'Click the destination.'
      : tool === 'tackle' ? 'Click the player being tackled.'
      : tool === 'shot' ? 'Click a spot, or the shooter again to shoot at goal.' : 'Click a player or an empty spot.'};
  }
  if (tool === 'tackle' && !p) return {pending, msg: 'Click the player being tackled.'};
  const actor = pending, dur = DUR[tool];
  if (tool === 'move' || tool === 'dribble') return {pending: null, ev: {type: tool, actor, to: spot, dur}};
  if (tool === 'shot') return {pending: null, ev: {type: 'shot', actor, target: p ? (p.id === actor ? 'goal' : p.id) : spot, dur}};
  if (p && p.id === actor) return {pending: null, msg: 'Cancelled.'};
  if (tool === 'tackle') return {pending: null, ev: {type: 'tackle', actor, target: p.id, won: true, dur}};
  return {pending: null, ev: {type: tool, actor, target: p ? p.id : spot, dur}};
}

// Status line after an event is added; num maps a player id to its shirt number.
export function addedMessage(ev, num, warn) {
  const tgt = ev.target === undefined ? '' : ` -> ${typeof ev.target === 'object' ? 'spot' : ev.target === 'goal' ? 'goal' : num(ev.target)}`;
  const who = ev.type === 'phase' ? ev.kind : `${ev.type[0].toUpperCase() + ev.type.slice(1)} ${num(ev.actor ?? ev.off)}${tgt}`;
  return `${who[0].toUpperCase() + who.slice(1)} added at ${ev.t.toFixed(2)} s` + (warn ? `. ${warn}` : '');
}
