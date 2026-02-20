export interface CheckResult {
  username: string;
  profileImageUrl?: string;
  displayName?: string;
  followersCount?: number;
  followingCount?: number;
  exists: boolean;
  tests: {
    searchSuggestion: boolean; // true = passed (no ban), false = failed (banned)
    searchBan: boolean;
    ghostBan: boolean; // reply deboosting
  };
  timestamp: string;
}

export type TestType = 'searchSuggestion' | 'searchBan' | 'ghostBan';

export const TEST_DESCRIPTIONS: Record<TestType, { title: string; description: string }> = {
  searchSuggestion: {
    title: "Search Suggestion Ban",
    description: "Whether your account appears in the search dropdown auto-complete."
  },
  searchBan: {
    title: "Search Ban",
    description: "Whether your tweets appear in search results when searching specifically for them."
  },
  ghostBan: {
    title: "Ghost Ban",
    description: "Whether your replies are hidden behind a 'Show more' button or invisible."
  }
};
