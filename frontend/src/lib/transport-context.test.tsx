import { render } from 'solid-js/web';
import { TransportProvider, useTransport } from './transport-context';
import { transport } from './query';
import { describe, it, expect, afterEach } from 'vitest';

describe('TransportContext', () => {
  let dispose: () => void;

  afterEach(() => {
    if (dispose) dispose();
    document.body.innerHTML = '';
  });

  it('provides the transport', () => {
    let capturedTransport: any;
    const TestComponent = () => {
      capturedTransport = useTransport();
      return <div>Test</div>;
    };

    dispose = render(() => (
      <TransportProvider transport={transport}>
        <TestComponent />
      </TransportProvider>
    ), document.body);

    expect(capturedTransport).toBe(transport);
  });
});