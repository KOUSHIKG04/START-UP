import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadTestModule } from "../../../facility-portal/scripts/load-test-module.mjs";

function load(file, mocks) {
  return loadTestModule(
    fileURLToPath(
      new URL(`../../src/features/verification/${file}`, import.meta.url)
    ),
    { mocks }
  );
}

test("reviewer authorization fails before any overview data is read", async () => {
  let reads = 0;
  const { loadVerificationOverview } = load(
    "server/loadVerificationOverview.ts",
    {
      "server-only": {},
      "@/lib/reviewer": {
        requireReviewer: async () => {
          throw Error("Denied");
        },
      },
      "@startup/data-access": {
        listCompanyVerificationCases: async () => {
          reads++;
          return [];
        },
      },
    }
  );
  await assert.rejects(loadVerificationOverview(), /Denied/);
  assert.equal(reads, 0);
});

test("queue keeps URL filtering and invalid filter fallbacks", async () => {
  const rows = [
    {
      id: "a",
      subject_type: "doctor",
      status: "pending",
      subject_name: "Dr Alpha",
    },
    {
      id: "b",
      subject_type: "facility",
      status: "verified",
      subject_name: "Alpha Clinic",
    },
    {
      id: "c",
      subject_type: "doctor",
      status: "verified",
      subject_name: "Dr Beta",
    },
  ];
  let authorizations = 0;
  const { loadVerificationQueue } = load("server/loadVerificationQueue.ts", {
    "server-only": {},
    "@/lib/reviewer": {
      requireReviewer: async () => {
        authorizations++;
        return "reviewer";
      },
    },
    "@startup/data-access": {
      listCompanyVerificationCases: async (client) => {
        assert.equal(client, "reviewer");
        return rows;
      },
    },
  });
  const selected = await loadVerificationQueue({
    searchParams: Promise.resolve({
      type: "doctor",
      status: "pending",
      q: " ALPHA ",
    }),
  });
  assert.deepEqual(
    Array.from(selected.cases, (row) => row.id),
    ["a"]
  );
  assert.equal(selected.query, "alpha");
  const fallback = await loadVerificationQueue({
    searchParams: Promise.resolve({ type: "unknown", status: "unknown" }),
  });
  assert.equal(fallback.type, "all");
  assert.equal(fallback.status, "all");
  assert.equal(fallback.cases.length, 3);
  assert.equal(authorizations, 2);
});

test("solo doctor verification still requires the approved clinic licence", async () => {
  let documents = ["medical_registration", "medical_degree"].map((kind) => ({
    kind,
    status: "approved",
  }));
  const { loadVerificationCase } = load("server/loadVerificationCase.ts", {
    "server-only": {},
    "next/navigation": {
      notFound() {
        throw Error("Not found");
      },
    },
    "@/lib/reviewer": { requireReviewer: async () => "reviewer" },
    "@startup/data-access": {
      getCompanyVerificationCase: async () => ({
        subject_type: "doctor",
        doctor: {
          requires_clinic_licence: true,
          claimed_qualification: "MBBS",
          reviewed_qualification: "MBBS",
        },
        documents,
      }),
      listCompanyDoctorFacilityRequests: async () => [],
    },
  });
  const input = { params: Promise.resolve({ id: "doctor-case" }) };
  const missing = await loadVerificationCase(input);
  assert.equal(missing.id, "doctor-case");
  assert.equal(missing.allApproved, false);
  assert.deepEqual(Array.from(missing.missingKinds), [
    "clinic_operating_licence",
  ]);
  documents = [
    ...documents,
    { kind: "clinic_operating_licence", status: "approved" },
  ];
  assert.equal((await loadVerificationCase(input)).allApproved, true);
});

function reviewActions({ denied = false, failure, reviewedCase } = {}) {
  const calls = [],
    paths = [];
  const actions = load("server/actions.ts", {
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "@/lib/reviewer": {
      requireReviewer: async () => {
        calls.push("authorize");
        if (denied) throw Error("Denied");
        return "reviewer";
      },
    },
    "@startup/contracts": {
      verificationDecisionSchema: {
        safeParse: (value) => ({ success: true, data: value }),
      },
    },
    "@startup/data-access": {
      reviewCompanyVerificationDocument: async (...args) => {
        calls.push(args);
        if (failure) throw failure;
        return reviewedCase;
      },
      finalizeCompanyVerification: async (...args) => calls.push(args),
    },
  });
  return { ...actions, calls, paths };
}

test("review action retains reviewer checks, binding arguments and revalidation", async () => {
  const reviewedCase = {
    id: "case-a",
    subject_type: "doctor",
    doctor: { requires_clinic_licence: true },
    documents: [
      "medical_registration",
      "medical_degree",
      "clinic_operating_licence",
    ].map((kind) => ({ kind, status: "approved" })),
  };
  const actions = reviewActions({ reviewedCase });
  const form = new FormData();
  form.set("decision", "approved");
  const result = await actions.reviewDocument(
    "case-a",
    "document-a",
    { error: null, success: null },
    form
  );
  assert.equal(actions.calls[0], "authorize");
  assert.deepEqual(Array.from(actions.calls[1]), [
    "reviewer",
    "document-a",
    "approved",
    undefined,
  ]);
  assert.deepEqual(Array.from(actions.calls[2]), ["reviewer", "case-a"]);
  assert.deepEqual(actions.paths, ["/verification/case-a", "/verification"]);
  assert.match(result.success, /Doctor verified/);
});

test("denied and failed review actions do not falsely refresh successful data", async () => {
  const form = new FormData();
  form.set("decision", "approved");
  const denied = reviewActions({ denied: true });
  await assert.rejects(
    denied.reviewDocument("case-a", "doc-a", {}, form),
    /Denied/
  );
  assert.deepEqual(denied.calls, ["authorize"]);
  const failed = reviewActions({ failure: { message: "Document changed" } });
  const result = await failed.reviewDocument("case-a", "doc-a", {}, form);
  assert.match(result.error, /Document changed/);
  assert.deepEqual(failed.paths, []);
});

test("review feedback refreshes once per success state and reports errors", () => {
  let ref;
  const effects = [],
    messages = [];
  let refreshes = 0;
  const { useReviewToast } = load("hooks/useReviewToast.ts", {
    react: {
      useRef: (initial) => (ref ??= { current: initial }),
      useEffect: (callback) => effects.push(callback),
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@startup/web-ui/components/ui/toast": {
      toast: { add: (message) => messages.push(message) },
    },
  });
  const success = { error: null, success: "Approved" };
  useReviewToast(success);
  effects.pop()();
  useReviewToast(success);
  effects.pop()();
  assert.equal(refreshes, 1);
  useReviewToast({ error: "Try again", success: null });
  effects.pop()();
  assert.equal(refreshes, 1);
  assert.deepEqual(
    messages.map((message) => message.type),
    ["success", "error"]
  );
});
