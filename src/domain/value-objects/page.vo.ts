export interface Page<T> {
  members: T[];
  total?: number;
  page?: number;
  size?: number;
  pages?: number;
}

export interface LdJsonPage<T> {
  member: T[];
  totalItems?: number;
  view?: {
    '@id': string;
    type?: string;
    first?: string;
    last?: string;
    previous?: string;
    next?: string;
  };
}
