"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { id: "g_2001", title: "Logo Design", client: "Acme Inc", applications: 12, budget: "$300" },
  { id: "g_2002", title: "Landing Page", client: "Beta Co", applications: 7, budget: "$800" },
  { id: "g_2003", title: "Mobile App UI", client: "Gamma Ltd", applications: 20, budget: "$1500" },
];

export default function AdminGigsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gigs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Budget</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.client}</TableCell>
                <TableCell>{r.applications}</TableCell>
                <TableCell>{r.budget}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


