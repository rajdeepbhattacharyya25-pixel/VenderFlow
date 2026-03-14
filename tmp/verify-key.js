const key = "AIzaSyDqPL-z17ccJxAPBsh6IGWpAG3dzik0NBk";
const query = "test product";

async function test(model, version) {
  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:embedContent?key=${key}`;
  console.log(`Checking ${url}...`);
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
        console.log(`[SUCCESS] ${model} works on ${version}`);
        return true;
    } else {
        console.log(`[FAILURE] ${model} on ${version}: ${result.error?.message}`);
        return false;
    }
  } catch (e) {
    console.log(`[ERROR] ${model} on ${version}: ${e.message}`);
    return false;
  }
}

async function run() {
    await test("text-embedding-004", "v1beta");
    await test("text-embedding-004", "v1");
    await test("embedding-001", "v1beta");
    await test("embedding-001", "v1");
}

run();
