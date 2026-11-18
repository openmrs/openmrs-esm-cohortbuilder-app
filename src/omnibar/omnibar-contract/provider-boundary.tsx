import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { type OmnibarProviderProps, type OmnibarReport } from './types';

interface BoundaryProps {
  name: string;
  query: string;
  onError: () => void;
  children: React.ReactNode;
}

class ProviderErrorBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // Only that it failed: an error's message, a server response in it, and even its name are the
    // provider's to choose, and can quote the query or a record.
    console.error(`Omnibar provider ${this.props.name} failed with Error`);
    this.props.onError();
  }

  componentDidUpdate(previous: BoundaryProps) {
    // A new query gives the provider another try.
    if (this.state.failed && previous.query !== this.props.query) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Keeps a provider that throws, while rendering or in an effect, from reaching the framework's own
 * boundary, which raises an error toast. The group shows "Couldn't load results" instead, and the
 * bar and other providers carry on. Mounted without the omnibar's props, as a misused slot would,
 * the provider isn't rendered at all.
 */
export function withProviderBoundary(
  Provider: React.ComponentType<OmnibarProviderProps>,
  /** Named in the console when it fails, such as its extension name. Component names don't survive minifying. */
  name = Provider.displayName ?? Provider.name,
) {
  const Bounded: React.FC<Partial<OmnibarProviderProps>> = (props) => {
    const { t } = useTranslation();
    const { report } = props;
    const lastTitle = useRef<string>();
    const recordTitle = useCallback(
      (result: OmnibarReport) => {
        lastTitle.current = result.title;
        report(result);
      },
      [report],
    );

    if (typeof props.query !== 'string' || !props.context || typeof report !== 'function') {
      return null;
    }
    const onError = () =>
      report({ query: props.query, status: 'error', title: lastTitle.current ?? t('results', 'Results') });

    return (
      <ProviderErrorBoundary name={name} query={props.query} onError={onError}>
        <Provider {...(props as OmnibarProviderProps)} report={recordTitle} />
      </ProviderErrorBoundary>
    );
  };
  Bounded.displayName = `withProviderBoundary(${name})`;
  return Bounded;
}
