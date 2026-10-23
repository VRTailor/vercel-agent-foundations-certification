import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import { getWritable } from "workflow";
import {
    convertToModelMessages,
    type UIMessage,
} from "ai";
import { searchProducts, getAllCategories, returnOrder, getProductDetails, addToCart } from "@/lib/tools";

export async function chatFlow(messages: UIMessage[], cartToken: string) {
    "use workflow";

    const modelMessages = await convertToModelMessages(messages);

    const agent = new WorkflowAgent({
        model: "anthropic/claude-sonnet-5",
        instructions: `You are a helpful assistant for the Vercel swag store.
    When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
    When asked about a type or category of product use the getAllCategories tool for getting valid categories before using searchProducts
    When asked for details about a specific product use the getProductDetails tool to retrieve all information
    When the user explicitly asks to add something to their cart, use the addToCart tool with the product's id or slug (find it with searchProducts first if needed). If it's unclear which product or how many they want, ask before adding. If addToCart returns an error (e.g. not enough stock), explain it to the user.
    When the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
        tools: { searchProducts, getAllCategories, returnOrder, getProductDetails, addToCart },
        toolsContext: {
            addToCart: { cartToken },
        },
    });

    await agent.stream({
        messages: modelMessages,
        writable: getWritable<ModelCallStreamPart>(),
    });
}