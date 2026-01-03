import { createFileRoute } from '@tanstack/solid-router';
import { FeedList } from '../components/FeedList';

export const Route = createFileRoute('/feeds')({
  component: FeedsComponent,
});

function FeedsComponent() {
  return (
    <div>
      <h1>Feed Management</h1>
      <FeedList />
    </div>
  );
}
