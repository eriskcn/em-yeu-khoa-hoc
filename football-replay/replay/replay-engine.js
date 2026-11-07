import { clampTime } from './timeline.js';

const FRAME = 1 / 30;

export function createReplay({
  getDuration, onTime, onPlayState,
  raf = globalThis.requestAnimationFrame, now = () => performance.now(),
}) {
  let time = 0, speed = 1, playing = false, last = 0, pending = false;

  function setTime(t) {
    time = clampTime(t, getDuration());
    onTime(time);
  }

  function schedule() {
    // a tick left over from a quick pause->play is reused, so only one chain exists
    if (pending) return;
    pending = true;
    raf(tick);
  }

  function tick() {
    pending = false;
    if (!playing) return;
    const n = now();
    const dur = getDuration();
    time = Math.min(time + ((n - last) / 1000) * speed, dur);
    last = n;
    onTime(time);
    if (time >= dur) {
      playing = false;
      onPlayState(false);
      return;
    }
    schedule();
  }

  function play() {
    if (playing) return;
    if (time >= getDuration()) setTime(0);
    playing = true;
    last = now();
    onPlayState(true);
    schedule();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    onPlayState(false);
  }

  return {
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    seek: setTime,
    step: frames => setTime(time + frames * FRAME),
    setSpeed: x => { speed = x; },
    getTime: () => time,
    isPlaying: () => playing,
    restart() {
      setTime(0);
      play();
    },
  };
}
