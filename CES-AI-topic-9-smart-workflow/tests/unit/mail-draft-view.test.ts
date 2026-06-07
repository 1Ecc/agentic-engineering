import assert from "node:assert/strict";
import { normalizeEmailDraft, parseAddressList } from "../../apps/web/src/lib/mail-draft.js";

assert.deepEqual(parseAddressList("a@example.com; b@example.com，c@example.com\n d@example.com"), [
  "a@example.com",
  "b@example.com",
  "c@example.com",
  "d@example.com",
]);

assert.deepEqual(
  normalizeEmailDraft({
    draft: {
      to: ["pgi@example.com"],
      cc: ["owner@example.com"],
      subject: "PGI 推送失败原因确认",
      body: "工单号：WO-1",
    },
  }),
  {
    to: ["pgi@example.com"],
    cc: ["owner@example.com"],
    title: "PGI 推送失败原因确认",
    body: "工单号：WO-1",
  },
);

assert.equal(normalizeEmailDraft({ skipped: true }), null);

console.log("mail draft view tests passed");
