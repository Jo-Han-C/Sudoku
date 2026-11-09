import type { ComponentChildren } from 'preact';

export interface DialogButton {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export function Dialog(props: {
  title: string;
  children?: ComponentChildren;
  buttons: DialogButton[];
  onClose?: () => void;
}) {
  return (
    <div class="scrim" onClick={props.onClose}>
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{props.title}</h2>
        {props.children && <div class="dialog-body">{props.children}</div>}
        <div class="dialog-buttons">
          {props.buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              class={b.primary ? 'btn primary' : 'btn'}
              onClick={b.onClick}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
