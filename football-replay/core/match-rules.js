// One row per format. Add 5 and 11 here later; no format-specific code elsewhere.
export const FORMATS = {
  7: {
    label: '7v7',
    aspect: 1.5, // pitch width / height
    formation: [[.04, .5], [.15, .25], [.15, .75], [.28, .35], [.28, .65], [.38, .3], [.38, .7]],
    offside: false,
    goalHalf: .1, // goal mouth is y in [.5-goalHalf, .5+goalHalf]
    goalKickX: .06, // goal kick spot distance from the goal line
    maxSubs: 5 // per team
  }
};

// Goal centre each team shoots at (normalised); same for every format.
export const GOAL = {0: {x: 1, y: .5}, 1: {x: 0, y: .5}};
export const EVENT_TYPES = ['move', 'pass', 'cross', 'shot', 'dribble', 'tackle'];
// Events that involve the ball: they may not overlap in time.
export const BALL_TYPES = ['pass', 'cross', 'shot', 'dribble', 'tackle'];
