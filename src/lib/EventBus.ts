// A simple event bus for cross-component communication

type EventHandler = (data?: any) => void;

class EventBus {
  private events: { [key: string]: EventHandler[] };

  constructor() {
    this.events = {};
  }

  on(event: string, callback: EventHandler): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventHandler): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
}

const eventBus = new EventBus();
export default eventBus;
