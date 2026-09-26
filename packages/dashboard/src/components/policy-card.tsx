"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { EXPLORERS, formatUsdc, shortHex } from "@/lib/format";

function Row({ label, recordKey, value }: { label: string; recordKey: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div>
        <div className="text-sm">{label}</div>
        <div className="font-mono text-xs text-muted-foreground">{recordKey}</div>
      </div>
      <div className="text-right text-sm font-medium">{value}</div>
    </div>
  );
}

export function PolicyCard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["policy"], queryFn: api.policy, refetchInterval: 15_000 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family policy</CardTitle>
        <CardDescription>Read live from ENSv2 on Sepolia before every payment. Only the family can edit it.</CardDescription>
        {data && (
          <CardAction>
            {data.active ? (
              <Badge className="bg-success text-primary-foreground">
                <ShieldCheck /> Active
              </Badge>
            ) : (
              <Badge variant="destructive">
                <ShieldOff /> Revoked
              </Badge>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && (
          <div className="flex flex-col divide-y divide-border">
            <Row label="Agent" recordKey="ENS name" value={<span className="font-mono">{data.agentName}</span>} />
            <Row
              label="Agent wallet"
              recordKey="addr"
              value={
                data.agentAddress ? (
                  <a className="inline-flex items-center gap-1 font-mono hover:underline" href={EXPLORERS.sepoliaAddress(data.agentAddress)} target="_blank" rel="noreferrer">
                    {shortHex(data.agentAddress)} <ExternalLink className="size-3" />
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Hard limit per payment" recordKey="omamori.maxPerPayment" value={formatUsdc(data.policy?.maxPerPayment)} />
            <Row label="Ask family above" recordKey="omamori.approvalThreshold" value={formatUsdc(data.policy?.approvalThreshold)} />
            <Row label="Monthly budget" recordKey="omamori.monthlyCap" value={formatUsdc(data.policy?.monthlyCap)} />
            <Row
              label="Trusted sellers"
              recordKey="omamori.allowlist"
              value={
                <div className="flex flex-col items-end gap-1">
                  {(data.policy?.allowlist ?? []).map((name) => (
                    <span key={name} className="font-mono text-xs">
                      {name}
                    </span>
                  ))}
                  {!data.policy?.allowlist && "Any"}
                </div>
              }
            />
            <Row label="Family approver" recordKey="omamori.approver" value={<span className="font-mono text-xs">{shortHex(data.policy?.approver)}</span>} />
            <Row label="Description (agent-editable)" recordKey="description" value={<span className="text-xs">{data.description ?? "—"}</span>} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
