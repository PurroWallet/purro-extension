import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/client/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
}

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionBoundary?: Element | null;
  collisionPadding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  arrowPadding?: number;
  sticky?: 'partial' | 'always';
  hideWhenDetached?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: PointerEvent) => void;
}

const TooltipContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  delayDuration: number;
  skipDelayDuration: number;
  disableHoverableContent: boolean;
}>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
  delayDuration: 700,
  skipDelayDuration: 300,
  disableHoverableContent: false,
});

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({
    children,
    delayDuration = 700,
    skipDelayDuration = 300,
    disableHoverableContent = false,
    ...props
  }, ref) => {
    const [open, setOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLElement>(null);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const skipTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const [skipDelay, setSkipDelay] = React.useState(false);

    const handleOpenChange = React.useCallback((newOpen: boolean) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (newOpen) {
        const delay = skipDelay ? skipDelayDuration : delayDuration;
        timeoutRef.current = setTimeout(() => {
          setOpen(true);
        }, delay);
      } else {
        setOpen(false);
        // Set skip delay for next tooltip
        setSkipDelay(true);
        if (skipTimeoutRef.current) {
          clearTimeout(skipTimeoutRef.current);
        }
        skipTimeoutRef.current = setTimeout(() => {
          setSkipDelay(false);
        }, skipDelayDuration);
      }
    }, [delayDuration, skipDelayDuration, skipDelay]);

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (skipTimeoutRef.current) {
          clearTimeout(skipTimeoutRef.current);
        }
      };
    }, []);

    return (
      <TooltipContext.Provider
        value={{
          open,
          onOpenChange: handleOpenChange,
          triggerRef,
          delayDuration,
          skipDelayDuration,
          disableHoverableContent
        }}
      >
        <div ref={ref} {...props}>
          {children}
        </div>
      </TooltipContext.Provider>
    );
  }
);
Tooltip.displayName = 'Tooltip';

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ children, asChild = false, className, ...props }, ref) => {
    const { onOpenChange, triggerRef } = React.useContext(TooltipContext);

    const handleMouseEnter = () => {
      onOpenChange(true);
    };

    const handleMouseLeave = () => {
      onOpenChange(false);
    };

    const handleFocus = () => {
      onOpenChange(true);
    };

    const handleBlur = () => {
      onOpenChange(false);
    };

    if (asChild) {
      return React.cloneElement(children as React.ReactElement, {
        ref: (node: HTMLElement) => {
          triggerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        },
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
      });
    }

    return (
      <button
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({
    children,
    className,
    side = 'top',
    align = 'center',
    sideOffset = 4,
    alignOffset = 0,
    avoidCollisions = true,
    collisionPadding = 10,
    onEscapeKeyDown,
    onPointerDownOutside,
    ...props
  }, ref) => {
    const { open, onOpenChange, triggerRef } = React.useContext(TooltipContext);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const [actualSide, setActualSide] = React.useState(side);

    // Calculate position based on trigger element
    const updatePosition = React.useCallback(() => {
      if (!triggerRef.current || !contentRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let top = 0;
      let left = 0;
      let finalSide = side;

      // Calculate initial position based on preferred side
      switch (side) {
        case 'top':
          top = triggerRect.top - contentRect.height - sideOffset;
          break;
        case 'bottom':
          top = triggerRect.bottom + sideOffset;
          break;
        case 'left':
          left = triggerRect.left - contentRect.width - sideOffset;
          break;
        case 'right':
          left = triggerRect.right + sideOffset;
          break;
      }

      // Handle collision detection and flipping
      if (avoidCollisions) {
        const padding = typeof collisionPadding === 'number' ? collisionPadding : 10;

        if (side === 'top' && top < padding) {
          // Flip to bottom
          top = triggerRect.bottom + sideOffset;
          finalSide = 'bottom';
        } else if (side === 'bottom' && top + contentRect.height > viewport.height - padding) {
          // Flip to top
          top = triggerRect.top - contentRect.height - sideOffset;
          finalSide = 'top';
        } else if (side === 'left' && left < padding) {
          // Flip to right
          left = triggerRect.right + sideOffset;
          finalSide = 'right';
        } else if (side === 'right' && left + contentRect.width > viewport.width - padding) {
          // Flip to left
          left = triggerRect.left - contentRect.width - sideOffset;
          finalSide = 'left';
        }
      }

      // Calculate alignment
      if (finalSide === 'top' || finalSide === 'bottom') {
        switch (align) {
          case 'start':
            left = triggerRect.left + alignOffset;
            break;
          case 'center':
            left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2 + alignOffset;
            break;
          case 'end':
            left = triggerRect.right - contentRect.width + alignOffset;
            break;
        }
      } else {
        switch (align) {
          case 'start':
            top = triggerRect.top + alignOffset;
            break;
          case 'center':
            top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2 + alignOffset;
            break;
          case 'end':
            top = triggerRect.bottom - contentRect.height + alignOffset;
            break;
        }
      }

      // Final boundary checks
      const padding = typeof collisionPadding === 'number' ? collisionPadding : 10;
      left = Math.max(padding, Math.min(left, viewport.width - contentRect.width - padding));
      top = Math.max(padding, Math.min(top, viewport.height - contentRect.height - padding));

      setPosition({ top, left });
      setActualSide(finalSide);
    }, [side, align, sideOffset, alignOffset, avoidCollisions, collisionPadding, triggerRef]);

    // Update position when open
    React.useEffect(() => {
      if (open) {
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        return () => {
          window.removeEventListener('resize', updatePosition);
          window.removeEventListener('scroll', updatePosition);
        };
      }
    }, [open, updatePosition]);

    // Handle escape key
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onEscapeKeyDown?.(event);
          if (!event.defaultPrevented) {
            onOpenChange(false);
          }
        }
      };

      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }
    }, [open, onOpenChange, onEscapeKeyDown]);

    if (!open) return null;

    const content = (
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          'fixed z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          actualSide === 'bottom' && 'slide-in-from-top-2',
          actualSide === 'left' && 'slide-in-from-right-2',
          actualSide === 'right' && 'slide-in-from-left-2',
          actualSide === 'top' && 'slide-in-from-bottom-2',
          className
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
        data-side={actualSide}
        {...props}
      >
        {children}
      </div>
    );

    return createPortal(content, document.body);
  }
);
TooltipContent.displayName = 'TooltipContent';

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
export type { TooltipProps, TooltipTriggerProps, TooltipContentProps };