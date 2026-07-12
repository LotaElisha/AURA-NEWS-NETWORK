export interface CategoryDef {
  id: string;
  label: string;
}

// Category ids match what the server API expects in /api/news.
export const CATEGORIES: CategoryDef[] = [
  { id: 'General', label: 'World' },
  { id: 'Politics', label: 'Politics' },
  { id: 'Business', label: 'Business' },
  { id: 'Technology', label: 'Technology' },
  { id: 'AI News', label: 'AI & Future' },
  { id: 'Science', label: 'Science' },
  { id: 'Health', label: 'Health' },
  { id: 'Sports', label: 'Sports' },
  { id: 'Entertainment', label: 'Entertainment' },
];

export const LANGUAGES = ['English', 'Swahili', 'French', 'Spanish', 'German', 'Japanese'];

export function categoryLabel(id?: string): string {
  const found = CATEGORIES.find(c => c.id === id);
  return found ? found.label : (id || 'World');
}
