// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de Flows.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";

const { http } = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@shared/api/http.client", () => ({ httpClient: http, default: http }));

import { FlowsHttpRepo, FlowsApiError, flowsRepo } from "../flows.repo.impl";
import type { FlowDTO, FlowListDTO } from "../flows.dto";
import { mapFlowDTO, mapFlowListDTO, mapFlowToDTO } from "@entities/flow/lib/mappers";
import type { Flow } from "@entities/flow/model";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const flowDTO: FlowDTO = {
  id: "flow-1",
  title: "Ramps",
  description: "Ramp inspection",
  version: 3,
  is_active: true,
  flow_type: "Navigation",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  steps: [
    {
      id: "s1",
      type: "Question",
      text: "Is there a ramp?",
      yes_next: "s2",
      no_next: "s4",
      barrier_id: "b1",
      image: "a.jpg",
    },
    {
      id: "s2",
      type: "Form",
      title: "Measurements",
      next: "s3",
      fields: [
        { id: "f1", type: "number", label: "Width", unit: "in" },
      ],
    },
    {
      id: "s3",
      type: "Select",
      title: "Pick one",
      options: [{ label: "A", next: "s4", barrier_id: "b2" }],
      next: "s4",
    },
    { id: "s4", type: "End" },
  ],
};

const flowListDTO: FlowListDTO = {
  flows: [
    {
      id: "flow-1",
      title: "Ramps",
      description: "Ramp inspection",
      version: 3,
      is_active: true,
      flow_type: "Navigation",
      steps: [{ type: "Question" }, { type: "End" }],
    },
  ],
  total: 1,
  limit: 10,
  offset: 0,
};

const domainFlow: Flow = {
  id: "flow-1",
  title: "Ramps",
  description: "Ramp inspection",
  flowType: "Navigation",
  version: 3,
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  steps: [
    {
      id: "s1",
      type: "Question",
      text: "Is there a ramp?",
      yesNext: "s2",
      noNext: "s4",
      barrierId: "b1",
      images: ["a.jpg"],
    },
    {
      id: "s2",
      type: "Form",
      title: "Measurements",
      next: "s3",
      fields: [{ id: "f1", type: "number", label: "Width", unit: "in" }],
      images: [],
    },
    {
      id: "s3",
      type: "Select",
      title: "Pick one",
      options: [{ label: "A", next: "s4", barrierId: "b2" }],
      next: "s4",
      images: [],
    },
    { id: "s4", type: "End", images: [] },
  ],
};

/** Construye un AxiosError con response para ejercitar los extractores. */
function axiosErrorWith(status: number, data: unknown): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, null, {
    status,
    statusText: "Error",
    data,
    headers: {},
    config: { headers: {} },
  } as unknown as AxiosResponse);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe("FlowsHttpRepo.list", () => {
  it("GETs the summary endpoint", async () => {
    http.get.mockResolvedValueOnce({ data: flowListDTO });

    await new FlowsHttpRepo().list();

    expect(http.get).toHaveBeenCalledWith("/api/flows/summary");
  });

  it("maps the validated payload into the domain list", async () => {
    http.get.mockResolvedValueOnce({ data: flowListDTO });

    const list = await new FlowsHttpRepo().list();

    expect(list).toEqual(mapFlowListDTO(flowListDTO));
    expect(list.total).toBe(1);
    expect(list.flows[0]?.steps).toHaveLength(2);
  });

  it("throws a 500 FlowsApiError when the payload fails validation", async () => {
    http.get.mockResolvedValueOnce({ data: { flows: "not-an-array" } });

    const err = (await new FlowsHttpRepo()
      .list()
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err).toBeInstanceOf(FlowsApiError);
    expect(err.message).toBe("Frontend validation failed. Check console.");
    expect(err.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith(
      "[FlowsHttpRepo] Validation Error",
      expect.objectContaining({ rawResponse: { flows: "not-an-array" } })
    );
  });

  it("wraps a transport AxiosError keeping status and payload message", async () => {
    http.get.mockRejectedValueOnce(axiosErrorWith(503, { message: "upstream down" }));

    const err = (await new FlowsHttpRepo()
      .list()
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err).toBeInstanceOf(FlowsApiError);
    expect(err.message).toBe("upstream down");
    expect(err.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------

describe("FlowsHttpRepo.getById", () => {
  it("GETs the flow detail endpoint", async () => {
    http.get.mockResolvedValueOnce({ data: flowDTO });

    await new FlowsHttpRepo().getById("flow-1");

    expect(http.get).toHaveBeenCalledWith("/api/flows/flow-1");
  });

  it("maps the DTO into a domain flow", async () => {
    http.get.mockResolvedValueOnce({ data: flowDTO });

    const flow = await new FlowsHttpRepo().getById("flow-1");

    expect(flow).toEqual(mapFlowDTO(flowDTO));
    expect(flow?.steps).toHaveLength(4);
  });

  it("returns null for a 404", async () => {
    http.get.mockRejectedValueOnce(axiosErrorWith(404, { message: "gone" }));

    await expect(new FlowsHttpRepo().getById("nope")).resolves.toBeNull();
  });

  it("throws a FlowsApiError when the payload fails validation", async () => {
    http.get.mockResolvedValueOnce({ data: { id: "flow-1" } });

    const err = (await new FlowsHttpRepo()
      .getById("flow-1")
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err).toBeInstanceOf(FlowsApiError);
    // El ZodError no es AxiosError: se usa su propio mensaje y no hay status.
    expect(err.status).toBeUndefined();
  });

  it("wraps a non-404 AxiosError", async () => {
    http.get.mockRejectedValueOnce(axiosErrorWith(500, { message: "boom" }));

    const err = (await new FlowsHttpRepo()
      .getById("flow-1")
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err.message).toBe("boom");
    expect(err.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// getPresignedUrl / uploadFile
// ---------------------------------------------------------------------------

describe("FlowsHttpRepo.getPresignedUrl", () => {
  const signed = {
    uploadUrl: "https://s3.example.com/x?sig=1",
    publicUrl: "https://s3.example.com/x",
  };

  it("POSTs fileName and fileType and returns the raw payload", async () => {
    http.post.mockResolvedValueOnce({ data: signed });

    const result = await new FlowsHttpRepo().getPresignedUrl(
      "photo.jpg",
      "image/jpeg"
    );

    expect(http.post).toHaveBeenCalledWith("/api/uploads/presigned", {
      fileName: "photo.jpg",
      fileType: "image/jpeg",
    });
    expect(result).toEqual(signed);
  });

  it("wraps an error into FlowsApiError", async () => {
    http.post.mockRejectedValueOnce(axiosErrorWith(400, "bad request body"));

    const err = (await new FlowsHttpRepo()
      .getPresignedUrl("a", "b")
      .catch((e: unknown) => e)) as FlowsApiError;

    // data string se usa como mensaje.
    expect(err.message).toBe("bad request body");
    expect(err.status).toBe(400);
  });
});

describe("FlowsHttpRepo.uploadFile", () => {
  it("PUTs the file through the proxy with the base64 target", async () => {
    http.put.mockResolvedValueOnce({ data: undefined });
    const uploadUrl = "https://s3.example.com/bucket/x.jpg?sig=abc";
    const file = new File(["data"], "x.jpg", { type: "image/jpeg" });

    await new FlowsHttpRepo().uploadFile(uploadUrl, file);

    expect(http.put).toHaveBeenCalledWith(
      `/api/uploads/proxy?url=${btoa(uploadUrl)}`,
      file,
      { headers: { "Content-Type": "image/jpeg" } }
    );
  });

  it("wraps a proxy failure into FlowsApiError", async () => {
    http.put.mockRejectedValueOnce(axiosErrorWith(403, { message: "denied" }));
    const file = new File(["data"], "x.jpg", { type: "image/jpeg" });

    const err = (await new FlowsHttpRepo()
      .uploadFile("https://s3.example.com/x", file)
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err.message).toBe("denied");
    expect(err.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// create / update / delete
// ---------------------------------------------------------------------------

describe("FlowsHttpRepo.create", () => {
  it("POSTs the DTO produced by the mapper", async () => {
    http.post.mockResolvedValueOnce({ data: domainFlow });

    const created = await new FlowsHttpRepo().create(domainFlow);

    expect(http.post).toHaveBeenCalledWith(
      "/api/flows",
      mapFlowToDTO(domainFlow)
    );
    // El body viaja en snake_case.
    const [, body] = http.post.mock.calls[0] as [string, FlowDTO];
    expect(body.flow_type).toBe("Navigation");
    expect(body.steps[0]).toMatchObject({ id: "s1", yes_next: "s2" });
    expect(created).toEqual(domainFlow);
  });

  it("wraps a failure into FlowsApiError", async () => {
    http.post.mockRejectedValueOnce(axiosErrorWith(422, { message: "invalid flow" }));

    const err = (await new FlowsHttpRepo()
      .create(domainFlow)
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err.message).toBe("invalid flow");
    expect(err.status).toBe(422);
  });
});

describe("FlowsHttpRepo.update", () => {
  it("PUTs the DTO to the flow URL", async () => {
    http.put.mockResolvedValueOnce({ data: domainFlow });

    const updated = await new FlowsHttpRepo().update("flow-1", domainFlow);

    expect(http.put).toHaveBeenCalledWith(
      "/api/flows/flow-1",
      mapFlowToDTO(domainFlow)
    );
    expect(updated).toEqual(domainFlow);
  });

  it("wraps a failure into FlowsApiError", async () => {
    http.put.mockRejectedValueOnce(new Error("offline"));

    const err = (await new FlowsHttpRepo()
      .update("flow-1", domainFlow)
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err.message).toBe("offline");
    expect(err.status).toBeUndefined();
  });
});

describe("FlowsHttpRepo.delete", () => {
  it("DELETEs the flow URL", async () => {
    http.delete.mockResolvedValueOnce({ data: undefined });

    await expect(
      new FlowsHttpRepo().delete("flow-1")
    ).resolves.toBeUndefined();

    expect(http.delete).toHaveBeenCalledWith("/api/flows/flow-1");
  });

  it("falls back to the generic message for a non-Error rejection", async () => {
    http.delete.mockRejectedValueOnce("weird");

    const err = (await new FlowsHttpRepo()
      .delete("flow-1")
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err.message).toBe("Failed to delete flow");
    expect(err.status).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Extractores de mensaje/status (via los errores propagados)
// ---------------------------------------------------------------------------

describe("error message extraction", () => {
  it.each([
    [
      "an AxiosError whose payload carries message",
      axiosErrorWith(400, { message: "payload message" }),
      "payload message",
      400,
    ],
    [
      "an AxiosError with a string payload",
      axiosErrorWith(400, "string payload"),
      "string payload",
      400,
    ],
    [
      "an AxiosError with an empty string payload",
      axiosErrorWith(400, ""),
      "Request failed",
      400,
    ],
    [
      "an AxiosError without response",
      new AxiosError("no response"),
      "no response",
      undefined,
    ],
    ["a plain Error", new Error("plain error"), "plain error", undefined],
    ["a string rejection", "just a string", "Failed to create flow", undefined],
    ["a null rejection", null, "Failed to create flow", undefined],
  ])("uses %s", async (_label, thrown, expectedMessage, expectedStatus) => {
    http.post.mockRejectedValueOnce(thrown);

    const err = (await new FlowsHttpRepo()
      .create(domainFlow)
      .catch((e: unknown) => e)) as FlowsApiError;

    expect(err.message).toBe(expectedMessage);
    expect(err.status).toBe(expectedStatus);
  });
});

describe("FlowsApiError", () => {
  it("keeps the status when it is a number", () => {
    const err = new FlowsApiError("boom", 418);
    expect(err.name).toBe("FlowsApiError");
    expect(err.status).toBe(418);
  });

  it("leaves status undefined when omitted", () => {
    expect(new FlowsApiError("boom").status).toBeUndefined();
  });
});

describe("flowsRepo singleton", () => {
  it("is an instance ready to use", async () => {
    http.get.mockResolvedValueOnce({ data: flowListDTO });

    await flowsRepo.list();

    expect(http.get).toHaveBeenCalledWith("/api/flows/summary");
  });
});
