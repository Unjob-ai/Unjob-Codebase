"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: "left" | "right" | "top" | "bottom"
}

const sideClasses: Record<NonNullable<SheetContentProps["side"]>, string> = {
  left:
    "left-0 top-0 h-dvh w-64 border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  right:
    "right-0 top-0 h-dvh w-64 border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  top:
    "top-0 left-0 w-dvw border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
  bottom:
    "bottom-0 left-0 w-dvw border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 bg-background p-0 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out",
        sideClasses[side],
        className
      )}
      {...props}
    >
      {children}
      <SheetClose className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-sm text-foreground/70 transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetClose>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

export { Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay, SheetContent }


