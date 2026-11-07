// One row per format; no format-specific code elsewhere. Formations: GK first, the last two are the forwards.
export const FORMATS = {
  5: {
    label: '5v5',
    aspect: 1.4,
    formation: [[.04, .5], [.17, .3], [.17, .7], [.36, .35], [.36, .65]],
    offside: false,
    goalHalf: .12,
    goalKickX: .07,
    maxSubs: 3
  },
  7: {
    label: '7v7',
    aspect: 1.5, // pitch width / height
    formation: [[.04, .5], [.15, .25], [.15, .75], [.28, .35], [.28, .65], [.38, .3], [.38, .7]],
    offside: false,
    goalHalf: .1, // goal mouth is y in [.5-goalHalf, .5+goalHalf]
    goalKickX: .06, // goal kick spot distance from the goal line
    maxSubs: 5 // per team
  },
  11: {
    label: '11v11',
    aspect: 1.55,
    formation: [[.03, .5], [.14, .15], [.14, .38], [.14, .62], [.14, .85], [.28, .15], [.28, .38], [.28, .62], [.28, .85], [.4, .38], [.4, .62]],
    offside: true,
    goalHalf: .06,
    goalKickX: .05,
    maxSubs: 5
  }
};

// Goal centre each team shoots at (normalised); same for every format.
export const GOAL = {0: {x: 1, y: .5}, 1: {x: 0, y: .5}};
export const EVENT_TYPES = ['move', 'pass', 'cross', 'shot', 'dribble', 'tackle'];
// Events that involve the ball: they may not overlap in time.
export const BALL_TYPES = ['pass', 'cross', 'shot', 'dribble', 'tackle'];
