"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <Input
          placeholder="Search users, gigs, posts, payments, support..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="md:w-[420px]"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="users">Users</SelectItem>
            <SelectItem value="gigs">Gigs</SelectItem>
            <SelectItem value="posts">Posts</SelectItem>
            <SelectItem value="payments">Payments</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
        <Button>Search</Button>
      </div>
      <Separator />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Result {i} (skeleton)
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


