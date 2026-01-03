import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/feeds')({
  component: FeedsComponent,
});

function FeedsComponent() {
  return <div>Hello /feeds!</div>;
}
