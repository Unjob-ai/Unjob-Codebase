"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { id: "pay_4001", user: "Alice", amount: "$120.00", method: "Razorpay", status: "captured" },
  { id: "pay_4002", user: "Bob", amount: "$59.00", method: "Razorpay", status: "failed" },
  { id: "pay_4003", user: "Cara", amount: "$240.00", method: "Razorpay", status: "captured" },
];

export default function AdminPaymentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.user}</TableCell>
                <TableCell>{r.amount}</TableCell>
                <TableCell>{r.method}</TableCell>
                <TableCell className={r.status === "captured" ? "text-[hsl(var(--chart-2))]" : "text-[hsl(var(--destructive))]"}>{r.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


