"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductDetailsToolInvocation } from "@/lib/agent";

interface AgentProductCardProps {
    invocation: ProductDetailsToolInvocation;
}

export function AgentProductCard({ invocation }: AgentProductCardProps) {
    if (
        invocation.state === "input-streaming" ||
        invocation.state === "input-available"
    ) {
        const idOrSlug = invocation.input?.idOrSlug;
        return (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                Looking up{idOrSlug ? ` "${idOrSlug}"` : ""}…
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

    const [image, ...moreImages] = output.images;
    const { stock } = output;

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            {image && (
                <div className="relative aspect-4/3 bg-secondary">
                    <Image
                        src={image}
                        alt={output.name}
                        fill
                        sizes="(min-width: 768px) 480px, 100vw"
                        className="object-cover"
                    />
                </div>
            )}
            {moreImages.length > 0 && (
                <div className="flex gap-2 px-4 pt-3">
                    {moreImages.slice(0, 4).map((src) => (
                        <div
                            key={src}
                            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary"
                        >
                            <Image
                                src={src}
                                alt={output.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}
            <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold leading-tight">
                            {output.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {output.priceFormatted}
                        </p>
                    </div>
                    <span
                        className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            !stock.inStock && "bg-destructive/10 text-destructive",
                            stock.inStock && stock.lowStock && "bg-amber-500/10 text-amber-600",
                            stock.inStock && !stock.lowStock && "bg-emerald-500/10 text-emerald-600",
                        )}
                    >
                        {!stock.inStock
                            ? "Out of stock"
                            : stock.lowStock
                              ? `Only ${stock.quantity} left`
                              : `In stock (${stock.quantity})`}
                    </span>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                    {output.description}
                </p>
                {output.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {output.tags.slice(0, 5).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                {output.relatedProducts.length > 0 && (
                    <div className="space-y-1 border-t border-border pt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            You might also like
                        </p>
                        <ul className="space-y-1">
                            {output.relatedProducts.map((related) => (
                                <li key={related.id}>
                                    <Link
                                        href={`/products/${related.slug}`}
                                        className="flex justify-between gap-3 text-sm underline-offset-4 hover:underline"
                                    >
                                        <span className="truncate">{related.name}</span>
                                        <span className="shrink-0 text-muted-foreground">
                                            {related.priceFormatted}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <Link
                    href={`/products/${output.slug}`}
                    className="inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                    View product →
                </Link>
            </div>
        </div>
    );
}
