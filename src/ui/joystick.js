import { stickInput } from '../world/movement.ts';

const RELEASED = { x: 0, y: 0, sprint: false };

/**
 * A virtual thumbstick for touch screens. The knob follows one finger inside
 * the base; pushing it into the outer ring sprints. Reports StickInput.
 */
export function createJoystick(base, onChange) {
  const knob = base.querySelector('.joystick-knob');
  let pointerId = null,
    centreX = 0,
    centreY = 0,
    radius = 1;

  function move(event) {
    const dx = event.clientX - centreX,
      dy = event.clientY - centreY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    const input = stickInput(dx, dy, radius);
    base.classList.toggle('sprinting', input.sprint);
    onChange(input);
  }
  function release() {
    if (pointerId === null) return;
    pointerId = null;
    knob.style.transform = '';
    base.classList.remove('active', 'sprinting');
    onChange(RELEASED);
  }

  base.addEventListener('pointerdown', (event) => {
    if (pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    base.setPointerCapture(pointerId);
    const bounds = base.getBoundingClientRect();
    centreX = bounds.left + bounds.width / 2;
    centreY = bounds.top + bounds.height / 2;
    // Keep the knob inside the base.
    radius = (bounds.width - knob.offsetWidth) / 2;
    base.classList.add('active');
    move(event);
  });
  base.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId) move(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    base.addEventListener(type, (event) => {
      if (event.pointerId === pointerId) release();
    });

  return { release };
}
