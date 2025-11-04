export function getPageNumbers(totalPages: number, currentPage: number, maxVisiblePages = 5): number[] {
  const pages: number[] = [];
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  return pages;
}

export const pagingNext = (currentPage: number, totalPages: number) => Math.min(currentPage + 1, totalPages);
export const pagingPrev = (currentPage: number) => Math.max(currentPage - 1, 1);
export const pagingFirst = () => 1;
export const pagingLast = (totalPages: number) => Math.max(1, totalPages);
export const pagingGoTo = (page: number, totalPages: number) => Math.max(1, Math.min(page, totalPages));


