import {
    ToolLoopAgent,
    type InferAgentUIMessage,
    type UIToolInvocation,
} from "ai";
import { z } from "zod";
import { searchProducts, getAllCategories, returnOrder, getProductDetails, addToCart } from "@/lib/tools";

export const shoppingAgent = new ToolLoopAgent({
    model: "anthropic/claude-sonnet-5",
    instructions: `You are a helpful assistant for the Vercel swag store. When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
  When asked about a type or category of product use the getAllCategories tool for getting valid categories before using searchProducts.
  When the user asks about a specific item — for details, sizing, images, or whether it's in stock — use the getProductDetails tool with the product's id or slug, rather than relying on the summary fields from searchProducts.
  When the user explicitly asks to add something to their cart, use the addToCart tool with the product's id or slug (find it with searchProducts first if needed). If it's unclear which product or how many they want, ask before adding. If addToCart returns an error (e.g. not enough stock), explain it to the user.
  When the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
    tools: { searchProducts, getAllCategories, returnOrder, getProductDetails, addToCart },
    // Placeholder: the real cart token is injected per request in prepareCall.
    toolsContext: {
        addToCart: { cartToken: "" },
    },
    callOptionsSchema: z.object({
        cartToken: z.string(),
    }),
    prepareCall: ({ options, ...settings }) => ({
        ...settings,
        toolsContext: {
            ...settings.toolsContext,
            addToCart: { cartToken: options.cartToken },
        },
    }),
});

export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type SearchProductsToolInvocation = UIToolInvocation<typeof searchProducts>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;
export type AddToCartToolInvocation = UIToolInvocation<typeof addToCart>;