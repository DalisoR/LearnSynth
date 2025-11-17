// Responsive breakpoint utility functions
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Get current breakpoint
export function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'lg';

  const width = window.innerWidth;

  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  if (width < 1280) return 'xl';
  return '2xl';
}

// Check if current screen matches or exceeds breakpoint
export function isBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return true;

  const width = window.innerWidth;
  const breakpointValue = parseInt(breakpoints[breakpoint].replace('px', ''));

  return width >= breakpointValue;
}

// Check if screen is mobile
export function isMobile(): boolean {
  return isBreakpoint('sm') && !isBreakpoint('md');
}

// Check if screen is tablet
export function isTablet(): boolean {
  return isBreakpoint('md') && !isBreakpoint('lg');
}

// Check if screen is desktop
export function isDesktop(): boolean {
  return isBreakpoint('lg');
}

// Get grid columns based on screen size
export function getGridCols(count: number, options?: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}): string {
  const { mobile = 1, tablet = 2, desktop = count } = options || {};

  if (isMobile() || isTablet()) {
    return `grid-cols-${mobile}`;
  } else {
    return `grid-cols-${desktop}`;
  }
}

// Get responsive padding
export function getResponsivePadding(sm?: string, md?: string, lg?: string): string {
  if (isMobile()) return sm || 'p-4';
  if (isTablet()) return md || 'p-6';
  return lg || 'p-8';
}

// Get responsive text size
export function getResponsiveText(
  mobile: string,
  tablet: string,
  desktop: string
): string {
  if (isMobile()) return mobile;
  if (isTablet()) return tablet;
  return desktop;
}

// Hook for responsive values
export function useResponsive<T>(values: {
  base: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): T {
  const breakpoint = getBreakpoint();

  // Find the largest breakpoint that's smaller than or equal to current
  const breakpointsOrdered: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  let result = values.base;

  for (let i = 0; i < breakpointsOrdered.length; i++) {
    const bp = breakpointsOrdered[i];
    if (breakpoint === bp || (i < breakpointsOrdered.length - 1 && isBreakpoint(bp))) {
      if (values[bp] !== undefined) {
        result = values[bp];
      }
    }
    if (breakpoint === bp) {
      break;
    }
  }

  return result;
}

// Media query helpers for CSS-in-JS or custom styling
export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,

  // Max-width queries
  maxSm: `(max-width: ${parseInt(breakpoints.sm) - 1}px)`,
  maxMd: `(max-width: ${parseInt(breakpoints.md) - 1}px)`,
  maxLg: `(max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  maxXl: `(max-width: ${parseInt(breakpoints.xl) - 1}px)`,
  max2Xl: `(max-width: ${parseInt(breakpoints['2xl']) - 1}px)`,

  // Range queries
  betweenSmMd: `(min-width: ${breakpoints.sm}) and (max-width: ${parseInt(breakpoints.md) - 1}px)`,
  betweenMdLg: `(min-width: ${breakpoints.md}) and (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  betweenLgXl: `(min-width: ${breakpoints.lg}) and (max-width: ${parseInt(breakpoints.xl) - 1}px)`,
} as const;

// Responsive container widths
export const containerWidths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
} as const;

// Grid template columns helper
export function createGridTemplate(
  mobile: number,
  tablet?: number,
  desktop?: number
): string {
  const tabletCols = tablet || Math.min(mobile + 1, 4);
  const desktopCols = desktop || Math.min(tabletCols + 2, 6);

  return `
    grid-cols-1
    md:grid-cols-${tabletCols}
    lg:grid-cols-${desktopCols}
  `.trim().replace(/\s+/g, ' ');
}

// Flex direction helper
export function getFlexDirection(
  mobile: 'row' | 'col',
  tablet?: 'row' | 'col',
  desktop?: 'row' | 'col'
): string {
  const tabletDir = tablet || mobile;
  const desktopDir = desktop || tabletDir;

  return `
    flex-${mobile}
    md:flex-${tabletDir}
    lg:flex-${desktopDir}
  `.trim().replace(/\s+/g, ' ');
}

// Gap helper
export function getGap(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  const tabletGap = tablet || mobile;
  const desktopGap = desktop || tabletGap;

  return `
    gap-${mobile}
    md:gap-${tabletGap}
    lg:gap-${desktopGap}
  `.trim().replace(/\s+/g, ' ');
}

// Responsive margin/padding
export function getSpacing(
  property: 'm' | 'p',
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  const tabletSpace = tablet || mobile;
  const desktopSpace = desktop || tabletSpace;

  return `
    ${property}-${mobile}
    md:${property}-${tabletSpace}
    lg:${property}-${desktopSpace}
  `.trim().replace(/\s+/g, ' ');
}

// Utility to hide/show elements at breakpoints
export function getVisibilityClasses(
  mobile: 'block' | 'hidden',
  tablet?: 'block' | 'hidden',
  desktop?: 'block' | 'hidden'
): string {
  const tabletVisible = tablet || mobile;
  const desktopVisible = desktop || tabletVisible;

  return `
    ${mobile === 'block' ? 'block' : 'hidden'}
    md:${tabletVisible === 'block' ? 'block' : 'hidden'}
    lg:${desktopVisible === 'block' ? 'block' : 'hidden'}
  `.trim().replace(/\s+/g, ' ');
}

// Calculate number of items per row based on container width
export function getItemsPerRow(
  containerWidth: number,
  itemMinWidth: number,
  gap: number = 16
): number {
  const availableWidth = containerWidth - gap * 2; // Account for padding
  const itemsPerRow = Math.floor(availableWidth / (itemMinWidth + gap));
  return Math.max(1, itemsPerRow);
}

// Responsive image sizes for next/image
export const imageSizes = {
  sm: '320px',
  md: '640px',
  lg: '1024px',
  xl: '1280px',
} as const;

export function getImageSrcSet(
  basePath: string,
  ext: string = 'jpg'
): string {
  return `
    ${basePath}-sm.${ext} ${imageSizes.sm},
    ${basePath}-md.${ext} ${imageSizes.md},
    ${basePath}-lg.${ext} ${imageSizes.lg},
    ${basePath}-xl.${ext} ${imageSizes.xl}
  `.trim().replace(/\s+/g, ' ');
}
