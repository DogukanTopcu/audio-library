import { BadRequestException } from '@nestjs/common';
import { categories } from '../../../../packages/db/src/schema/index.js';
import {
  buildCategoryMaps,
  collectCategorySubtreeIds,
  resolveRootCategory,
  validateSingleCategoryPerRoot,
} from './category-utils.js';

type CategoryRecord = typeof categories.$inferSelect;

function createCategory(partial: Partial<CategoryRecord> & Pick<CategoryRecord, 'id' | 'name' | 'slug'>): CategoryRecord {
  return {
    id: partial.id,
    name: partial.name,
    slug: partial.slug,
    parentId: partial.parentId ?? null,
    description: partial.description ?? null,
    orderIndex: partial.orderIndex ?? 0,
    createdAt: partial.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('category utils', () => {
  const dersler = createCategory({ id: 'root-lessons', name: 'Dersler', slug: 'lessons' });
  const siniflar = createCategory({ id: 'root-classes', name: 'Sınıflar', slug: 'class' });
  const matematik = createCategory({ id: 'lesson-math', name: 'Matematik', slug: 'lessons-matematik', parentId: dersler.id });
  const ingilizce = createCategory({ id: 'lesson-english', name: 'İngilizce', slug: 'lessons-ingilizce', parentId: dersler.id });
  const tarih = createCategory({ id: 'lesson-history', name: 'Tarih', slug: 'lessons-tarih', parentId: dersler.id });
  const inkilap = createCategory({ id: 'lesson-history-inkilap', name: 'İnkılap', slug: 'lessons-tarih-inkilap', parentId: tarih.id });
  const dokuz = createCategory({ id: 'class-9', name: '9', slug: 'class-9', parentId: siniflar.id });

  const allCategories = [dersler, siniflar, matematik, ingilizce, tarih, inkilap, dokuz];
  const { categoryMap, childrenByParent } = buildCategoryMaps(allCategories);

  it('resolves root category recursively', () => {
    expect(resolveRootCategory(inkilap.id, categoryMap).id).toBe(dersler.id);
    expect(resolveRootCategory(dokuz.id, categoryMap).id).toBe(siniflar.id);
  });

  it('collects subtree ids including descendants', () => {
    expect(new Set(collectCategorySubtreeIds(tarih.id, childrenByParent))).toEqual(
      new Set([tarih.id, inkilap.id]),
    );
  });

  it('allows one selection per root category', () => {
    expect(validateSingleCategoryPerRoot([dokuz.id, matematik.id], categoryMap)).toEqual([
      dokuz.id,
      matematik.id,
    ]);
  });

  it('rejects multiple selections under the same root', () => {
    expect(() => validateSingleCategoryPerRoot([dokuz.id, matematik.id, ingilizce.id], categoryMap)).toThrow(
      BadRequestException,
    );
  });
});

