import { Check, Search, UserX } from "lucide-react";
import { cn } from "../../lib/cn";
import { Avatar } from "../../components/ui/Avatar";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useUserSearch } from "./useUserSearch";

export function UserRow({ user, selected, disabled, onSelect, trailing }) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect?.(user)}
        aria-pressed={selected === undefined ? undefined : selected}
        className={cn(
          "press flex min-h-[60px] w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left",
          "hover:bg-ink/5 disabled:opacity-50",
          selected && "bg-accent-soft"
        )}
      >
        <Avatar name={user.name} src={user.pic} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-subhead font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-footnote text-ink-2">{user.email}</span>
        </span>
        {selected ? <Check size={18} className="text-accent-ink" aria-label="Selected" /> : trailing}
      </button>
    </li>
  );
}

/**
 * Search box + results list. Used for new chats, new groups and adding members.
 * `excludeIds` hides people already in the conversation.
 */
export function UserSearch({ query, onQueryChange, onSelect, selectedIds = [], excludeIds = [], autoFocus, placeholder }) {
  const { results, loading, error, tooShort } = useUserSearch(query);
  const visible = results.filter((u) => !excludeIds.includes(u._id));

  return (
    <div>
      <Input
        icon={Search}
        type="search"
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        aria-label="Search people"
        placeholder={placeholder || "Search by name or email"}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <div className="mt-2 min-h-[120px]" aria-live="polite">
        {loading ? (
          <div className="space-y-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="px-3 py-6 text-center text-subhead text-danger">Couldn’t search right now. Try again.</p>
        ) : tooShort ? (
          <p className="px-3 py-6 text-center text-subhead text-ink-3">Type at least 2 letters to search.</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-ink-3">
            <UserX size={22} aria-hidden />
            <p className="text-subhead">No one found for “{query.trim()}”.</p>
          </div>
        ) : (
          <ul>
            {visible.map((u) => (
              <UserRow key={u._id} user={u} selected={selectedIds.length ? selectedIds.includes(u._id) : undefined} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
