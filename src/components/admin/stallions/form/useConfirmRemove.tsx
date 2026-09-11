"use client";

import { useCallback, useState } from "react";
import ConfirmRemoveDialog from "./ConfirmRemoveDialog";

type ConfirmRemoveRequest = {
  title?: string;
  message?: string;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmRemove() {
  const [request, setRequest] = useState<ConfirmRemoveRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const requestRemove = useCallback((next: ConfirmRemoveRequest) => {
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    if (!loading) setRequest(null);
  }, [loading]);

  const handleConfirm = useCallback(async () => {
    if (!request) return;
    setLoading(true);
    try {
      await request.onConfirm();
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const dialog = (
    <ConfirmRemoveDialog
      open={request != null}
      onClose={close}
      onConfirm={handleConfirm}
      title={request?.title}
      message={request?.message}
      loading={loading}
    />
  );

  return { requestRemove, dialog };
}
