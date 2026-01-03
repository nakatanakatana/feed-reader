import { render } from '@solidjs/testing-library';
import { TransportProvider, useTransport } from './transport-context';
import { transport } from './query';
import { describe, it, expect } from 'vitest';

describe('TransportContext', () => {
  it('provides the transport', () => {
    let capturedTransport: any;
    const TestComponent = () => {
      capturedTransport = useTransport();
      return <div>Test</div>;
    };

    render(() => (
      <TransportProvider transport={transport}>
        <TestComponent />
      </TransportProvider>
    ));

    expect(capturedTransport).toBe(transport);
  });
});
