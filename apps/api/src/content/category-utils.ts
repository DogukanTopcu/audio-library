import { BadRequestException } from '@nestjs/common';
import { categories } from '../../../../packages/db/src/schema/index.js';

type CategoryRecord = typeof categories.$inferSelect;

type CategoryMaps = {
  categoryMap: Map<string, CategoryRecord>;
  childrenByParent: Map<string | null, CategoryRecord[]>;
};

function createMissingCategoryError(categoryId: string) {
  return new BadRequestException(`Geçersiz kategori seçimi: ${categoryId}`);
}

export function buildCategoryMaps(items: CategoryRecord[]): CategoryMaps {
  const categoryMap = new Map<string, CategoryRecord>();
  const childrenByParent = new Map<string | null, CategoryRecord[]>();

  for (const item of items) {
    categoryMap.set(item.id, item);

    const siblings = childrenByParent.get(item.parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(item.parentId, siblings);
  }

  return { categoryMap, childrenByParent };
}

export function collectCategorySubtreeIds(
  categoryId: string,
  childrenByParent: Map<string | null, CategoryRecord[]>,
): string[] {
  const result = new Set<string>();
  const stack = [categoryId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || result.has(currentId)) {
      continue;
    }

    result.add(currentId);
    const children = childrenByParent.get(currentId) ?? [];
    for (const child of children) {
      stack.push(child.id);
    }
  }

  return Array.from(result);
}

export function resolveRootCategory(
  categoryId: string,
  categoryMap: Map<string, CategoryRecord>,
  cache = new Map<string, CategoryRecord>(),
  visiting = new Set<string>(),
): CategoryRecord {
  const cached = cache.get(categoryId);
  if (cached) {
    return cached;
  }

  const current = categoryMap.get(categoryId);
  if (!current) {
    throw createMissingCategoryError(categoryId);
  }

  if (visiting.has(categoryId)) {
    throw new BadRequestException('Kategori hiyerarşisinde döngü tespit edildi.');
  }

  if (!current.parentId) {
    cache.set(categoryId, current);
    return current;
  }

  visiting.add(categoryId);
  const root = resolveRootCategory(current.parentId, categoryMap, cache, visiting);
  visiting.delete(categoryId);

  cache.set(categoryId, root);
  return root;
}

export function validateSingleCategoryPerRoot(
  categoryIds: string[],
  categoryMap: Map<string, CategoryRecord>,
) {
  const uniqueCategoryIds = Array.from(new Set(categoryIds.map((id) => id.trim()).filter(Boolean)));
  const rootCache = new Map<string, CategoryRecord>();
  const groupedByRoot = new Map<string, CategoryRecord[]>();

  for (const categoryId of uniqueCategoryIds) {
    const category = categoryMap.get(categoryId);
    if (!category) {
      throw createMissingCategoryError(categoryId);
    }

    const root = resolveRootCategory(categoryId, categoryMap, rootCache);
    const rootSelections = groupedByRoot.get(root.id) ?? [];
    rootSelections.push(category);
    groupedByRoot.set(root.id, rootSelections);
  }

  const conflicts = Array.from(groupedByRoot.values()).filter((items) => items.length > 1);
  if (conflicts.length > 0) {
    const message = conflicts
      .map((items) => {
        const root = resolveRootCategory(items[0].id, categoryMap, rootCache);
        return `${root.name}: ${items.map((item) => item.name).join(', ')}`;
      })
      .join(' | ');

    throw new BadRequestException(
      `Her ana kategori altında en fazla 1 kategori seçebilirsiniz. Çakışan seçimler: ${message}`,
    );
  }

  return uniqueCategoryIds;
}

