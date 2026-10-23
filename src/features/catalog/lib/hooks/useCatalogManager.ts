"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CatalogFile,
  CatalogMutation,
  CatalogOperation,
  CatalogVersion,
} from "@entities/catalog/model/catalog";
import { normalizeCatalogError } from "../../api/catalog-error";
import { catalogRepo } from "../../api/catalog.repo.impl";
import { validateCatalogFile, readCatalogFile, catalogFileSha256 } from "../usecases/validate-catalog";

type Validation = Awaited<ReturnType<typeof validateCatalogFile>>;
type Confirmation =
  | { kind: "upload"; validation: Validation }
  | { kind: "activate"; version: CatalogVersion; revision: string };
type Pending = {
  id: string;
  kind: CatalogOperation["kind"];
  mutation?: CatalogMutation;
  expected_revision?: string;
  file_name?: string;
  sha256?: string;
  version?: string;
};
const STORAGE_KEY = "kma.catalog.pending-operation";

function remember(pending: Pending | null) {
  try {
    if (pending) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* La operación sigue disponible en esta pantalla sin storage. */
  }
}

function definitiveFailure(cause: unknown) {
  const error = normalizeCatalogError(cause);
  const status = (error.details as { status?: number } | undefined)?.status;
  return (
    [
      "BAD_REQUEST",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "UNPROCESSABLE_ENTITY",
    ].includes(error.code) ||
    (status !== undefined &&
      status >= 400 &&
      status < 500 &&
      status !== 408 &&
      status !== 429)
  );
}

export function useCatalogManager() {
  const client = useQueryClient();
  const operations = useInfiniteQuery({
    queryKey: ["catalog", "operations"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => catalogRepo.operations(pageParam),
    getNextPageParam: page => page.next_cursor ?? undefined,
    retry: false,
    refetchInterval: query => query.state.data?.pages.some(page => page.items.some(operation => ["queued", "running"].includes(operation.status))) ? 2000 : false,
  });
  const status = useQuery({
    queryKey: ["catalog", "status"],
    queryFn: () => catalogRepo.status(),
    retry: false,
  });
  const history = useInfiniteQuery({
    queryKey: ["catalog", "versions"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => catalogRepo.versions(pageParam),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    retry: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [validating, setValidating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [recoveryAllowed, setRecoveryAllowed] = useState(false);
  const [retryFile, setRetryFile] = useState<CatalogFile | null>(null);
  const [preparingRetry, setPreparingRetry] = useState(false);
  const [retryConfirmation, setRetryConfirmation] = useState(false);
  const [result, setResult] = useState<CatalogOperation | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const recovered = useRef(new Set<string>());
  const generation = useRef(0);
  const writeLock = useRef(false);
  const retryGeneration = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    try {
      const stored = JSON.parse(
        sessionStorage.getItem(STORAGE_KEY) ?? "null",
      ) as Partial<Pending> | null;
      if (
        stored &&
        typeof stored.id === "string" &&
        ["upload", "activate", "create", "update", "delete"].includes(stored.kind ?? "")
      ) {
        setPending(stored as Pending);
        setActionError(
          "A previous operation has an unknown outcome. Check its status before making another change.",
        );
      }
    } catch {
      /* Un valor de storage dañado no habilita una escritura previa. */
    }
    return () => {
      alive.current = false;
      generation.current += 1;
      retryGeneration.current += 1;
    };
  }, []);

  const refetchStatus = status.refetch;
  const refetchHistory = history.refetch;
  const refresh = useCallback(async () => {
    await Promise.allSettled([refetchStatus(), refetchHistory(), client.invalidateQueries({ queryKey: ["catalog", "items"] }), client.invalidateQueries({ queryKey: ["catalog", "operations"] })]);
  }, [refetchStatus, refetchHistory, client]);

  const selectFile = (next: File | null) => {
    generation.current += 1;
    setFile(next);
    setValidation(null);
    setConfirmation(null);
    setActionError(null);
    if (!pending) setResult(null);
  };
  const validate = async () => {
    if (!file || validating || busy || pending || !status.data?.enabled) return;
    const current = generation.current;
    setValidating(true);
    setValidation(null);
    setActionError(null);
    setResult(null);
    try {
      const next = await validateCatalogFile(
        catalogRepo,
        file,
        status.data.limits.max_file_size,
      );
      if (alive.current && current === generation.current) setValidation(next);
    } catch (cause) {
      if (alive.current && current === generation.current)
        setActionError(normalizeCatalogError(cause).message);
    } finally {
      if (alive.current) setValidating(false);
    }
  };
  const acceptResult = async (operation: CatalogOperation) => {
    if (!alive.current) return;
    recovered.current.add(operation.operation_id);
    setResult(operation);
    setRecoveryAllowed(false);
    if (["queued", "running"].includes(operation.status)) return;
    retryGeneration.current += 1;
    setRetryFile(null);
    setRetryConfirmation(false);
    remember(null);
    setPending(null);
    setValidation(null);
    setConfirmation(null);
    if (operation.status === "completed") setActionError(null);
    else setActionError(operation.error || operation.message);
    await refresh();
  };
  const submit = async (operation: Pending, input: CatalogFile | null, retry: boolean) => {
    if (!operation.expected_revision || (operation.kind === "upload" ? !input : operation.kind === "activate" ? !operation.version : !operation.mutation)) return;
    writeLock.current = true;
    setBusy(true);
    setActionError(null);
    setResult(null);
    recovered.current.add(operation.id);
    setPending(operation);
    remember(operation);
    try {
      const identity = { operation_id: operation.id, expected_revision: operation.expected_revision };
      const response = operation.kind === "upload"
        ? await catalogRepo.imports({ ...input!, ...identity })
        : operation.kind === "activate"
          ? await catalogRepo.activate({ version: operation.version!, ...identity })
          : await catalogRepo.mutate({ ...operation.mutation!, operation_id: operation.id });
      await acceptResult(response);
    } catch (cause) {
      if (!alive.current) return;
      const message = normalizeCatalogError(cause).message;
      if (!retry && definitiveFailure(cause)) {
        remember(null);
        setPending(null);
        setActionError(message);
        await refresh();
      } else {
        setActionError(`${message} The operation outcome is unknown. Check its status before making another change.`);
      }
    } finally {
      writeLock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const confirm = async () => {
    if (!confirmation || writeLock.current || pending || !status.data?.enabled) return;
    const target = confirmation;
    const operation: Pending = {
      id: crypto.randomUUID(),
      kind: target.kind,
      expected_revision: target.kind === "upload" ? target.validation.preview.expected_revision : target.revision,
      ...(target.kind === "upload"
        ? { file_name: target.validation.file.file_name, sha256: target.validation.preview.sha256 }
        : { version: target.version.version }),
    };
    setConfirmation(null);
    setValidation(null);
    setRecoveryAllowed(false);
    setRetryFile(null);
    await submit(operation, target.kind === "upload" ? target.validation.file : null, false);
  };
  const prepareRetryFile = async (selected: File | null) => {
    if (!pending || pending.kind !== "upload" || writeLock.current) return;
    const current = ++retryGeneration.current;
    setRetryFile(null);
    setRetryConfirmation(false);
    setActionError(null);
    if (!selected) return;
    setPreparingRetry(true);
    try {
      if (selected.name !== pending.file_name) throw new Error(`Select the original file “${pending.file_name}”.`);
      const input = await readCatalogFile(selected, 3145728);
      if (await catalogFileSha256(input) !== pending.sha256) throw new Error("The selected file does not match the original SHA-256. Select the original workbook.");
      if (alive.current && current === retryGeneration.current) setRetryFile(input);
    } catch (cause) {
      if (alive.current && current === retryGeneration.current) setActionError(normalizeCatalogError(cause).message);
    } finally {
      if (alive.current && current === retryGeneration.current) setPreparingRetry(false);
    }
  };
  const reconcile = async () => {
    if (!pending || writeLock.current || preparingRetry) return;
    writeLock.current = true;
    setBusy(true);
    setActionError(null);
    try {
      await acceptResult(await catalogRepo.operation(pending.id));
    } catch (cause) {
      if (!alive.current) return;
      const error = normalizeCatalogError(cause);
      const notFound = error.code === "NOT_FOUND" || (error.details as { status?: number } | undefined)?.status === 404;
      setRecoveryAllowed(notFound);
      setActionError(`${error.message} The operation outcome is unknown; no replacement has been retried.`);
    } finally {
      writeLock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const reconcileRef = useRef(reconcile);
  useEffect(() => { reconcileRef.current = reconcile; });
  const pendingId = pending?.id;
  useEffect(() => {
    if (!pendingId) return;
    const timer = window.setInterval(() => void reconcileRef.current(), 2000);
    return () => window.clearInterval(timer);
  }, [pendingId]);
  useEffect(() => {
    if (pending || busy) return;
    const operation = operations.data?.pages.flatMap(page => page.items).find(item =>
      ["queued", "running"].includes(item.status) && !recovered.current.has(item.operation_id));
    if (operation) {
      recovered.current.add(operation.operation_id);
      setPending({ id: operation.operation_id, kind: operation.kind });
      setResult(operation);
    }
  }, [operations.data, pending, busy]);
  const recoveryAvailable = Boolean(pending?.expected_revision && (pending.kind === "upload"
    ? pending.file_name && typeof pending.sha256 === "string" && /^[a-f0-9]{64}$/.test(pending.sha256)
    : pending.kind === "activate" ? pending.version : pending.mutation));
  const canRetry = recoveryAllowed && recoveryAvailable && Boolean(status.data?.enabled) && !busy && !preparingRetry && (pending?.kind !== "upload" || Boolean(retryFile));
  const confirmRetry = async () => {
    if (!retryConfirmation || !pending || !canRetry || writeLock.current) return;
    setRetryConfirmation(false);
    await submit(pending, retryFile, true);
  };
  return {
    mutate: async (mutation: CatalogMutation) => {
      if (writeLock.current || pending || !status.data?.enabled) return;
      const operation: Pending = { id: crypto.randomUUID(), kind: mutation.kind, expected_revision: mutation.expected_revision, mutation };
      await submit(operation, null, false);
      return operation.id;
    },
    status: status.data,
    loading: status.isPending || history.isPending,
    error:
      actionError ??
      (status.error
        ? normalizeCatalogError(status.error).message
        : history.error
          ? normalizeCatalogError(history.error).message
          : null),
    recentOperations: operations.data?.pages.flatMap(page => page.items) ?? [],
    operationsError: operations.error ? normalizeCatalogError(operations.error).message : null,
    moreOperations: operations.hasNextPage,
    loadingOperations: operations.isFetchingNextPage,
    loadMoreOperations: () => void operations.fetchNextPage(),
    history: history.data?.pages.flatMap((page) => page.items) ?? [],
    hasMore: history.hasNextPage,
    loadingMore: history.isFetchingNextPage,
    loadMore: () => {
      void history.fetchNextPage();
    },
    refresh,
    file,
    selectFile,
    validation,
    validate,
    validating,
    busy,
    pending,
    result,
    confirmation,
    recoveryAllowed,
    recoveryAvailable,
    preparingRetry,
    retryFile,
    prepareRetryFile,
    retryConfirmation,
    canRetry,
    requestRetry: () => { if (canRetry) setRetryConfirmation(true); },
    cancelRetry: () => { if (!busy) setRetryConfirmation(false); },
    confirmRetry,
    canChange:
      Boolean(status.data?.enabled) && !busy && !pending && !validating,
    requestReplace: () => {
      if (validation) setConfirmation({ kind: "upload", validation });
    },
    requestRestore: (version: CatalogVersion) => {
      if (status.data && !version.active)
        setConfirmation({
          kind: "activate",
          version,
          revision: status.data.revision,
        });
    },
    cancelConfirmation: () => {
      if (!busy) setConfirmation(null);
    },
    confirm,
    reconcile,
  };
}
