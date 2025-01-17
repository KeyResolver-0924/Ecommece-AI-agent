import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import Product from "../models/product.model.js"; 
import Stripe from "stripe";
dotenv.config();

const router = express.Router();

// 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getProductById = async ({ id }) => {
  try {
    const product = await Product.findById(id);
    if (!product) {
      console.warn(`Product with ID ${id} not found.`);
      return null;
    }
    return {
      name: product.name,
      image: product.image,
      price: product.price,
      _id: product._id, 
    };
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
};

const recommendProducts = async ({ category }) => {
  try {
    const products = await Product.find({ category });
    return products.map((product) => ({
      name: product.name,
      image: product.image,
      price: product.price,
      _id: product._id,
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};


const processPayment = async (product_id) => {
  try {
    const product = await Product.findById(product_id);
    if (!product) {
      throw new Error("Product not found.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: product.name },
            unit_amount: Math.round(product.price * 100), 
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    return session.url;
  } catch (error) {
    console.error("Error processing payment:", error);
    throw error;
  }
};
const userConversations = {};
router.post("/", async (req, res) => {
  console.log("Received request at /api/chat:", req.body);

  const { message, userId } = req.body;

  if (!message || !userId) {
    console.log("Missing message or userId");
    return res.status(400).json({ error: "Message and userId are required." });
  }
  if (!userConversations[userId]) {
    userConversations[userId] = [
      { role: "system",
        content:
          "You are an AI assistant for an e-commerce platform. Help users find products, answer questions, and assist with purchases. Do not repeat the user's input. Provide clear, concise, and helpful responses."
       }
    ];
  }
  userConversations[userId].push({ role: 'user', content: message });
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: userConversations[userId],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ecommerce_ai_assistant",
          schema: {
            type: "object",
            required: [
              "user_query",
              "display",
              "user_preferences",
              "product_recommendation",
              "purchase_confirmation",
              "payment_process",
            ],
            properties: {
              user_query: {
                type: "string",
                description: "The query or question posed by the user.",
              },
              display: {
                type: "string",
                description:
                  "Solve the question posed by user and give your advice to user. If you need more details, you can ask the user until you get all information about user_query, user_preferences, product_recommendation, and purchase_confirmation.",
              },
              payment_process: {
                type: "object",
                required: ["payment_success", "redirect_link"],
                properties: {
                  redirect_link: {
                    type: "string",
                    description: "Link to redirect the user for payment.",
                  },
                  payment_success: {
                    type: "boolean",
                    description: "Indicates if the payment was processed successfully.",
                  },
                },
                description: "The process that will be triggered to handle payment.",
                additionalProperties: false,
              },
              user_preferences: {
                type: "object",
                required: ["gender", "size", "category", "summ"],
                properties: {
                  size: {
                    type: "string",
                    description: "The size preferred by the user for the product.",
                  },
                  gender: {
                    type: "string",
                    description: "The gender category for the product, e.g., 'male' or 'female'.",
                  },
                  category: {
                    type: "string",
                    description: "The category of product the user is interested in, like 'shoes', 'clothes', etc.",
                  },
                  summ: {
                    type: "string",
                    description: "Summarize all user characteristics in one sentence.",
                  },
                },
                description: "Criteria details provided by the user for their request.",
                additionalProperties: false,
              },
              purchase_confirmation: {
                type: "object",
                required: ["confirm_purchase"],
                properties: {
                  confirm_purchase: {
                    type: "boolean",
                    description: "User's confirmation on whether they want to purchase the suggested product.",
                  },
                },
                description: "The confirmation for purchase from the user.",
                additionalProperties: false,
              },
              product_recommendation: {
                type: "object",
                required: ["ndrec", "product_category"],
                properties: {
                  ndrec: {
                    type: "boolean",
                    description:
                      "If user wants to gain some recommendations, and you know all the user_preferences and the category user wants to buy, the ndrec value should be true. If you do not know one of them, ndrec value should be false.",
                  },
                  product_category: {
                    type: "string",
                    description:
                      "The category user wants to buy, it has to be one of [jeans, t-shirts, shoes, glasses, jackets, suits, bags].",
                  },
                },
                description:
                  "Try to understand if the user wants to gain some recommendations, and make sure you have collected all information you need to know.",
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
          strict: true,
        },
      },
      // tools: [
      //   {
      //     type: "function",
      //     function: {
      //       name: "deploy_ai_assistant",
      //       strict: true,
      //       parameters: {
      //         type: "object",
      //         required: ["user_request", "product_type", "payment_info"],
      //         properties: {
      //           payment_info: {
      //             type: "object",
      //             required: ["confirm_purchase", "payment_method"],
      //             properties: {
      //               payment_method: {
      //                 type: "string",
      //                 description: "The payment method chosen by the user.",
      //               },
      //               confirm_purchase: {
      //                 type: "boolean",
      //                 description: "Indicates if the user confirms to proceed with the payment.",
      //               },
      //             },
      //             additionalProperties: false,
      //           },
      //           product_type: {
      //             type: "string",
      //             description:
      //               "The type of product the user is interested in, it has to be one of jeans, t-shirts, shoes, glasses, jackets, suits, bags.",
      //           },
      //           user_request: {
      //             type: "object",
      //             required: ["action", "requirements"],
      //             properties: {
      //               action: {
      //                 type: "string",
      //                 description:
      //                   "The action the user wants to take, such as 'buy shoes' or 'inquire about a product'.",
      //               },
      //               requirements: {
      //                 type: "object",
      //                 required: ["gender", "size"],
      //                 properties: {
      //                   size: {
      //                     type: "string",
      //                     description: "Size specification for the shoes or apparel.",
      //                   },
      //                   gender: {
      //                     type: "string",
      //                     description: "Gender specification for the product, e.g., 'male' or 'female'.",
      //                   },
      //                 },
      //                 additionalProperties: false,
      //               },
      //             },
      //             additionalProperties: false,
      //           },
      //         },
      //         additionalProperties: false,
      //       },
      //       description:
      //         "Deploy an AI assistant for an e-commerce platform that assists users in product recommendations, answers queries, and helps with payment processes.",
      //     },
      //   },
      // ],
      // tool_choice: "auto",
      temperature: 0.7,
      max_completion_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    console.log("Response from OpenAI:", response);

    const chatMessage = response.choices[0].message;
    console.log("chatMessage from OpenAI:", chatMessage);
    let data;
    try {
      data = JSON.parse(chatMessage.content);
    } catch (error) {
      console.error("jsonerror:", error);
    }

    if (data) {
      const userQuery = data.user_query;
      const display = data.display;
      const userPreferences = data.user_preferences;
      const productRecommendation = data.product_recommendation;
      const purchaseConfirmation = data.purchase_confirmation;
      const paymentProcess = data.payment_process;
      const nd = productRecommendation.ndrec;
      const cat = productRecommendation.product_category;
      if (nd) {
        const alldatajson = await recommendProducts({ category: cat });
    

        const alldatajsonSimplified = alldatajson.map(product => ({
          _id: product._id, 
          name: product.name,
        }));
    
        const userdata = userPreferences.summ;
    
        try {
          const findrecom = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a customer with characteristics: ${userdata}, and you have the following items to choose from: ${JSON.stringify(
                  alldatajsonSimplified
                )}. Which product would you choose?`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "ecommerce_ai_assistant",
                schema: {
                  type: "object",
                  required: ["item_id", "item_name"],
                  properties: {
                    item_id: {
                      type: "string",
                      description: "The item id you are going to choose.",
                    },
                    item_name: {
                      type: "string",
                      description: "The item name you are going to choose.",
                    },
                  },
                  additionalProperties: false,
                },
                strict: true,
              },
            },
            // tool_choice: "auto",
            temperature: 0.7,
            max_completion_tokens: 500,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          });
    
          const newcom = findrecom.choices[0].message;
          let recodata;
          try {
            recodata = JSON.parse(newcom.content);
          } catch (error) {
            console.error("jsonerror:", error);
          }
    
          if (recodata) {
            const recprod = await getProductById({id: recodata.item_id});
            console.log(recprod)
            return res.json({
              reply: "These is what I can find which is fit for you.",
              recommendation:recprod
            });
          }
        } catch (error) {
          console.error("Error during recommendation:", error);
        }
      }
      else{
        return res.json({
          reply: display,
          recommendation: null
        });
      }
    }

  } catch (error) {
    console.error("Error handling chat:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
