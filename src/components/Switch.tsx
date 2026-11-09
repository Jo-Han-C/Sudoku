import type { ComponentChildren } from 'preact';

export function Switch(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  children?: ComponentChildren;
  class?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      class={['switch', props.checked && 'on', props.class].filter(Boolean).join(' ')}
      onClick={() => props.onChange(!props.checked)}
    >
      <span class="switch-thumb">{props.children}</span>
    </button>
  );
}
