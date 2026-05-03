import { Construction } from "lucide-react";

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
      <Construction className="h-10 w-10" />
      <p className="text-lg font-medium capitalize">Coming in Phase 2+</p>
      <p className="text-sm">This module will be built in the next phase.</p>
    </div>
  );
}
