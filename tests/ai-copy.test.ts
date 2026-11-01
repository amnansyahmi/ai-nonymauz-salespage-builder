import { test } from "node:test";
import assert from "node:assert/strict";
import { readDraft, readDraftInput } from "../src/lib/ai-copy";

test("AI drafts: input is trimmed and needs a product", () => {
  assert.equal(readDraftInput({ product: " " }), null);
  const i = readDraftInput({
    product: "Sambal\u0000 hitam",
    benefit: "x".repeat(900),
    lang: "fr",
  })!;
  assert.equal(i.product, "Sambal  hitam");
  assert.equal(i.benefit.length, 400);
  assert.equal(i.lang, "ms");
});

test("AI drafts: only well-formed drafts reach the seller", () => {
  assert.equal(readDraft("not json"), null);
  assert.equal(
    readDraft(JSON.stringify({ headline: "Hi", sub: "", benefits: ["a"] })),
    null,
  );
  assert.equal(
    readDraft(JSON.stringify({ headline: "Hi", sub: "There", benefits: [] })),
    null,
  );
  const d = readDraft(
    JSON.stringify({
      headline: "H".repeat(150),
      sub: "Sub",
      benefits: ["a", "", "b", "c", "d"],
    }),
  )!;
  assert.equal(d.headline.length, 100);
  assert.deepEqual(d.benefits, ["a", "b", "c"]);
});
