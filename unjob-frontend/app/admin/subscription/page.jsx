"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { id: "s_3001", user: "Alice", plan: "Pro", status: "active", renews: "2025-12-01" },
  { id: "s_3002", user: "Bob", plan: "Starter", status: "canceled", renews: "-" },
  { id: "s_3003", user: "Cara", plan: "Pro", status: "active", renews: "2026-02-10" },
];

export default function AdminSubscriptionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renews</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.user}</TableCell>
                <TableCell>{r.plan}</TableCell>
                <TableCell className={r.status === "active" ? "text-[hsl(var(--chart-2))]" : "text-[hsl(var(--destructive))]"}>{r.status}</TableCell>
                <TableCell>{r.renews}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


