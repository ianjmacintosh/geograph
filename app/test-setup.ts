import "@testing-library/jest-dom";

// Mock DOM globals for Node.js test environment
global.window = global.window || ({} as any);
global.CloseEvent =
  global.CloseEvent ||
  class CloseEvent extends Event {
    code: number;
    reason: string;
    wasClean: boolean;

    constructor(type: string, eventInitDict?: CloseEventInit) {
      super(type, eventInitDict);
      this.code = eventInitDict?.code || 0;
      this.reason = eventInitDict?.reason || "";
      this.wasClean = eventInitDict?.wasClean || false;
    }
  };

// Define CloseEventInit interface
interface CloseEventInit extends EventInit {
  code?: number;
  reason?: string;
  wasClean?: boolean;
}
