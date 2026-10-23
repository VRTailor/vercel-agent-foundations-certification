"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import type { AddToCartToolInvocation } from "@/lib/agent";

interface AgentCartUpdateProps {
    invocation: AddToCartToolInvocation;
}

export function AgentCartUpdate({ invocation }: AgentCartUpdateProps) {
    const { openCart } = useCart();

    if (
        invocation.state === "input-streaming" ||
        invocation.state === "input-available"
    ) {
        return (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                Adding to cart…
            </div>
        );
    }

    if (invocation.state !== "output-available") return null;

    const output = invocation.output;

    if (!output) return null;

    if ("error" in output) {
        return (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {output.error}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                {output.product.image && (
                    <Image
                        src={output.product.image}
                        alt={output.product.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                    />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">
                    Added {output.quantityAdded} × {output.product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    Cart: {output.cart.totalItems}{" "}
                    {output.cart.totalItems === 1 ? "item" : "items"} ·{" "}
                    {output.cart.subtotalFormatted}
                </p>
            </div>
            <Button size="sm" variant="outline" onClick={openCart}>
                View cart
            </Button>
        </div>
    );
}
