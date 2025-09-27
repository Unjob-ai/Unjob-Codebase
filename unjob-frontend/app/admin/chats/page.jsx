"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { id: "c_5001", participants: "Alice ↔ Bob", messages: 42, lastMessageAt: "2025-08-12 10:20" },
  { id: "c_5002", participants: "Cara ↔ Dan", messages: 8, lastMessageAt: "2025-08-12 11:05" },
  { id: "c_5003", participants: "Eve ↔ Frank", messages: 13, lastMessageAt: "2025-08-12 12:44" },
];

export default function AdminChatsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chats</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Last Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.participants}</TableCell>
                <TableCell>{r.messages}</TableCell>
                <TableCell>{r.lastMessageAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


