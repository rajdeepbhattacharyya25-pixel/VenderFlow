const key = "[SECRET]";
const query = "test product";
const model = "gemini-embedding-2-preview";

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text: query }] }
      })
    });
    const result = await response.json();
    if (response.ok) {
        console.log(`Success! ${model} dimensions:`, result.embedding.values.length);
    } else {
        console.log("Failure:", result.error?.message);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

test();
