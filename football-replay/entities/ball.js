// owner (player id) is only set when the ball is controlled; absent or null = loose.
export const createBall = (x, y, owner) => (owner === undefined ? {x, y} : {x, y, owner});
