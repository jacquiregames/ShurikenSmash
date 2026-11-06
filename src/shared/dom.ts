/** True when the event target is a control that Enter/Space would activate. */
export function isActivatableControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.matches("button, a, input, select, textarea, [role='button']")
  );
}
