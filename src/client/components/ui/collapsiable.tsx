"use client"

/**
 * Collapsible component inspired by shadcn/ui
 * 
 * Usage:
 * ```tsx
 * import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/client/components/ui"
 * 
 * <Collapsible>
 *   <CollapsibleTrigger>Can I use this in my project?</CollapsibleTrigger>
 *   <CollapsibleContent>
 *     Yes. Free to use for personal and commercial projects.
 *   </CollapsibleContent>
 * </Collapsible>
 * ```
 */

import React, { createContext, useContext, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/client/lib/utils"

interface CollapsibleContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CollapsibleContext = createContext<CollapsibleContextValue | undefined>(
  undefined
)

const useCollapsible = () => {
  const context = useContext(CollapsibleContext)
  if (!context) {
    throw new Error("useCollapsible must be used within a Collapsible")
  }
  return context
}

interface CollapsibleProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ children, defaultOpen = false, open: controlledOpen, onOpenChange, className }, ref) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen)
    
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    
    const setOpen = (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    }

    return (
      <CollapsibleContext.Provider value={{ open, setOpen }}>
        <div ref={ref} className={cn("space-y-2", className)}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = "Collapsible"

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  asChild?: boolean
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, className, onClick, asChild = false, ...props }, ref) => {
    const { open, setOpen } = useCollapsible()

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpen(!open)
      onClick?.(event)
    }

    if (asChild) {
      const child = children as React.ReactElement<any>
      return React.cloneElement(child, {
        onClick: handleClick,
        "aria-expanded": open,
        "data-state": open ? "open" : "closed",
      })
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        onClick={handleClick}
        className={cn(
          "flex w-full items-center justify-between py-2 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className }, ref) => {
    const { open } = useCollapsible()

    return (
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            ref={ref}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
            className={cn("overflow-hidden", className)}
            data-state={open ? "open" : "closed"}
          >
            <div className="pb-2 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
