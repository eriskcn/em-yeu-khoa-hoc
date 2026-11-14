// candidates are topmost-first; prefer teammate for pass/cross, opponent for tackle.
export function pickPlayer(candidates, tool, actorTeam) {
  const want = actorTeam == null ? null : tool === 'pass' || tool === 'cross' ? t => t === actorTeam
    : tool === 'tackle' ? t => t !== actorTeam : null;
  return (want && candidates.find(p => want(p.team))) || candidates[0];
}
