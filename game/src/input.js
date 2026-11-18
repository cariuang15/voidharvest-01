// Keyboard + mouse, read once a frame. Movement is WASD or arrows; the mouse
// aims and holding the left button fires; Space (or Shift) dashes; Q or E (or
// the right mouse button) detonates a charged NOVA; P or Esc pauses; M mutes;
// 1/2/3 pick an upgrade card; Enter/Space confirms a screen.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_DASH = 8;
export const ACTION_NOVA = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 360;
  let mouseDown = false;
  let cardPick = 0; // 1, 2 or 3 when the player pressed that number key

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'Space') actions |= ACTION_DASH;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') actions |= ACTION_DASH;
    if (event.code === 'KeyQ' || event.code === 'KeyE') actions |= ACTION_NOVA;
    if (event.code === 'Digit1') cardPick = 1;
    if (event.code === 'Digit2') cardPick = 2;
    if (event.code === 'Digit3') cardPick = 3;
  }

  function keyUp(event) {
    keys.delete(event.code);
  }

  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  }

  function mouseDownFn(event) {
    if (event.button === 0) {
      mouseDown = true;
      actions |= ACTION_CONFIRM;
    }
    if (event.button === 2) actions |= ACTION_NOVA;
  }

  function mouseUpFn(event) {
    if (event.button === 0) mouseDown = false;
  }

  function blur() {
    keys.clear();
    mouseDown = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDownFn);
  window.addEventListener('mouseup', mouseUpFn);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** -1/0/1 on each axis, from WASD or the arrow keys. */
    move() {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    dashHeld() {
      return keys.has('Space');
    },
    firing() {
      return mouseDown;
    },
    aim() {
      return { x: mouseX, y: mouseY };
    },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    takeCardPick() {
      const out = cardPick;
      cardPick = 0;
      return out;
    },
    /** True while the player holds a movement key: used by the title screen to skip the intro. */
    anyKey() {
      return keys.size > 0;
    },
  };
}
