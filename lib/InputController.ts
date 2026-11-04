export class InputController {
  keys = new Set<string>();
  joystickX = 0;
  joystickY = 0;
  firing=false;
  yaw = 0;
  pitch = 0.18;
  interacting = false;
  private jumpQueued = false;
  private throwQueued = false;

  getMovement() {
    const x = (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0)
      - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0) + this.joystickX;
    const z = (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0)
      - (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) - this.joystickY;
    const length = Math.hypot(x, z);
    return length > 1 ? { x: x / length, z: z / length } : { x, z };
  }
  pan(dx: number, dy: number) {
    this.yaw += dx * 0.0027;
    this.pitch = Math.max(-0.24, Math.min(0.57, this.pitch + dy * 0.0024));
  }
  jump() { this.jumpQueued = true; }
  throw() { this.throwQueued = true; }
  consumeJump() { const v = this.jumpQueued; this.jumpQueued = false; return v; }
  consumeThrow() { const v = this.throwQueued; this.throwQueued = false; return v; }
  release() {
    this.firing=false;this.jumpQueued=false;this.throwQueued=false;this.interacting=false;this.keys.clear();this.joystickX=0;this.joystickY=0;
  }
  reset() {
    this.release();
    this.keys.clear(); this.joystickX = 0; this.joystickY = 0;
    this.interacting = false; this.yaw = 0; this.pitch = .18;
  }
}
