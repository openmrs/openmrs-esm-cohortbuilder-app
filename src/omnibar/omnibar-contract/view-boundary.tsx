import React from 'react';
import { useTranslation } from 'react-i18next';
import { type OmnibarViewProps } from './types';

interface BoundaryProps {
  name: string;
  query: string;
  onError: () => void;
  fallback: React.ReactNode;
  children: React.ReactNode;
}

class ViewErrorBoundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // Only that it failed, as for providers: an error's message can quote the query or a record.
    console.error(`Omnibar view ${this.props.name} failed with Error`);
    this.props.onError();
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (this.state.failed && previous.query !== this.props.query) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Keeps a Query results view that throws from reaching the framework's own boundary, which raises an
 * error toast. The view's section says only that it couldn't be shown, the host counts it as an
 * error, and the page and the other views carry on. Mounted without the host's props, the view isn't rendered at all.
 */
export function withViewBoundary(
  View: React.ComponentType<OmnibarViewProps>,
  /** Named in the console when it fails, such as its extension name. */
  name = View.displayName ?? View.name,
) {
  const Bounded: React.FC<Partial<OmnibarViewProps>> = (props) => {
    const { t } = useTranslation();
    const { reportState } = props;
    if (typeof props.query !== 'string' || !props.context || typeof reportState !== 'function') {
      return null;
    }
    return (
      <ViewErrorBoundary
        name={name}
        query={props.query}
        onError={() => reportState('error')}
        fallback={<p>{t('viewFailed', 'This section couldn’t be shown.')}</p>}
      >
        <View {...(props as OmnibarViewProps)} />
      </ViewErrorBoundary>
    );
  };
  Bounded.displayName = `withViewBoundary(${name})`;
  return Bounded;
}
