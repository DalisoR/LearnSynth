import React, { ComponentType, memo, useMemo, useCallback } from 'react';

/**
 * Create a memoized component with custom comparison
 */
export function createOptimizedComponent<T extends ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: React.ComponentProps<T>, nextProps: React.ComponentProps<T>) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `Optimized(${Component.displayName || Component.name})`;
  return MemoizedComponent as T;
}

/**
 * Custom comparison function for props
 */
export const createPropsComparator = <T extends Record<string, any>>(
  keysToCompare: (keyof T)[]
) => {
  return (prevProps: T, nextProps: T): boolean => {
    return keysToCompare.every(key => {
      return prevProps[key] === nextProps[key];
    });
  };
};

/**
 * Memoize expensive component computations
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  dependencies: React.DependencyList,
  options?: {
    maxCacheSize?: number;
  }
): T {
  const { maxCacheSize = 10 } = options || {};

  return useMemo(() => {
    return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

/**
 * Memoize callbacks to prevent unnecessary re-renders
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T {
  return useCallback(callback, dependencies) as T;
}

/**
 * Create a list item that only re-renders when props change
 */
export const OptimizedListItem = createOptimizedComponent<ComponentType<{
  item: any;
  index: number;
  onClick: (item: any) => void;
}>>(({ item, index, onClick }) => {
  return (
    <div onClick={() => onClick(item)}>
      {item.title}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.index === nextProps.index
  );
});

/**
 * Create a grid item component
 */
export const OptimizedGridItem = createOptimizedComponent<ComponentType<{
  item: any;
  onSelect: (item: any) => void;
}>>(({ item, onSelect }) => {
  return (
    <div className="grid-item" onClick={() => onSelect(item)}>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </div>
  );
});

/**
 * Virtualized list wrapper
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  height,
  overscan = 5
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  height: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemHeight) + overscan,
    items.length - 1
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Infinite scrolling component
 */
export function InfiniteScroll<T>({
  items,
  loadMore,
  hasMore,
  renderItem,
  itemHeight,
  threshold = 100
}: {
  items: T[];
  loadMore: () => void;
  hasMore: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  threshold?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const handleScroll = React.useCallback(() => {
    if (!containerRef.current || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setScrollTop(scrollTop);

    // Check if we're near the bottom
    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      loadMore();
    }
  }, [hasMore, threshold, loadMore]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div ref={containerRef} style={{ height: '100%', overflow: 'auto' }}>
      {items.map((item, index) => (
        <div key={index} style={{ height: itemHeight }}>
          {renderItem(item, index)}
        </div>
      ))}
      {hasMore && (
        <div style={{ height: itemHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading more...
        </div>
      )}
    </div>
  );
}

/**
 * Debounced input component
 */
export function DebouncedInput({
  value,
  onChange,
  delay = 300,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(localValue);
    }, delay);

    return () => clearTimeout(timeout);
  }, [localValue, delay, onChange]);

  return <input {...props} value={localValue} onChange={(e) => setLocalValue(e.target.value)} />;
}

/**
 * Split rendering to prevent blocking
 */
export function RenderSplitter({
  items,
  chunkSize,
  renderItem,
  onComplete
}: {
  items: any[];
  chunkSize: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  onComplete?: () => void;
}) {
  const [renderedCount, setRenderedCount] = React.useState(0);

  React.useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex >= items.length) {
        clearInterval(interval);
        onComplete?.();
        return;
      }

      setRenderedCount(currentIndex + chunkSize);
      currentIndex += chunkSize;
    }, 0); // Use rAF

    return () => clearInterval(interval);
  }, [items, chunkSize, onComplete]);

  return (
    <>
      {items.slice(0, renderedCount).map((item, index) => (
        <React.Fragment key={index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Image component with lazy loading
 */
export const LazyImage = memo<{
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}>(({ src, alt, className, placeholder }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [inView, setInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {inView ? (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        />
      ) : (
        placeholder && <img src={placeholder} alt="" />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

/**
 * Component that only renders on client side (prevents hydration issues)
 */
export function ClientOnly({
  children,
  fallback = null
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Context provider with memoization
 */
export function createOptimizedContext<T>(defaultValue: T) {
  const Context = React.createContext<T>(defaultValue);

  function Provider({ children, value }: { children: React.ReactNode; value: T }) {
    const memoizedValue = useMemo(() => value, [value]);
    return <Context.Provider value={memoizedValue}>{children}</Context.Provider>;
  }

  return { Context, Provider };
}

/**
 * useReducer with action memoization
 */
export function useOptimizedReducer<T, A>(
  reducer: React.Reducer<T, A>,
  initialState: T,
  init?: (initialState: T) => T
) {
  const [state, dispatch] = React.useReducer(reducer, initialState, init);

  const memoizedDispatch = useCallback((action: A) => {
    dispatch(action);
  }, []);

  return [state, memoizedDispatch] as const;
}

/**
 * Stable reference for objects
 */
export function useStableValue<T>(value: T): T {
  const ref = React.useRef(value);
  ref.current = value;
  return ref.current;
}

/**
 * Conditional rendering wrapper
 */
export function ConditionalRender({
  condition,
  children,
  fallback = null
}: {
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const memoizedCondition = useStableValue(condition);

  return <>{memoizedCondition ? children : fallback}</>;
}
