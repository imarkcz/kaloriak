// Web haptics — works natively on Android (Vibration API). On iOS Safari/PWA
// the Vibration API is not implemented; iOS 17.4+ standalone PWAs trigger a
// system haptic when an <input type="checkbox" switch> changes state inside
// a <label>, so we toggle a hidden one as a fallback.

let switchLabel: HTMLLabelElement | null = null;

function ensureSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null;
  if (switchLabel) return switchLabel;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.appendChild(input);
  document.body.appendChild(label);
  switchLabel = label;
  return label;
}

export function haptic(kind: 'tick' | 'tap' | 'success' = 'tick') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const ms: number | number[] =
      kind === 'success' ? [10, 30, 10] : kind === 'tap' ? 12 : 6;
    try { navigator.vibrate(ms); } catch { /* noop */ }
  }
  try {
    const label = ensureSwitch();
    if (!label) return;
    const input = label.firstChild as HTMLInputElement;
    input.checked = !input.checked;
  } catch { /* noop */ }
}
