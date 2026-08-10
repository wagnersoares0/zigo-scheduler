# @zigoschedule/scheduler-interaction

Pointer interactions for custom scheduler renderers.

Most applications do not need to install this package directly. It is already
used by `@zigoschedule/scheduler-react` and
`@zigoschedule/scheduler-element`.

Use it directly when you draw the calendar yourself with
`@zigoschedule/scheduler-layout` and want the same drag, resize, mirror and
auto-scroll behavior.

## Install

```bash
npm install @zigoschedule/scheduler-interaction
```

## Example

```ts
import { AgendaElementDragging } from "@zigoschedule/scheduler-interaction";

new AgendaElementDragging(cardElement, payload, {
  getScrollContainer: () => scrollContainer,
  hitTest: (x, y) => model.hitTest(x, y),
  onDrop: (result) => {
    // Persist the new slot in your backend.
  },
});
```

This package does not render anything. It translates pointer movement into
calendar intent.
