// A player is plain data: team 0 or 1, shirt number, normalised position; role (GK/DF/MF/FW) is optional.
export const createPlayer = (id, team, num, x, y, role) => (role ? {id, team, num, x, y, role} : {id, team, num, x, y});
