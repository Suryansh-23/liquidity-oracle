class WindowManager {
  private window: number[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  add(item: number): void {
    if (this.window.length >= this.maxSize) {
      this.window.shift();
    }
    this.window.push(item);
  }

  getWindow(): number[] {
    return this.window;
  }

  clear(): void {
    this.window = [];
  }
}

export default WindowManager;
