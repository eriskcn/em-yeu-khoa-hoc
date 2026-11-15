import {createPlayer} from './player.js';

// Team 0 attacks right and is mirrored to the left half; team 1 is mirrored to the right.
export function createTeam(team, formation, firstId) {
  return formation.map(([x, y], i) => createPlayer(firstId + i, team, i + 1, team === 0 ? x : 1 - x, y));
}
