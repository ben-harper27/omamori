"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ApprovalsCard } from "./approvals-card";
import { PaymentLog } from "./payment-log";

export function FamilyView() {
  const { data, error } = useQuery({ queryKey: ["activity"], queryFn: api.pollActivity, refetchInterval: 5_000 });
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  return (
    <>
      <ApprovalsCard approvals={data?.approvals ?? []} payments={data?.payments ?? []} />
      <PaymentLog payments={data?.payments ?? []} />
    </>
  );
}
