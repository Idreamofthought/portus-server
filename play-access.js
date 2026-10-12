// Only server callers supply now. One prepaid window is shared by all tabs.
export const PLAY_WINDOW_MS = 10_000;

export function createPlayAccess(db) {
  function state(row, now) {
    const playWindowMs = Math.max(0, (row?.play_until || 0) - now);
    return {
      remainingSeconds: Math.max(0, row?.remaining_seconds || 0) + Math.ceil(playWindowMs / 1000),
      canPlay: playWindowMs > 0 || (row?.remaining_seconds || 0) > 0,
      accessExpiresAt: playWindowMs > 0 ? row.play_until : null,
      playWindowMs
    };
  }
  const readRow = db.prepare('SELECT remaining_seconds,play_until FROM time_tracking WHERE user_id=?');
  function read(userId, now = Date.now()) { return state(readRow.get(userId), now); }
  const grant = db.transaction((userId, now, renew) => {
    const row = readRow.get(userId);
    if (!row) return state(null, now);
    const until = Math.max(now, row.play_until || 0);
    if (renew || until === now) {
      // Top up to at most ten seconds; requests in parallel reuse the same
      // window. No refunds on stop: otherwise stop/start could mint free time.
      const needed = Math.max(0, Math.floor((now + PLAY_WINDOW_MS - until) / 1000));
      const seconds = Math.min(Math.max(0, row.remaining_seconds), needed);
      if (seconds > 0) {
        row.remaining_seconds -= seconds;
        row.play_until = until + seconds * 1000;
        db.prepare('UPDATE time_tracking SET remaining_seconds=?,play_until=?,updated_at=? WHERE user_id=?')
          .run(row.remaining_seconds, row.play_until, now, userId);
      }
    }
    return state(row, now);
  });
  function stop(userId, now = Date.now()) {
    db.prepare('UPDATE time_tracking SET play_until=0,last_active_at=NULL,updated_at=? WHERE user_id=?').run(now, userId);
    return read(userId, now);
  }
  return { read, grant: (userId, { now = Date.now(), renew = false } = {}) => grant(userId, now, renew), stop };
}
