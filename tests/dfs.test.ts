import { CategoryService } from '../src/services/CategoryService';
import prisma from '../src/repositories/prisma';

// Mock Prisma client
jest.mock('../src/repositories/prisma', () => ({
  category: {
    findMany: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
}));

describe('Category Tree DFS and Caching Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CategoryService.invalidateCache();
  });

  it('should build hierarchical category tree correctly', async () => {
    const mockCategories = [
      { id: 1, name: 'Electronics', parentId: null },
      { id: 2, name: 'Smartphones', parentId: 1 },
      { id: 3, name: 'Laptops', parentId: 1 },
      { id: 4, name: 'iPhone Accessories', parentId: 2 },
      { id: 5, name: 'Fashion', parentId: null },
    ];

    (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

    const tree = await CategoryService.getCategoryTree();

    expect(tree.length).toBe(2); // Roots are Electronics and Fashion
    expect(tree[0].name).toBe('Electronics');
    expect(tree[0].children.length).toBe(2);
    expect(tree[0].children[0].name).toBe('Smartphones');
    expect(tree[0].children[0].children.length).toBe(1);
    expect(tree[0].children[0].children[0].name).toBe('iPhone Accessories');
    expect(tree[1].name).toBe('Fashion');
  });

  it('should use DFS to resolve all subcategory IDs recursively', async () => {
    const mockCategories = [
      { id: 1, name: 'Electronics', parentId: null },
      { id: 2, name: 'Smartphones', parentId: 1 },
      { id: 3, name: 'Laptops', parentId: 1 },
      { id: 4, name: 'iPhone Accessories', parentId: 2 },
      { id: 5, name: 'Fashion', parentId: null },
    ];

    (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

    // DFS for category 1 (Electronics) should resolve 1, 2, 3, 4
    const elecIds = await CategoryService.getSubcategoryIds(1);
    expect(elecIds).toEqual([1, 2, 4, 3]); // DFS Order (Root -> child1 -> grandchild -> child2)

    // DFS for category 2 (Smartphones) should resolve 2, 4
    const phoneIds = await CategoryService.getSubcategoryIds(2);
    expect(phoneIds).toEqual([2, 4]);

    // DFS for category 5 (Fashion) should resolve 5
    const fashionIds = await CategoryService.getSubcategoryIds(5);
    expect(fashionIds).toEqual([5]);
  });
});
