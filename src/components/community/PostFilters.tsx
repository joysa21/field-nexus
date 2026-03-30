import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommunityFilter } from "@/types/impact";

interface PostFiltersProps {
  value: CommunityFilter;
  onChange: (next: CommunityFilter) => void;
}

export function PostFilters({ value, onChange }: PostFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Input
        placeholder="Search title or description"
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
      />

      <Select value={value.feedType} onValueChange={(feedType: CommunityFilter["feedType"]) => onChange({ ...value, feedType })}>
        <SelectTrigger>
          <SelectValue placeholder="Feed type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All posts</SelectItem>
          <SelectItem value="ngo_request">NGO requests</SelectItem>
          <SelectItem value="volunteer_offer">Volunteer offers</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Category"
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value })}
      />

      <Input
        placeholder="Location"
        value={value.location}
        onChange={(e) => onChange({ ...value, location: e.target.value })}
      />

      <Select value={value.urgency} onValueChange={(urgency) => onChange({ ...value, urgency })}>
        <SelectTrigger>
          <SelectValue placeholder="Urgency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All urgency</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
