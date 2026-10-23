import { tool } from "ai";
import { z } from "zod";
import { ApiRequestError, cartAdd, cartGet, createReturn, getCategories, getOrder, getProductById, getProducts, getProductStock, preauthorizeRefund, notifyReturnInProcess } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { start } from "workflow/api";
import { returnFlow } from "./workflows/return-flow";

export const searchProducts = tool({
    description: `Search the Vercel swag store product catalog. Use this for broad lookups: when the user asks what the store sells, wants recommendations, or browses a category. Returns a short summary per product. Do NOT rely on it to answer questions about one specific item — use getProductDetails for that (searchProducts is still useful first to find the id/slug of an item the user names).`,
    inputSchema: z.object({
        query: z
            .string()
            .optional()
            .describe(
                `Optional free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
            ),
        category: z
            .string()
            .optional()
            .describe(
                `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`,
            ),
    }),
    execute: async ({ query, category }) => {
        "use step";
        try {
            const products = await getProducts({
                search: query,
                category,
                limit: 10,
            });
            return {
                count: products.length,
                products: products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    image: p.images[0],
                    price: p.price,
                    currency: p.currency,
                    category: p.category,
                    description: p.description,
                })),
            };
        } catch (err) {
            const message =
                err instanceof ApiRequestError ? err.message : "Unknown error";
            return { count: 0, products: [], error: message };
        }
    },
});

export const getProductDetails = tool({
    description: `Get the full details of a single product: description, price, all images, tags, live stock level and a few related products from the same category. Use this whenever the user asks about one specific item (e.g. "Tell me more about the black hoodie", "Is it in stock?", "How much is it?"). Requires the product id or slug — if you don't have it yet, call searchProducts first to find it.`,
    inputSchema: z.object({
        idOrSlug: z
            .string()
            .describe(
                `The product id (e.g. 'hoodie_001') or slug (e.g. 'black-pullover-hoodie'), as returned by searchProducts.`,
            ),
    }),
    execute: async ({ idOrSlug }) => {
        "use step";
        try {
            const product = await getProductById(idOrSlug);
            const [stock, sameCategory] = await Promise.all([
                getProductStock(product.id),
                getProducts({ category: product.category, limit: 4 }),
            ]);
            return {
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description,
                price: product.price,
                currency: product.currency,
                priceFormatted: formatPrice(product.price, product.currency),
                category: product.category,
                images: product.images,
                tags: product.tags,
                featured: product.featured,
                stock: {
                    quantity: stock.stock,
                    inStock: stock.inStock,
                    lowStock: stock.lowStock,
                },
                relatedProducts: sameCategory
                    .filter((p) => p.id !== product.id)
                    .slice(0, 3)
                    .map((p) => ({
                        id: p.id,
                        name: p.name,
                        slug: p.slug,
                        priceFormatted: formatPrice(p.price, p.currency),
                    })),
            };
        } catch (err) {
            const message =
                err instanceof ApiRequestError ? err.message : "Unknown error";
            return { error: message };
        }
    },
});

export const addToCart = tool({
    description: `Add a product to the user's shopping cart. Only use this when the user explicitly asks to add an item to their cart (e.g. "add the black hoodie to my cart", "I'll take two of those"). Never add items on your own initiative. Requires the product id or slug — if you don't have it yet, call searchProducts first to find it. Live stock is checked before adding.`,
    inputSchema: z.object({
        idOrSlug: z
            .string()
            .describe(
                `The product id (e.g. 'hoodie_001') or slug (e.g. 'black-pullover-hoodie'), as returned by searchProducts or getProductDetails.`,
            ),
        quantity: z
            .number()
            .int()
            .min(1)
            .max(10)
            .default(1)
            .describe("How many units to add. Defaults to 1."),
    }),
    // The cart token lives in an httpOnly cookie; it's injected server-side via
    // toolsContext (see prepareCall in lib/agent.ts) so the model never sees it.
    contextSchema: z.object({
        cartToken: z.string().min(1),
    }),
    execute: async ({ idOrSlug, quantity }, { context }) => {
        "use step";
        try {
            // The cart endpoint only accepts product ids, so resolve slugs first.
            const product = await getProductById(idOrSlug);
            const [stock, cart] = await Promise.all([
                getProductStock(product.id),
                cartGet(context.cartToken),
            ]);
            // The API doesn't enforce stock on add, so we do it here.
            const alreadyInCart =
                cart.items.find((i) => i.productId === product.id)?.quantity ?? 0;
            if (alreadyInCart + quantity > stock.stock) {
                return {
                    error: !stock.inStock
                        ? `${product.name} is out of stock.`
                        : `Only ${stock.stock} ${product.name} left in stock (${alreadyInCart} already in the cart).`,
                };
            }
            const updated = await cartAdd(context.cartToken, product.id, quantity);
            return {
                product: {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    image: product.images[0],
                    priceFormatted: formatPrice(product.price, product.currency),
                },
                quantityAdded: quantity,
                quantityInCart:
                    updated.items.find((i) => i.productId === product.id)?.quantity ??
                    alreadyInCart + quantity,
                cart: {
                    totalItems: updated.totalItems,
                    subtotalFormatted: formatPrice(updated.subtotal, updated.currency),
                },
            };
        } catch (err) {
            const message =
                err instanceof ApiRequestError ? err.message : "Unknown error";
            return { error: message };
        }
    },
});

export const getAllCategories = tool({
    description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
    inputSchema: z.object({}),
    execute: async () => {
        "use step";
        try {
            const categories = await getCategories();
            return {
                count: categories.length,
                categories: categories.map((c) => ({
                    slug: c.slug,
                    name: c.name,
                    productCount: c.productCount,
                })),
            };
        } catch (err) {
            const message =
                err instanceof ApiRequestError ? err.message : "Unknown error";
            return { count: 0, categories: [], error: message };
        }
    },
});

export const returnOrder = tool({
    description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
    inputSchema: z.object({
        orderId: z
            .string()
            .describe("The order ID the user wants to return."),
        reason: z
            .string()
            .min(10)
            .max(500)
            .describe("Why the user is returning the order."),
    }),
    execute: async ({ orderId, reason }) => {
        "use step";
        // try {
        //     const order = await getOrder(orderId);
        //     await notifyReturnInProcess(orderId);
        //     await preauthorizeRefund(orderId);
        //     const filed = await createReturn({
        //         orderId: order.id,
        //         items: order.items.map((i) => ({
        //             productId: i.productId,
        //             quantity: i.quantity,
        //         })),
        //         reason,
        //     });
        //     return { returnId: filed.id, status: filed.status };
        // } catch (err) {
        //     const message =
        //         err instanceof ApiRequestError ? err.message : "Unknown error";
        //     return { error: message };
        // }
        const run = await start(returnFlow, [orderId, reason]);
        return { runId: run.runId, message: `Return request received for order ${orderId}.` };
    },
});