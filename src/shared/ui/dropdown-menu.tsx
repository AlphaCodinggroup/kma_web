"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@shared/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof Menu.Content>, React.ComponentPropsWithoutRef<typeof Menu.Content>>(({ className, sideOffset = 6, ...props }, ref) => (
  <Menu.Portal><Menu.Content ref={ref} sideOffset={sideOffset} className={cn("z-[70] min-w-48 max-w-[calc(100vw-32px)] rounded-xl border border-[var(--kma-border)] bg-[var(--kma-surface)] p-1.5 text-sm text-[var(--kma-fg)] shadow-[var(--kma-elevation-overlay)]", className)} {...props} /></Menu.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";
export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof Menu.Item>, React.ComponentPropsWithoutRef<typeof Menu.Item>>(({ className, ...props }, ref) => (
  <Menu.Item ref={ref} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded px-3 py-2 outline-none data-[highlighted]:bg-[var(--kma-selected)] data-[highlighted]:text-[var(--kma-primary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props} />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
export const DropdownMenuSeparator = React.forwardRef<React.ElementRef<typeof Menu.Separator>, React.ComponentPropsWithoutRef<typeof Menu.Separator>>(({ className, ...props }, ref) => <Menu.Separator ref={ref} className={cn("my-1 h-px bg-[var(--kma-border)]", className)} {...props} />);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
