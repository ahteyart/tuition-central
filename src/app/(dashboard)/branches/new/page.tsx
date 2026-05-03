import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createBranch } from "../actions";

export default async function NewBranchPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/branches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-700" />
            Add Branch
          </h1>
          <p className="text-sm text-gray-500">Create a new tuition centre branch</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBranch} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Branch Name *</Label>
              <Input id="name" name="name" placeholder="e.g. Tuition Central PJ" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address *</Label>
              <textarea
                id="address"
                name="address"
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Full address including postcode and state"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="+603-XXXX XXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="pj@tuitioncentral.my" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Link href="/branches" className="flex-1">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1">
                Create Branch
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
