export const DEFAULT_FILTERS = {
  status: [],
  service: [],
  desired_date_from: '',
  desired_date_to: '',
  search: '',
  ordering: '-created_at',
  page: 1,
};

export function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  });
  return params.toString();
}

export function getFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    status: params.getAll('status'),
    service: params.getAll('service'),
    desired_date_from: params.get('desired_date_from') || '',
    desired_date_to: params.get('desired_date_to') || '',
    search: params.get('search') || '',
    ordering: params.get('ordering') || '-created_at',
    page: parseInt(params.get('page'), 10) || 1,
  };
}
