import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDqPL-z17ccJxAPBsh6IGWpAG3dzik0NBk";
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
    const result = await model.embedContent("Hello world");
    console.log("SUCCESS: Embedding generated. Dimensions:", result.embedding.values.length);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("FAILURE:", error.message);
    }
  }
}

test();
