/** Serialize captured snapshots so slow saves cannot overwrite newer edits. */
export class SaveQueue<T> {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private write: (value: T) => Promise<void>) {}
  save(value: T) {
    const snapshot = JSON.parse(JSON.stringify(value)) as T;
    const next = this.tail.then(() => this.write(snapshot));
    this.tail = next.catch(() => {});
    return next;
  }
}
