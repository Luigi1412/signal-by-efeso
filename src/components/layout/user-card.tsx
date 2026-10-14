import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CurrentUser } from "@/types";

export function UserCard({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2">
      <Avatar className="size-8 rounded-md">
        <AvatarFallback className="rounded-md bg-foreground text-[11px] font-semibold text-background">
          {user.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[13px] font-medium text-foreground">{user.name}</div>
        <div className="truncate text-[11.5px] text-muted-foreground">
          {user.role} · {user.organization}
        </div>
      </div>
    </div>
  );
}
