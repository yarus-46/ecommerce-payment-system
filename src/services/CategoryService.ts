import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { Category } from '../domain/Category';
import prisma from '../repositories/prisma';

// Initialize in-memory fallback cache (1 hour TTL)
const localCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Connect to Redis if URL is provided and connection succeeds
let redis: Redis | null = null;
if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.warn('Redis client error, falling back to local memory cache:', err.message);
    });
  } catch (e) {
    console.warn('Failed to initialize Redis client, falling back to local memory cache:', e);
  }
}

export interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  children: CategoryNode[];
}

export class CategoryService {
  private static CACHE_KEY = 'categories:tree';

  /**
   * Fetch all categories and construct a tree.
   * Leverages caching (Redis or local Node-Cache).
   */
  public static async getCategoryTree(): Promise<CategoryNode[]> {
    // Try Redis
    if (redis) {
      try {
        const cached = await redis.get(this.CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.warn('Redis read failed:', err);
      }
    }

    // Try NodeCache
    const localCached = localCache.get<CategoryNode[]>(this.CACHE_KEY);
    if (localCached) {
      return localCached;
    }

    // Database Fetch
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });

    const tree = this.buildTree(categories);

    // Save to Cache
    localCache.set(this.CACHE_KEY, tree);
    if (redis) {
      try {
        await redis.set(this.CACHE_KEY, JSON.stringify(tree), 'EX', 3600);
      } catch (err) {
        console.warn('Redis write failed:', err);
      }
    }

    return tree;
  }

  /**
   * Clear category tree cache.
   * Call this whenever a category is created, updated, or deleted.
   */
  public static async invalidateCache(): Promise<void> {
    localCache.del(this.CACHE_KEY);
    if (redis) {
      try {
        await redis.del(this.CACHE_KEY);
      } catch (err) {
        console.warn('Redis delete failed:', err);
      }
    }
  }

  /**
   * DFS algorithm to find all subcategory IDs for a given category ID.
   */
  public static async getSubcategoryIds(categoryId: number): Promise<number[]> {
    const tree = await this.getCategoryTree();
    
    // Find the starting category node in the tree
    const rootNode = this.findNodeInTree(tree, categoryId);
    if (!rootNode) {
      return [categoryId]; // If category not found, return only itself
    }

    const resultIds: number[] = [];
    
    // Perform DFS traversal
    const dfs = (node: CategoryNode) => {
      resultIds.push(node.id);
      for (const child of node.children) {
        dfs(child);
      }
    };

    dfs(rootNode);
    return resultIds;
  }

  /**
   * Get related product recommendations by traversing the category tree.
   * Retreives products belonging to the target category or any of its subcategories.
   */
  public static async getRecommendedProducts(categoryId: number): Promise<any[]> {
    // DFS to get all subcategories
    const categoryIds = await this.getSubcategoryIds(categoryId);

    // Fetch active products in any of these categories
    return prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        status: 'active',
      },
      include: {
        category: true,
      },
      take: 10, // Limit to 10 recommendations
    });
  }

  /**
   * Helper to build hierarchical category tree structure.
   */
  private static buildTree(
    categories: Array<{ id: number; name: string; parentId: number | null }>
  ): CategoryNode[] {
    const map = new Map<number, CategoryNode>();
    const roots: CategoryNode[] = [];

    // Create a node for each category
    categories.forEach((cat) => {
      map.set(cat.id, {
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        children: [],
      });
    });

    // Populate children lists and identify root nodes
    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId === null) {
        roots.push(node);
      } else {
        const parentNode = map.get(cat.parentId);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // If parent is not in the db list, treat as root
          roots.push(node);
        }
      }
    });

    return roots;
  }

  /**
   * Helper to find a specific category node inside a tree hierarchy.
   */
  private static findNodeInTree(nodes: CategoryNode[], categoryId: number): CategoryNode | null {
    for (const node of nodes) {
      if (node.id === categoryId) {
        return node;
      }
      const found = this.findNodeInTree(node.children, categoryId);
      if (found) {
        return found;
      }
    }
    return null;
  }
}
